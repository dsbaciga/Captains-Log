#!/bin/sh
set -e

echo "========================================="
echo "Database Migration & Startup Script"
echo "========================================="

# Wait for database to be ready using pg_isready
echo "Waiting for database to be ready..."

# Attempt to extract host and port for a more reliable check
# Handle both standard hostnames and URIs
DB_HOST="db"
DB_PORT="5432"

if [ -n "$DATABASE_URL" ]; then
  # Very basic extraction of host and port from postgresql://user:pass@host:port/db
  EXTRACTED_HOST=$(echo "$DATABASE_URL" | sed -e 's|.*@||' -e 's|/.*||' -e 's|:.*||')
  EXTRACTED_PORT=$(echo "$DATABASE_URL" | sed -e 's|.*@||' -e 's|/.*||' | grep ":" | cut -d: -f2)
  
  if [ -n "$EXTRACTED_HOST" ]; then DB_HOST="$EXTRACTED_HOST"; fi
  if [ -n "$EXTRACTED_PORT" ]; then DB_PORT="$EXTRACTED_PORT"; fi
fi

echo "Checking connectivity to $DB_HOST on port $DB_PORT..."

# Show more debug info if it fails
ATTEMPT=0
until pg_isready -h "$DB_HOST" -p "$DB_PORT"; do
  ATTEMPT=$((ATTEMPT + 1))
  echo "Database at $DB_HOST:$DB_PORT is unavailable (attempt $ATTEMPT) - sleeping"
  
  # On TrueNAS, sometimes the service name 'db' takes a moment to propagate in DNS
  if [ $ATTEMPT -eq 5 ]; then
    echo "Resolution check for '$DB_HOST':"
    getent hosts "$DB_HOST" || echo "  ! Could not resolve '$DB_HOST'"
    echo "Resolution check for 'captains-log-db':"
    getent hosts captains-log-db || echo "  ! Could not resolve 'captains-log-db'"
  fi
  
  sleep 2
done

echo "Database is ready!"

# Ensure Prisma Client is generated (safety check for TrueNAS compatibility)
echo "Verifying Prisma Client..."
if [ ! -d "/app/node_modules/.prisma/client" ]; then
  echo "Prisma Client not found. Generating..."
  npx prisma generate
else
  echo "Prisma Client exists."
fi

# Check if PostGIS extension is installed using psql
echo "Checking for PostGIS extension..."
if [ -n "$DATABASE_URL" ]; then
  psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS postgis;" > /dev/null 2>&1 || true
else
  PGPASSWORD=captains_log_password psql -h "$DB_HOST" -p "$DB_PORT" -U captains_log_user -d captains_log -c "CREATE EXTENSION IF NOT EXISTS postgis;" > /dev/null 2>&1 || true
fi

# Run Prisma migrations
echo "Running prisma migrate deploy..."
cd /app
if npx prisma migrate deploy; then
  echo "✓ Migrations applied successfully."
else
  echo "✗ Migration deployment failed. Attempting fallback..."

  # Try db push as a fallback to ensure schema matches
  echo "Attempting prisma db push as a fallback to ensure schema matches..."
  if npx prisma db push --accept-data-loss; then
    echo "✓ Schema synchronized via db push."

    # Try to resolve migrations so they don't block future deploys
    if [ -n "$DATABASE_URL" ]; then
      echo "Marking migrations as applied..."
      for migration_dir in prisma/migrations/*/; do
        if [ -d "$migration_dir" ]; then
          migration_name=$(basename "$migration_dir")
          echo "  Resolving migration: $migration_name"
          npx prisma migrate resolve --applied "$migration_name" || echo "  Could not resolve $migration_name (may already be applied)"
        fi
      done
    else
      echo "⚠ DATABASE_URL not set, skipping migration resolve."
    fi
  else
    echo "✗ Fallback failed. Application may have issues."
  fi
fi

echo "========================================="
echo "Setting up directories..."
echo "========================================="

# Ensure uploads directories exist with proper permissions
# In production, these should already exist from Dockerfile.prod
# This handles development and edge cases where they may not exist

# Only attempt chown if running as root (uid 0)
# Non-root users (like 'node' in production) cannot change ownership
if [ "$(id -u)" = "0" ]; then
  # Running as root - can create dirs and fix permissions
  mkdir -p /app/uploads/temp /app/uploads/photos
  chown -R node:node /app/uploads 2>/dev/null || true
  chmod -R 755 /app/uploads
else
  # Running as non-root - directories should already exist from Dockerfile
  # Try to create them but don't fail if we can't (they should already exist)
  mkdir -p /app/uploads/temp /app/uploads/photos 2>/dev/null || {
    # mkdir failed - check if directories already exist
    if [ ! -d /app/uploads/temp ] || [ ! -d /app/uploads/photos ]; then
      echo "⚠ Warning: Could not create upload directories."
      echo "  Current user: $(id)"
      echo "  If this is production, ensure the Docker image was built with the directories."
    fi
  }
fi

# Verify the upload directory is writable
if ! touch /app/uploads/temp/.write-test 2>/dev/null; then
  echo "✗ ERROR: Upload directory /app/uploads/temp is not writable"
  echo "  Current user: $(id)"
  echo "  Directory permissions:"
  ls -la /app/uploads/ 2>/dev/null || echo "  Cannot list /app/uploads/"
  echo ""
  echo "  To fix this in production, rebuild the Docker image or run:"
  echo "    docker exec -u root <container> chown -R node:node /app/uploads"
  exit 1
fi
rm -f /app/uploads/temp/.write-test
echo "✓ Upload directories ready."

echo "========================================="
echo "Starting Application..."
echo "========================================="

# Start the application
exec "$@"

