#!/bin/sh
set -e

echo "Starting Captain's Log Backend..."

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

# Run database migrations
echo "Running Prisma migrations..."
npx prisma migrate deploy

# Generate Prisma Client (in case schema changed)
echo "Generating Prisma Client..."
npx prisma generate

echo "Starting application..."
# Execute the main command (passed as arguments to this script)
exec "$@"
