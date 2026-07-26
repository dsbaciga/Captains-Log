<#
.SYNOPSIS
    Automated release script for Travel Life

.DESCRIPTION
    This script prepares and publishes a release:
    1. Updates version numbers in package.json files
    2. Verifies the backend and frontend builds (ABORTS on failure)
    3. Commits the version bump
    4. Builds Docker images locally as a final verification (NOT pushed)
    5. Creates and pushes the git tag

    IMAGE PUBLISHING IS DONE BY CI, NOT BY THIS SCRIPT.
    Pushing the tag triggers .github/workflows/release.yml, which is the single
    authoritative publisher of ghcr.io images and of the GitHub Release.
    See docs/guides/BUILD_AND_PUSH.md for the rationale.

.PARAMETER Version
    The version number (e.g., v1.12.6 or 1.12.6)
    Can also be "patch", "minor", or "major" to auto-increment

.PARAMETER SkipBuild
    Skip the local build verification step (still builds Docker images)

.PARAMETER DryRun
    Show what would be done without actually doing it

.PARAMETER NoConfirm
    Skip all interactive confirmations (for automated releases)

.PARAMETER Description
    Optional description for the release tag

.PARAMETER CommitMessage
    Optional custom commit message (defaults to "Bump version to vX.X.X")

.EXAMPLE
    .\release.ps1 -Version v1.12.6

.EXAMPLE
    .\release.ps1 -Version patch

.EXAMPLE
    .\release.ps1 -Version patch -NoConfirm

.EXAMPLE
    .\release.ps1 -Version 1.12.6 -Description "Fix Timeline z-index issues"

.EXAMPLE
    .\release.ps1 -Version patch -CommitMessage "Add Trip Map feature"

.EXAMPLE
    .\release.ps1 -Version v1.12.6 -DryRun
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$Version,

    [switch]$SkipBuild,

    [switch]$DryRun,

    [switch]$NoConfirm,

    [string]$Description = "",

    [string]$CommitMessage = ""
)

$ErrorActionPreference = "Stop"

# Configuration
$Registry = "ghcr.io/dsbaciga"
$BackendImage = "travel-life-backend"
$FrontendImage = "travel-life-frontend"

# Colors for output
function Write-Step { param($Message) Write-Host "`n=== $Message ===" -ForegroundColor Cyan }
function Write-Success { param($Message) Write-Host "[OK] $Message" -ForegroundColor Green }
function Write-Warn { param($Message) Write-Host "[!!] $Message" -ForegroundColor Yellow }
function Write-Err { param($Message) Write-Host "[XX] $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "     $Message" -ForegroundColor Gray }

# Check if we're in the right directory
if (-not (Test-Path "backend/package.json") -or -not (Test-Path "frontend/package.json")) {
    Write-Err "Must be run from the travel-life root directory"
    exit 1
}

# Get current version from package.json
$backendPackage = Get-Content "backend/package.json" -Raw | ConvertFrom-Json
$CurrentVersion = $backendPackage.version

# Handle version type (patch/minor/major) or explicit version
$VersionParts = $CurrentVersion -split '\.'
$Major = [int]$VersionParts[0]
$Minor = [int]$VersionParts[1]
$Patch = [int]$VersionParts[2]

$NumericVersion = switch ($Version.ToLower()) {
    "patch" { "$Major.$Minor.$($Patch + 1)" }
    "minor" { "$Major.$($Minor + 1).0" }
    "major" { "$($Major + 1).0.0" }
    default { $Version.TrimStart("v") }
}

# Ensure Version variable has 'v' prefix for tags
$Version = "v$NumericVersion"

Write-Host "`n==========================================" -ForegroundColor Magenta
Write-Host "  Travel Life Release Script" -ForegroundColor Magenta
Write-Host "==========================================" -ForegroundColor Magenta
Write-Host "Current version: $CurrentVersion"
Write-Host "New version:     $NumericVersion"
Write-Host "Registry:        $Registry"
if ($DryRun) { Write-Warn "DRY RUN MODE - No changes will be made" }
Write-Host ""

# Confirmation
if (-not $NoConfirm) {
    $Confirmation = Read-Host "Continue with release $Version? (y/N)"
    if ($Confirmation -ne 'y' -and $Confirmation -ne 'Y') {
        Write-Warn "Release cancelled."
        exit 0
    }
} else {
    Write-Info "Skipping confirmation (NoConfirm mode)"
}

# Step 1: Check for uncommitted changes
Write-Step "Checking git status"
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Warn "You have uncommitted changes:"
    $gitStatus | ForEach-Object { Write-Info $_ }
    if (-not $NoConfirm) {
        $response = Read-Host "These will be included in the release commit. Continue? (y/N)"
        if ($response -ne "y" -and $response -ne "Y") {
            Write-Err "Aborted"
            exit 1
        }
    } else {
        Write-Info "Proceeding with uncommitted changes (NoConfirm mode)"
    }
}
Write-Success "Git status checked"

