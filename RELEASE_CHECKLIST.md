# Release Checklist

Use this checklist when preparing a new release of Captain's Log.

## Pre-Release

- [ ] All tests passing
- [ ] Update [CHANGELOG.md](CHANGELOG.md) with new features, fixes, and changes
- [ ] Review and close related GitHub issues
- [ ] Update documentation if needed
- [ ] Review security dependencies: `npm audit` in backend and frontend
- [ ] Test development build locally
- [ ] Create/update migration files if database schema changed

## Release Process

### Automated (Recommended)

**Patch Release (1.0.0 → 1.0.1):**
```bash
# Linux/Mac
./release.sh patch

# Windows
.\release.ps1 patch
```

**Minor Release (1.0.0 → 1.1.0):**
```bash
./release.sh minor
```

**Major Release (1.0.0 → 2.0.0):**
```bash
./release.sh major
```

**Custom Version:**
```bash
./release.sh 1.2.3
```

### Manual Process

If you prefer manual control:

1. **Update version numbers:**
   ```bash
   # Update VERSION file
   echo "1.0.1" > VERSION

   # Update package.json files
   # Edit backend/package.json and frontend/package.json
   ```

2. **Update CHANGELOG.md:**
   - Move items from `[Unreleased]` to new version section
   - Add release date

3. **Commit changes:**
   ```bash
   git add VERSION backend/package.json frontend/package.json CHANGELOG.md
   git commit -m "Release v1.0.1"
   ```

4. **Create git tag:**
   ```bash
   git tag -a v1.0.1 -m "Release version 1.0.1"
   ```

5. **Build Docker images:**
   ```bash
   ./build.sh v1.0.1
   # or
   .\build.ps1 -Version v1.0.1
   ```

## Post-Release

- [ ] Push commits: `git push origin main`
- [ ] Push tags: `git push origin v1.0.1`
- [ ] Create GitHub release with release notes
- [ ] Test production build locally
- [ ] Deploy to staging environment (if available)
- [ ] Test staging deployment
- [ ] Deploy to production
- [ ] Smoke test production deployment
- [ ] Announce release (if applicable)
- [ ] Monitor logs for issues

## Production Deployment

1. **Backup current production:**
   ```bash
   # Backup database
   docker exec captains-log-db pg_dump -U captains_log_user captains_log > backup-pre-v1.0.1.sql

   # Export current images (optional)
   docker save captains-log-backend:latest > backup-backend-image.tar
   docker save captains-log-frontend:latest > backup-frontend-image.tar
   ```

2. **Deploy new version:**
   ```bash
   # Pull/build new images
   ./build.sh v1.0.1

   # Run database migrations (if needed)
   docker-compose -f docker-compose.prod.yml run --rm backend npx prisma migrate deploy

   # Start new containers
   docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
   ```

3. **Verify deployment:**
   ```bash
   # Check container health
   docker ps

   # Check logs
   docker-compose -f docker-compose.prod.yml logs -f

   # Test endpoints
   curl http://your-domain.com/health
   curl http://your-domain.com:5000/health
   ```

## Rollback Procedure

If the release has critical issues:

1. **Stop new containers:**
   ```bash
   docker-compose -f docker-compose.prod.yml down
   ```

2. **Restore database (if migrations were run):**
   ```bash
   docker exec -i captains-log-db psql -U captains_log_user captains_log < backup-pre-v1.0.1.sql
   ```

3. **Start previous version:**
   ```bash
   # If images were saved
   docker load < backup-backend-image.tar
   docker load < backup-frontend-image.tar

   # Start previous version
   docker-compose -f docker-compose.prod.yml up -d
   ```

4. **Revert git tag (if pushed):**
   ```bash
   git tag -d v1.0.1
   git push origin :refs/tags/v1.0.1
   ```

## Version Numbering Guide

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (X.0.0): Breaking changes, incompatible API changes
  - Database schema changes requiring manual migration
  - Removed or changed API endpoints
  - Major architectural changes

- **MINOR** (1.X.0): New features, backwards compatible
  - New API endpoints
  - New features
  - Database schema additions (not removals)

- **PATCH** (1.0.X): Bug fixes, backwards compatible
  - Bug fixes
  - Performance improvements
  - Documentation updates
  - Security patches

## Communication

After release:

- [ ] Update project README if major changes
- [ ] Post release notes to project page/blog
- [ ] Notify users of major changes
- [ ] Update any external documentation
- [ ] Create migration guide for major versions

## Maintenance Releases

For critical security or bug fixes:

1. Create hotfix branch from tag: `git checkout -b hotfix-1.0.1 v1.0.0`
2. Apply fixes
3. Follow release process with patch version bump
4. Merge back to main: `git checkout main && git merge hotfix-1.0.1`
5. Delete hotfix branch: `git branch -d hotfix-1.0.1`
