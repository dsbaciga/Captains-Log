# Release Checklist

Comprehensive checklist for releasing new versions of Travel Life.

## How a release is published

**CI is the single publisher of container images.** Pushing a `v*` tag triggers
`.github/workflows/release.yml`, which builds from a clean checkout of the tagged commit,
pushes to `ghcr.io`, and creates the GitHub Release from the matching `CHANGELOG.md` section.

`release.ps1` / `release.sh` bump the version, verify the builds, commit, tag and push the
tag. They build Docker images locally as a last verification but **never push them**. Do not
push images by hand. See [docs/guides/BUILD_AND_PUSH.md](docs/guides/BUILD_AND_PUSH.md) for
the reasoning.

The manual steps below are ordered to match what `release.ps1` actually does:
version bump → build verification → commit → local Docker build → tag → push tag → CI publishes.

## Pre-Release

### Code Quality

- [ ] All features for this release are complete
- [ ] Code has been reviewed (if applicable)
- [ ] No console.log statements left in production code
- [ ] No TODO/FIXME comments for this release scope
- [ ] TypeScript compiles without errors

### Testing

- [ ] Manual testing of new features completed
- [ ] Regression testing on critical paths:
  - [ ] User registration and login
  - [ ] Trip creation and editing
  - [ ] Photo upload (local and Immich)
  - [ ] Timeline view
  - [ ] Search functionality
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Mobile responsiveness verified

### Documentation

- [ ] CLAUDE.md updated if architecture changed
- [ ] API documentation updated for new endpoints
- [ ] User-facing changes documented
- [ ] CHANGELOG.md updated with changes

## Version Bump

### Determine Version Type

- **PATCH** (x.x.1): Bug fixes, minor improvements, no new features
- **MINOR** (x.1.0): New features, backwards compatible
- **MAJOR** (1.0.0): Breaking changes, major refactors

### Update Version Numbers

Using automated script (recommended):

```powershell
.\release.ps1 -Version patch -NoConfirm
```

Or manually update:

- [ ] `backend/package.json` - version field
- [ ] `frontend/package.json` - version field

The version is tracked only in these two `package.json` files; there is no separate `VERSION` file. The `release.ps1` script updates both automatically, and both release scripts read the current version from `backend/package.json`.

- [ ] `CHANGELOG.md` - move the `[Unreleased]` entries under a `## [X.Y.Z] - YYYY-MM-DD`
      heading (the release scripts insert this heading for you; fill in the entries as you work)

On Linux/Mac the equivalent script is:

```bash
./release.sh patch          # or minor / major / 5.6.2 / v5.6.2
```

## Build Verification

### Backend

```bash
cd backend
npm run build
```

- [ ] Build completes successfully
- [ ] No TypeScript errors
- [ ] No critical warnings

### Frontend

```bash
cd frontend
npm run build
```

- [ ] Build completes successfully
- [ ] No TypeScript errors
- [ ] Bundle size is reasonable

## Git Operations

The version bump is committed **before** the Docker build (this is the order `release.ps1`
uses — build verification above already passed at this point).

```bash
# Commit version changes
git add -A
git commit -m "Bump version to vX.X.X"
```

- [ ] Changes committed

## Docker Build (local verification only)

### Build Images

```powershell
# Windows
.\build.truenas.ps1 -Version vX.X.X -Registry ghcr.io/dsbaciga

# Linux/Mac
DOCKER_REGISTRY=ghcr.io/dsbaciga ./build.sh vX.X.X
```

- [ ] Backend image builds successfully
- [ ] Frontend image builds successfully
- [ ] Images are **not** pushed (CI publishes them)

### Test Images Locally

```bash
docker-compose -f docker-compose.prod.yml up -d
```

- [ ] All containers start
- [ ] Backend health check passes
- [ ] Frontend loads correctly
- [ ] Database migrations run

## Publish

### Tag and Push (this is what publishes)

```bash
# Create annotated tag
git tag -a vX.X.X -m "vX.X.X - Brief description"

# Push to remote - pushing the tag triggers the release workflow
git push origin main
git push origin vX.X.X
```

- [ ] Tag created
- [ ] Tag pushed to remote
- [ ] Verify tag on GitHub

### Watch CI Publish

- [ ] "Build and Release" workflow is green
      (<https://github.com/dsbaciga/travel-life/actions>)
- [ ] Images `X.X.X`, `vX.X.X` and `latest` appear on GitHub Packages
- [ ] GitHub Release created with the `CHANGELOG.md` notes for this version

## Post-Release

### Deployment

- [ ] Deploy to staging environment (if applicable)
- [ ] Verify staging deployment
- [ ] Deploy to production
- [ ] Run database migrations in production
- [ ] Verify production deployment

### Verification

- [ ] Production health checks pass
- [ ] Key features work correctly
- [ ] No error spikes in logs
- [ ] Performance is acceptable

### Documentation Updates

- [ ] Update docs/development/IMPLEMENTATION_STATUS.md
- [ ] Close related GitHub issues
- [ ] Update project board/milestones

### Communication

- [ ] Notify users of new release (if applicable)
- [ ] Update changelog/release notes
- [ ] Document any migration steps needed

## Rollback Plan

If issues are discovered post-release:

### Quick Rollback

The TrueNAS compose files deploy `${APP_VERSION}`, so rolling back is a variable change:

```bash
APP_VERSION=<previous tag> docker-compose -f docker-compose.truenas.yml pull
APP_VERSION=<previous tag> docker-compose -f docker-compose.truenas.yml up -d
```

For `docker-compose.prod.yml`:

```bash
# Pull previous version
docker pull ghcr.io/dsbaciga/travel-life-backend:vX.X.X-1
docker pull ghcr.io/dsbaciga/travel-life-frontend:vX.X.X-1

# Update docker-compose to use previous version
# Then restart
docker-compose -f docker-compose.prod.yml up -d
```

### Database Rollback (if needed)

```bash
# Restore from backup
docker exec -i travel-life-db psql -U travel_life_user travel_life < backup.sql
```

## Automation Options

### Fully Automated Release

```powershell
# Non-interactive release with all steps
.\release.ps1 -Version patch -NoConfirm
```

### Dry Run (Preview)

```powershell
# See what would happen without making changes
.\release.ps1 -Version patch -DryRun
```

### Skip Build Verification

```powershell
# If you've already verified builds
.\release.ps1 -Version patch -NoConfirm -SkipBuild
```

## Common Issues

### Build Failures

- Check for TypeScript errors
- Verify all dependencies are installed
- Clear node_modules and reinstall

### Docker Push Authentication

```bash
# Re-authenticate with GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

### Tag Already Exists

Prefer bumping to the next version. Only delete a tag if it was never published — deleting a
shipped tag removes it for everyone, and CI has already built images from it.

```bash
# Delete and recreate tag
git tag -d vX.X.X
git push origin :refs/tags/vX.X.X
git tag -a vX.X.X -m "Description"
git push origin vX.X.X
```

`release.ps1` prompts before doing this (and skips the prompt only with `-NoConfirm`);
`release.sh` refuses outright and asks you to pick another version.

## Related Documentation

- [docs/guides/BUILD_AND_PUSH.md](docs/guides/BUILD_AND_PUSH.md) - Detailed build process
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide
- [QUICK_START_PRODUCTION.md](QUICK_START_PRODUCTION.md) - Quick setup
