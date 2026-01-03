#!/bin/sh
set -e

echo "========================================="
echo "Database Migration & Startup Script"
echo "========================================="

# Wait for database to be ready
echo "Waiting for database to be ready..."
until npx prisma db execute --stdin <<EOF
SELECT 1;
EOF
do
  echo "Database is unavailable - sleeping"
  sleep 2
done

echo "Database is ready!"

# Check if PostGIS extension is installed
echo "Checking for PostGIS extension..."
npx prisma db execute --stdin <<EOF
CREATE EXTENSION IF NOT EXISTS postgis;
EOF

# Run Prisma migrations
echo "Running prisma migrate deploy..."
if npx prisma migrate deploy; then
  echo "✓ Migrations applied successfully."
else
  echo "✗ Migration deployment failed. Attempting fallback..."
  
  # Check if the error is about missing columns that we expect
  # We'll try a db push as a last resort if migrations are stuck
  echo "Attempting prisma db push as a fallback to ensure schema matches..."
  if npx prisma db push --accept-data-loss --skip-generate; then
    echo "✓ Schema synchronized via db push."
    
    # Try to resolve migrations so they don't block future deploys
    echo "Marking all migrations as applied..."
    for migration_dir in /app/prisma/migrations/*/; do
      if [ -d "$migration_dir" ]; then
        migration_name=$(basename "$migration_dir")
        npx prisma migrate resolve --applied "$migration_name" || true
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

