# Build and Push Checklist

This checklist outlines the proper steps to build, push, and tag a new version of Captain's Log.

## Pre-Release Checklist

- [ ] All changes have been tested locally
- [ ] All code changes are committed
- [ ] Release notes document is created (RELEASE_NOTES_vX.X.X.md)
- [ ] Version number decided (patch/minor/major)

## Version Update

- [ ] **Update backend/package.json version**

  - File: `backend/package.json`
  - Update `"version": "X.X.X"` field

- [ ] **Update frontend/package.json version**
  - File: `frontend/package.json`
  - Update `"version": "X.X.X"` field

## Build Verification

- [ ] **Test backend build**

  ```bash
  cd backend && npm run build
  ```

  - Verify build completes (warnings are OK, errors are not)

- [ ] **Test frontend build**

  ```bash
  cd frontend && npm run build
  ```

  - Verify build completes with no blocking errors

## Docker Build

- [ ] **Build Docker images**

  ```powershell
  # Windows
  .\build.truenas.ps1 -Version vX.X.X -Registry ghcr.io/dsbaciga

  # Linux/Mac
  ./build.sh vX.X.X
  ```

  - Verify both backend and frontend images build successfully
  - Look for confirmation messages

## Push to Registry

- [ ] **Push backend image**

  ```bash
  docker push ghcr.io/dsbaciga/captains-log-backend:vX.X.X
  ```

- [ ] **Push frontend image**

  ```bash
  docker push ghcr.io/dsbaciga/captains-log-frontend:vX.X.X
  ```

- [ ] **Verify images on GHCR**
  - Check https://github.com/dsbaciga?tab=packages
  - Confirm new version appears in package list

## Git Tagging

- [ ] **Create annotated git tag**

  ```bash
  git tag -a vX.X.X -m "vX.X.X - Brief description of changes"
  ```

- [ ] **Push tag to GitHub**

  ```bash
  git push origin vX.X.X
  ```

- [ ] **Verify tag on GitHub**
  - Check https://github.com/dsbaciga/Captains-Log/tags
  - Confirm new tag appears

## Post-Release

- [ ] **Update IMPLEMENTATION_STATUS.md** (if applicable)

  - Document completed features
  - Update known issues

- [ ] **Test deployment**

  - Deploy to test environment if available
  - Verify basic functionality

- [ ] **Announce release** (optional)
  - Update documentation
  - Notify users if needed

## Common Issues and Solutions

### Issue: Forgot to update package.json

**Solution**:

1. Update package.json files
2. Rebuild images with correct version
3. Re-push to registry
4. Delete and recreate git tag

### Issue: Build fails

**Solution**:

1. Check error messages carefully
2. Fix code issues
3. Re-run build verification steps
4. Don't proceed to Docker build until local builds pass

### Issue: Docker push fails with authentication error

**Solution**:

```bash
# Re-authenticate with GHCR
docker login ghcr.io -u USERNAME
```

### Issue: Tag already exists

**Solution**:

```bash
# Delete local tag
git tag -d vX.X.X

# Delete remote tag
git push origin :refs/tags/vX.X.X

# Recreate tag
git tag -a vX.X.X -m "vX.X.X - Description"
git push origin vX.X.X
```

## Version Numbering Guide

Follow semantic versioning (MAJOR.MINOR.PATCH):

- **PATCH** (X.X.1): Bug fixes, small improvements
- **MINOR** (X.1.0): New features, backwards compatible
- **MAJOR** (1.0.0): Breaking changes, major refactors

## Quick Reference Commands

```bash
# Full release sequence (replace X.X.X with version)
cd backend && npm run build
cd ../frontend && npm run build
cd ..
.\build.truenas.ps1 -Version vX.X.X -Registry ghcr.io/dsbaciga
docker push ghcr.io/dsbaciga/captains-log-backend:vX.X.X
docker push ghcr.io/dsbaciga/captains-log-frontend:vX.X.X
git tag -a vX.X.X -m "vX.X.X - Description"
git push origin vX.X.X
```

## Deployment Commands (for reference)

### TrueNAS

docker and docker-compose commands are not supported on TrueNAS

### Standard Production

```bash
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

## Related Files

- [RELEASE_CHECKLIST.md](../RELEASE_CHECKLIST.md) - More comprehensive release process
- [DEPLOYMENT.md](../DEPLOYMENT.md) - Production deployment guide
- [CLAUDE.md](../CLAUDE.md) - Project instructions for AI assistants
