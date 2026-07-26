#!/bin/bash

# Travel Life Build Script
# This script builds production Docker images for the application

set -e  # Exit on error

VERSION=${1:-"latest"}
# Append a trailing slash only when a registry is set, so image references are
# "ghcr.io/dsbaciga/travel-life-backend" and not "ghcr.io/dsbagictravel-life-backend".
# Mirrors build.ps1 / build.truenas.ps1.
REGISTRY="${DOCKER_REGISTRY:-}"
REGISTRY_PREFIX="${DOCKER_REGISTRY:+$DOCKER_REGISTRY/}"

echo "========================================="
echo "Travel Life Production Build"
echo "========================================="
echo "Version: $VERSION"
echo "Registry: ${REGISTRY:-"local"}"
echo ""

# Load environment variables if .env.production exists
if [ -f .env.production ]; then
    echo "Loading .env.production..."
    export $(grep -v '^#' .env.production | xargs)
fi

# Build backend
echo "Building backend image..."
docker build \
    -f backend/Dockerfile.prod \
    -t ${REGISTRY_PREFIX}travel-life-backend:${VERSION} \
    -t ${REGISTRY_PREFIX}travel-life-backend:latest \
    ./backend

echo "[OK] Backend image built successfully"

# Build frontend
echo ""
echo "Building frontend image..."
docker build \
    -f frontend/Dockerfile.prod \
    --build-arg VITE_API_URL="${VITE_API_URL:-http://localhost:5000/api}" \
    --build-arg VITE_UPLOAD_URL="${VITE_UPLOAD_URL:-http://localhost:5000/uploads}" \
    -t ${REGISTRY_PREFIX}travel-life-frontend:${VERSION} \
    -t ${REGISTRY_PREFIX}travel-life-frontend:latest \
    ./frontend

echo "[OK] Frontend image built successfully"

echo ""
echo "========================================="
echo "Build Complete!"
echo "========================================="
echo "Images created:"
echo "  - ${REGISTRY_PREFIX}travel-life-backend:${VERSION}"
echo "  - ${REGISTRY_PREFIX}travel-life-backend:latest"
echo "  - ${REGISTRY_PREFIX}travel-life-frontend:${VERSION}"
echo "  - ${REGISTRY_PREFIX}travel-life-frontend:latest"
echo ""
echo "These images are LOCAL ONLY - do not push them by hand."
echo "Registry images are published by .github/workflows/release.yml on a v* tag push."
echo ""
echo "To start the application:"
echo "  docker-compose -f docker-compose.prod.yml --env-file .env.production up -d"
echo ""