# Step 2: Update version in package.json files
Write-Step "Updating version to $NumericVersion"

Write-Info "Backend: $CurrentVersion -> $NumericVersion"
Write-Info "Frontend: $CurrentVersion -> $NumericVersion"

if (-not $DryRun) {
    # These files are UTF-8. `Get-Content -Raw` without -Encoding uses the system ANSI
    # codepage on Windows PowerShell 5.1, so multibyte characters are misread and then
    # re-encoded as UTF-8 by WriteAllText - double-encoding every em-dash and accent in
    # the changelog (which CI publishes verbatim as the Release body). Always read UTF-8.

    # Update backend package.json (preserve formatting)
    $backendContent = Get-Content "backend/package.json" -Raw -Encoding UTF8
    $backendContent = $backendContent -replace '"version":\s*"[^"]*"', "`"version`": `"$NumericVersion`""
    [System.IO.File]::WriteAllText("$PWD/backend/package.json", $backendContent)

    # Update frontend package.json (preserve formatting)
    $frontendContent = Get-Content "frontend/package.json" -Raw -Encoding UTF8
    $frontendContent = $frontendContent -replace '"version":\s*"[^"]*"', "`"version`": `"$NumericVersion`""
    [System.IO.File]::WriteAllText("$PWD/frontend/package.json", $frontendContent)

    # Promote the [Unreleased] section to this version in CHANGELOG.md.
    # The release workflow reads this section for the GitHub Release body.
    if (Test-Path "CHANGELOG.md") {
        $changelogContent = Get-Content "CHANGELOG.md" -Raw -Encoding UTF8
        $escapedVersion = [regex]::Escape($NumericVersion)
        if ($changelogContent -match "(?m)^##\s+\[$escapedVersion\]") {
            Write-Info "CHANGELOG.md already has a section for $NumericVersion"
        } elseif ($changelogContent -match "(?m)^##\s+\[Unreleased\]") {
            $today = Get-Date -Format "yyyy-MM-dd"
            $changelogContent = $changelogContent -replace "(?m)^##\s+\[Unreleased\].*$", "## [Unreleased]`n`n## [$NumericVersion] - $today"
            [System.IO.File]::WriteAllText("$PWD/CHANGELOG.md", $changelogContent)
            Write-Success "CHANGELOG.md: [Unreleased] promoted to [$NumericVersion]"
        } else {
            Write-Warn "CHANGELOG.md has no [Unreleased] section - skipping changelog update"
        }
    } else {
        Write-Warn "CHANGELOG.md not found - the GitHub Release body will use a generic note"
    }
}
Write-Success "Version updated in package.json files"

