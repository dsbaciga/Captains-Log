# Travel Life Build Script for TrueNAS (PowerShell)
# This script builds production Docker images optimized for TrueNAS deployment

param(
    [string]$Version = "latest",
    [string]$Registry = $env:DOCKER_REGISTRY
)

$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Travel Life TrueNAS Build" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Version: $Version"
Write-Host "Registry: $(if($Registry) {$Registry} else {'local'})"
Write-Host ""

$RegistryPrefix = if($Registry) {"$Registry/"} else {""}

# Build backend (same as regular build)
Write-Host "Building backend image..." -ForegroundColor Green
docker build `
    -f backend/Dockerfile.prod `
    -t "${RegistryPrefix}travel-life-backend:${Version}" `
    -t "${RegistryPrefix}travel-life-backend:latest" `
    -t "${RegistryPrefix}travel-life-backend:${Version}-truenas" `
    ./backend

if ($LASTEXITCODE -ne 0) {
    Write-Host "× Backend build failed" -ForegroundColor Red
    exit 1
}
Write-Host "√ Backend image built successfully" -ForegroundColor Green

# Build frontend with TrueNAS-specific configuration
Write-Host ""
Write-Host "Building TrueNAS frontend image with nginx proxy..." -ForegroundColor Green

docker build `
    -f frontend/Dockerfile.prod.truenas `
    -t "${RegistryPrefix}travel-life-frontend:${Version}" `
    -t "${RegistryPrefix}travel-life-frontend:latest" `
    -t "${RegistryPrefix}travel-life-frontend:${Version}-truenas" `
    ./frontend

if ($LASTEXITCODE -ne 0) {
    Write-Host "× Frontend build failed" -ForegroundColor Red
    exit 1
}
Write-Host "√ Frontend image built successfully" -ForegroundColor Green

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "TrueNAS Build Complete!" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Images created:"
Write-Host "  - ${RegistryPrefix}travel-life-backend:${Version}"
Write-Host "  - ${RegistryPrefix}travel-life-backend:${Version}-truenas"
Write-Host "  - ${RegistryPrefix}travel-life-frontend:${Version}"
Write-Host "  - ${RegistryPrefix}travel-life-frontend:${Version}-truenas"
Write-Host ""
Write-Host "Frontend includes nginx proxy for /api and /uploads" -ForegroundColor Yellow
Write-Host ""
Write-Host "These images are LOCAL ONLY - do not push them." -ForegroundColor Yellow
Write-Host "CI (.github/workflows/release.yml) is the single publisher of registry" -ForegroundColor Yellow
Write-Host "images, triggered by pushing a v* tag. Pushing by hand creates a second," -ForegroundColor Yellow
Write-Host "uncoordinated pipeline whose images can silently differ from CI's."  -ForegroundColor Yellow
Write-Host ""
Write-Host "Note: this script builds the frontend from Dockerfile.prod.truenas," -ForegroundColor Yellow
Write-Host "which is NOT what CI publishes (Dockerfile.prod). Do not treat a" -ForegroundColor Yellow
Write-Host "successful build here as verification of a release." -ForegroundColor Yellow
Write-Host ""
Write-Host "To release: .\release.ps1 -Version patch   (then watch the CI run)" -ForegroundColor Yellow
Write-Host "To deploy on TrueNAS: set APP_VERSION to the released tag and restart" -ForegroundColor Yellow
Write-Host "the app from the TrueNAS Apps UI." -ForegroundColor Yellow
Write-Host ""
