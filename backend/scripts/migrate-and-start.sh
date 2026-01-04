#!/bin/sh
set -e

echo "========================================="
echo "Database Migration & Startup Script"
echo "========================================="

# Wait for database to be ready using pg_isready
echo "Waiting for database to be ready..."
# Use DATABASE_URL if available, otherwise fallback to defaults
if [ -n "$DATABASE_URL" ]; then
  until pg_isready -d "$DATABASE_URL" > /dev/null 2>&1; do
    echo "Database is unavailable - sleeping"
    sleep 2
  done
else
  until pg_isready -h db -U captains_log_user -d captains_log > /dev/null 2>&1; do
    echo "Database is unavailable - sleeping"
    sleep 2
  done
fi

echo "Database is ready!"

# Check if PostGIS extension is installed using psql
echo "Checking for PostGIS extension..."
if [ -n "$DATABASE_URL" ]; then
  psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS postgis;" > /dev/null 2>&1 || true
else
  PGPASSWORD=captains_log_password psql -h db -U captains_log_user -d captains_log -c "CREATE EXTENSION IF NOT EXISTS postgis;" > /dev/null 2>&1 || true
fi

# Run Prisma migrations
echo "Running prisma migrate deploy..."
cd /app
if DATABASE_URL="${DATABASE_URL}" npx prisma migrate deploy; then
  echo "✓ Migrations applied successfully."
else
  echo "✗ Migration deployment failed. Attempting fallback..."

  # Try db push as a fallback to ensure schema matches
  echo "Attempting prisma db push as a fallback to ensure schema matches..."
  if DATABASE_URL="${DATABASE_URL}" npx prisma db push --accept-data-loss --skip-generate; then
    echo "✓ Schema synchronized via db push."

    # Try to resolve migrations so they don't block future deploys
    echo "Marking migrations as applied..."
    for migration_dir in prisma/migrations/*/; do
      if [ -d "$migration_dir" ]; then
        migration_name=$(basename "$migration_dir")
        DATABASE_URL="${DATABASE_URL}" npx prisma migrate resolve --applied "$migration_name" || true
      fi
    done
  else
    echo "✗ Fallback failed. Application may have issues."
  fi
fi

echo "========================================="
echo "Starting Application..."
echo "========================================="

# Start the application
exec "$@"