# Helper: run "npm run build" in a package directory and return the real exit code.
# NOTE: `$ErrorActionPreference = "Stop"` plus `2>&1` on a native command turns any
# stderr output (vite progress, npm notices) into a terminating NativeCommandError,
# which is why the old try/catch here reported false failures for the frontend and
# false successes for the backend. Exit code is the only reliable signal.
function Invoke-PackageBuild {
    param(
        [Parameter(Mandatory = $true)][string]$Directory,
        [Parameter(Mandatory = $true)][ref]$OutputRef
    )

    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        $OutputRef.Value = @("npm was not found on PATH")
        return 127
    }

    Push-Location $Directory
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    # Clear the previous command's exit code so a command that never ran cannot be
    # mistaken for a success carried over from an earlier call.
    $global:LASTEXITCODE = $null
    try {
        $OutputRef.Value = & npm run build 2>&1
        if ($null -eq $LASTEXITCODE) {
            # npm never produced an exit code (it failed to launch)
            return 127
        }
        return $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousPreference
        Pop-Location
    }
}

# Helper: abort (or prompt, when interactive) on a failed verification build.
function Assert-BuildSucceeded {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][int]$ExitCode,
        $Output
    )

    if ($ExitCode -eq 0) {
        Write-Success "$Name build completed"
        return
    }

    Write-Err "$Name build FAILED (exit code $ExitCode)"
    if ($Output) {
        Write-Info "--- last 30 lines of build output ---"
        @($Output) | Select-Object -Last 30 | ForEach-Object { Write-Info $_ }
    }

    if ($NoConfirm) {
        Write-Err "Aborting release. Fix the $Name build and re-run."
        exit 1
    }

    $response = Read-Host "Continue the release anyway with a FAILING $Name build? (y/N)"
    if ($response -ne 'y' -and $response -ne 'Y') {
        Write-Err "Aborting release. Fix the $Name build and re-run."
        exit 1
    }
    Write-Warn "Continuing despite the failed $Name build (explicit operator override)"
}

# Step 3: Build verification (unless skipped)
if (-not $SkipBuild) {
    Write-Step "Building backend (verification)"
    if (-not $DryRun) {
        $backendOutput = $null
        $backendExit = Invoke-PackageBuild -Directory "backend" -OutputRef ([ref]$backendOutput)
        Assert-BuildSucceeded -Name "Backend" -ExitCode $backendExit -Output $backendOutput
    } else {
        Write-Info "Would run: npm run build (backend)"
    }

    Write-Step "Building frontend (verification)"
    if (-not $DryRun) {
        $frontendOutput = $null
        $frontendExit = Invoke-PackageBuild -Directory "frontend" -OutputRef ([ref]$frontendOutput)
        Assert-BuildSucceeded -Name "Frontend" -ExitCode $frontendExit -Output $frontendOutput

        # Secondary sanity check: vite prints "built in <time>" on a successful bundle.
        # Informational only - the exit code above is the gate.
        if ($frontendExit -eq 0 -and -not (@($frontendOutput) -match "built in")) {
            Write-Warn "Frontend build exited 0 but no 'built in' line was found in the output"
        }
    } else {
        Write-Info "Would run: npm run build (frontend)"
    }
} else {
    Write-Warn "Skipping build verification"
}

# Step 4: Commit version bump and any staged changes
Write-Step "Committing changes"

# Build commit message
if ($CommitMessage) {
    $finalCommitMessage = "$CommitMessage`n`nBump version to $Version"
} else {
    $finalCommitMessage = "Bump version to $Version"
}

if (-not $DryRun) {
    git add -A
    git commit -m $finalCommitMessage
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Changes committed"
    } else {
        Write-Info "Nothing new to commit"
    }
} else {
    Write-Info "Would commit: $finalCommitMessage"
}

# Step 5: Build Docker images LOCALLY as a final verification.
# These images are deliberately NOT pushed - .github/workflows/release.yml is the
# single publisher of registry images (triggered by the tag push in Step 7).
Write-Step "Building Docker images (local verification only - not pushed)"
if (-not $DryRun) {
    & .\build.truenas.ps1 -Version $Version -Registry $Registry
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Docker build failed"
        exit 1
    }
    Write-Success "Docker images built locally"
} else {
    Write-Info "Would run: .\build.truenas.ps1 -Version $Version -Registry $Registry"
}

