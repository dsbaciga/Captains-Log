#!/bin/sh
set -e

echo "========================================="
echo "Database Migration & Startup Script"
echo "========================================="

# Create Prisma config file in /tmp with the database URL
echo "Setting up Prisma environment..."
cat > /tmp/prisma.config.ts <<'CONFIGEOF'
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: '/app/prisma/schema.prisma',
  migrations: {
    path: '/app/prisma/migrations',
  },
  datasource: {
    url: env("DATABASE_URL")
  }
});
CONFIGEOF

# Wait for database to be ready
echo "Waiting for database to be ready..."
until cd /app && DATABASE_URL="${DATABASE_URL}" npx prisma db execute --config=/tmp/prisma.config.ts --stdin <<EOF2
SELECT 1;
EOF2
do
  echo "Database is unavailable - sleeping"
  sleep 2
done

echo "Database is ready!"

# Check if PostGIS extension is installed
echo "Checking for PostGIS extension..."
cd /app && DATABASE_URL="${DATABASE_URL}" npx prisma db execute --config=/tmp/prisma.config.ts --stdin <<EOF
CREATE EXTENSION IF NOT EXISTS postgis;
EOF

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

