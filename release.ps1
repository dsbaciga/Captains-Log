# Captain's Log Release Script (PowerShell)
# Automates version bumping, tagging, and building releases

param(
    [string]$VersionType = "patch"
)

$ErrorActionPreference = "Stop"

$CurrentVersion = Get-Content VERSION -Raw
$CurrentVersion = $CurrentVersion.Trim()

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Captain's Log Release Manager" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Current version: $CurrentVersion"
Write-Host ""

# Parse current version
$VersionParts = $CurrentVersion -split '\.'
$Major = [int]$VersionParts[0]
$Minor = [int]$VersionParts[1]
$Patch = [int]$VersionParts[2]

# Calculate new version
$NewVersion = switch ($VersionType) {
    "major" { "$($Major + 1).0.0" }
    "minor" { "$Major.$($Minor + 1).0" }
    "patch" { "$Major.$Minor.$($Patch + 1)" }
    default { $VersionType }  # Custom version
}

Write-Host "New version will be: $NewVersion"
Write-Host ""
$Confirmation = Read-Host "Continue with release? (y/N)"
if ($Confirmation -ne 'y' -and $Confirmation -ne 'Y') {
    Write-Host "Release cancelled." -ForegroundColor Yellow
    exit 0
}

# Update VERSION file
Set-Content -Path VERSION -Value $NewVersion -NoNewline
Write-Host "✓ Updated VERSION file" -ForegroundColor Green

# Update package.json files
if (Test-Path backend/package.json) {
    $BackendPackage = Get-Content backend/package.json -Raw | ConvertFrom-Json
    $BackendPackage.version = $NewVersion
    $BackendPackage | ConvertTo-Json -Depth 100 | Set-Content backend/package.json
    Write-Host "✓ Updated backend/package.json" -ForegroundColor Green
}

if (Test-Path frontend/package.json) {
    $FrontendPackage = Get-Content frontend/package.json -Raw | ConvertFrom-Json
    $FrontendPackage.version = $NewVersion
    $FrontendPackage | ConvertTo-Json -Depth 100 | Set-Content frontend/package.json
    Write-Host "✓ Updated frontend/package.json" -ForegroundColor Green
}

# Update CHANGELOG.md
$Today = Get-Date -Format "yyyy-MM-dd"
$Changelog = Get-Content CHANGELOG.md -Raw
$Changelog = $Changelog -replace "## \[Unreleased\]", "## [Unreleased]`n`n## [$NewVersion] - $Today"
Set-Content -Path CHANGELOG.md -Value $Changelog -NoNewline
Write-Host "✓ Updated CHANGELOG.md" -ForegroundColor Green

# Git operations
if (Test-Path .git) {
    Write-Host ""
    Write-Host "Committing changes..." -ForegroundColor Yellow
    git add VERSION backend/package.json frontend/package.json CHANGELOG.md
    git commit -m "Release v$NewVersion"
    Write-Host "✓ Changes committed" -ForegroundColor Green

    Write-Host ""
    Write-Host "Creating git tag..." -ForegroundColor Yellow
    git tag -a "v$NewVersion" -m "Release version $NewVersion"
    Write-Host "✓ Tag created: v$NewVersion" -ForegroundColor Green

    Write-Host ""
    Write-Host "To push the release:" -ForegroundColor Yellow
    Write-Host "  git push origin main"
    Write-Host "  git push origin v$NewVersion"
}

# Build release
Write-Host ""
$BuildConfirmation = Read-Host "Build Docker images for this release? (y/N)"
if ($BuildConfirmation -eq 'y' -or $BuildConfirmation -eq 'Y') {
    .\build.ps1 -Version "v$NewVersion"
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Release v$NewVersion Complete!" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Review changes: git log -1"
Write-Host "  2. Push to remote: git push origin main; git push origin v$NewVersion"
Write-Host "  3. Create GitHub release (if applicable)"
Write-Host "  4. Deploy: docker-compose -f docker-compose.prod.yml --env-file .env.production up -d"
Write-Host ""