# Step 6: Create and push git tag
Write-Step "Creating git tag"

# Build tag message
if ($Description) {
    $tagMessage = "$Version - $Description"
} else {
    # Try to get description from recent commit
    $recentCommit = git log -1 --pretty=format:"%s" 2>$null
    if ($recentCommit -and $recentCommit -ne "Bump version to $Version") {
        $tagMessage = "$Version - $recentCommit"
    } else {
        $tagMessage = "$Version - Release"
    }
}

Write-Info "Tag message: $tagMessage"

if (-not $DryRun) {
    # Check if tag already exists (destructive path - always confirm unless -NoConfirm)
    $existingTag = git tag -l $Version
    if ($existingTag) {
        Write-Warn "Tag $Version ALREADY EXISTS."
        Write-Warn "Recreating it deletes the tag locally AND on origin - if $Version was"
        Write-Warn "already published, this destroys a shipped release tag."
        if (-not $NoConfirm) {
            $tagResponse = Read-Host "Delete and recreate tag $Version (local + origin)? (y/N)"
            if ($tagResponse -ne 'y' -and $tagResponse -ne 'Y') {
                Write-Err "Aborted. Choose a different -Version, or delete the tag yourself."
                exit 1
            }
        } else {
            Write-Warn "NoConfirm mode: deleting and recreating tag $Version"
        }

        git tag -d $Version
        if ($LASTEXITCODE -ne 0) {
            Write-Err "Failed to delete local tag $Version"
            exit 1
        }

        # Only try the remote deletion if the tag actually exists on origin,
        # so a missing remote tag is not treated as a failure.
        $remoteTag = git ls-remote --tags origin "refs/tags/$Version"
        if ($remoteTag) {
            git push origin ":refs/tags/$Version"
            if ($LASTEXITCODE -ne 0) {
                Write-Err "Failed to delete remote tag $Version - aborting before recreating it"
                Write-Info "The local tag has been deleted; the remote tag still exists."
                exit 1
            }
            Write-Success "Deleted remote tag $Version"
        } else {
            Write-Info "Tag $Version does not exist on origin - nothing to delete remotely"
        }
    }

    git tag -a $Version -m $tagMessage
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Failed to create tag"
        exit 1
    }
    Write-Success "Git tag created"
} else {
    Write-Info "Would create tag: $Version"
}

Write-Step "Pushing to remote"
if (-not $DryRun) {
    git push origin main
    if ($LASTEXITCODE -ne 0) {
        Write-Warn "Failed to push main branch (may already be up to date)"
    }

    git push origin $Version
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Failed to push tag"
        exit 1
    }
    Write-Success "Pushed to remote"
} else {
    Write-Info "Would push: main branch and $Version tag"
}

# Summary
Write-Host "`n==========================================" -ForegroundColor Green
Write-Host "  Release $Version tagged and pushed!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Git tag: $Version" -ForegroundColor Cyan
Write-Host ""
Write-Host "CI is now building and PUBLISHING the images (this script does not push):" -ForegroundColor White
Write-Host "  - $Registry/${BackendImage}:$Version  (and :$NumericVersion, :latest)" -ForegroundColor Cyan
Write-Host "  - $Registry/${FrontendImage}:$Version  (and :$NumericVersion, :latest)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Watch the run: https://github.com/dsbaciga/travel-life/actions" -ForegroundColor Yellow
Write-Host "Wait for it to go green BEFORE deploying." -ForegroundColor Yellow
Write-Host ""
Write-Host "To deploy on TrueNAS (pin the version you just released):" -ForegroundColor White
Write-Host "  export APP_VERSION=$Version" -ForegroundColor Yellow
Write-Host "  docker-compose -f docker-compose.truenas.yml pull" -ForegroundColor Yellow
Write-Host "  docker-compose -f docker-compose.truenas.yml up -d" -ForegroundColor Yellow
Write-Host ""

if ($DryRun) {
    Write-Warn "This was a dry run. No changes were made."
}
