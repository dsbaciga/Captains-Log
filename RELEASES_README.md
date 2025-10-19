# Captain's Log - Release System Documentation

This document provides an overview of the release build system for Captain's Log.

## Overview

Captain's Log now has a complete production release system with:

✅ **Multi-stage Docker builds** for optimized production images
✅ **Automated build scripts** for both Linux/Mac (bash) and Windows (PowerShell)
✅ **Production Docker Compose** configuration with health checks
✅ **Version management** system with automated releases
✅ **CI/CD workflows** for GitHub Actions
✅ **Comprehensive documentation** for deployment and releases

## Quick Links

| Document | Purpose |
|----------|---------|
| [QUICK_START_PRODUCTION.md](QUICK_START_PRODUCTION.md) | Get production running in < 10 minutes |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Full deployment guide with all options |
| [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) | Step-by-step release process |
| [CHANGELOG.md](CHANGELOG.md) | Version history and changes |

## File Structure

```
Captains-Log/
├── docker-compose.yml              # Development environment
├── docker-compose.prod.yml         # Production environment (NEW)
├── .env.production.example         # Production config template (NEW)
├── VERSION                         # Current version number (NEW)
├── CHANGELOG.md                    # Version history (NEW)
│
├── build.sh                        # Build script for Linux/Mac (NEW)
├── build.ps1                       # Build script for Windows (NEW)
├── release.sh                      # Release automation for Linux/Mac (NEW)
├── release.ps1                     # Release automation for Windows (NEW)
│
├── backend/
│   ├── Dockerfile                  # Development dockerfile
│   └── Dockerfile.prod            # Production dockerfile (NEW)
│
├── frontend/
│   ├── Dockerfile                  # Development dockerfile
│   ├── Dockerfile.prod            # Production dockerfile (NEW)
│   └── nginx.conf                 # Nginx config for production (NEW)
│
├── .github/workflows/
│   ├── release.yml                # Auto-build on tags (NEW)
│   └── docker-build-test.yml      # Test builds on PR (NEW)
│
└── Documentation (NEW)
    ├── DEPLOYMENT.md              # Full deployment guide
    ├── QUICK_START_PRODUCTION.md  # Quick start guide
    ├── RELEASE_CHECKLIST.md       # Release process
    └── RELEASES_README.md         # This file
```

## Usage

### For Developers

**Build production images:**
```bash
# Linux/Mac
./build.sh v1.0.0

# Windows
.\build.ps1 -Version v1.0.0
```

**Create a new release:**
```bash
# Linux/Mac - patch version (1.0.0 → 1.0.1)
./release.sh patch

# Linux/Mac - minor version (1.0.0 → 1.1.0)
./release.sh minor

# Windows
.\release.ps1 patch
```

### For DevOps/Deployment

**Quick production deployment:**
```bash
# 1. Configure
cp .env.production.example .env.production
# Edit .env.production with your settings

# 2. Build
./build.sh v1.0.0

# 3. Deploy
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# 4. Initialize
docker exec captains-log-backend npx prisma migrate deploy
```

See [QUICK_START_PRODUCTION.md](QUICK_START_PRODUCTION.md) for full quick start.

### For CI/CD

**GitHub Actions workflows automatically:**

- Test builds on every PR
- Build and push images when you push a tag (e.g., `v1.0.0`)
- Create GitHub releases with changelog

**Manual trigger:**
```bash
# Create and push a tag
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

## Production vs Development

### Development Setup

**Purpose:** Hot-reload development with debugging
**Command:** `docker-compose up -d`
**Ports:** Frontend 3000, Backend 5000
**Volumes:** Source code mounted for live changes
**Size:** ~500MB per service (includes dev dependencies)

### Production Setup

**Purpose:** Optimized, secure production deployment
**Command:** `docker-compose -f docker-compose.prod.yml up -d`
**Ports:** Frontend 80, Backend 5000
**Volumes:** Only uploads and data (no source code)
**Size:** ~200MB per service (prod dependencies only)

**Production optimizations:**
- Multi-stage builds (smaller images)
- nginx for frontend (better performance)
- Health checks on all services
- No dev dependencies included
- Gzip compression enabled
- Security headers configured
- Non-root user in backend

## Key Features

### 1. Multi-Stage Docker Builds

**Backend:** TypeScript compilation in builder stage, run compiled JS in production
**Frontend:** Vite build in builder stage, serve static files with nginx

**Benefits:**
- 60% smaller images
- Faster deployment
- No build tools in production

### 2. Build Scripts

Cross-platform scripts handle:
- Loading environment variables
- Building Docker images with proper tags
- Tagging both version and latest
- Support for custom Docker registries

### 3. Release Automation

Automated release script handles:
- Version bumping (semver)
- Updating package.json files
- Updating CHANGELOG.md
- Git commit and tagging
- Optional Docker build

### 4. Environment Configuration

Separate configurations for dev and production:
- `.env` - Development (git-ignored)
- `.env.production` - Production (git-ignored)
- `.env.production.example` - Template (checked in)

### 5. Health Checks

All services include health checks:
- Backend: HTTP endpoint check
- Frontend: nginx availability check
- Database: PostgreSQL ready check

### 6. CI/CD Integration

GitHub Actions workflows:
- Test builds on PRs (prevent broken builds)
- Auto-build on tags (automated releases)
- Push to GitHub Container Registry
- Create GitHub releases with changelog

## Security Considerations

### What's Included

✅ Security headers in nginx (X-Frame-Options, X-Content-Type-Options, etc.)
✅ Health checks with proper timeouts
✅ Non-root user in backend container
✅ Production environment isolation
✅ Separate secrets for dev and production
✅ No source code in production images

### What You Must Configure

⚠️ **Strong JWT secrets** (32+ character random strings)
⚠️ **Strong database passwords**
⚠️ **HTTPS setup** (use reverse proxy with SSL)
⚠️ **Firewall rules** (restrict database port)
⚠️ **Regular updates** (dependencies and base images)

See [DEPLOYMENT.md Security Considerations](DEPLOYMENT.md#security-considerations) for full details.

## Deployment Options

The system supports multiple deployment strategies:

1. **Single Server** - Docker Compose on one machine (simplest)
2. **Separate Database** - Managed PostgreSQL service
3. **Cloud Platforms** - AWS ECS, Google Cloud Run, Azure Container Instances
4. **Behind Reverse Proxy** - nginx/Traefik with HTTPS
5. **Kubernetes** - Use Docker images with K8s manifests (not included yet)

See [DEPLOYMENT.md Deployment Options](DEPLOYMENT.md#deployment-options) for details.

## Version Management

**Current version:** See [VERSION](VERSION) file
**Version history:** See [CHANGELOG.md](CHANGELOG.md)
**Versioning scheme:** [Semantic Versioning](https://semver.org/)

**Version format:** MAJOR.MINOR.PATCH

- **MAJOR:** Breaking changes, incompatible API changes
- **MINOR:** New features, backwards compatible
- **PATCH:** Bug fixes, backwards compatible

## Monitoring and Maintenance

### View Logs
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

### Check Health
```bash
docker ps  # Should show "healthy" status
curl http://localhost:5000/health
curl http://localhost/health
```

### Backup Database
```bash
docker exec captains-log-db pg_dump -U captains_log_user captains_log > backup.sql
```

### Update to New Version
```bash
# 1. Backup
docker exec captains-log-db pg_dump -U captains_log_user captains_log > backup.sql

# 2. Pull/build new version
git pull origin main
./build.sh v1.1.0

# 3. Update services
docker-compose -f docker-compose.prod.yml up -d
```

See [DEPLOYMENT.md Monitoring and Maintenance](DEPLOYMENT.md#monitoring-and-maintenance) for full details.

## Troubleshooting

### Common Issues

**Build fails:**
- Check Docker daemon is running
- Ensure enough disk space: `docker system df`
- Clear build cache: `docker builder prune`

**Services won't start:**
- Check logs: `docker-compose -f docker-compose.prod.yml logs`
- Verify environment variables in `.env.production`
- Check port conflicts: `netstat -ano | findstr "5000 80 5432"`

**Frontend can't connect to backend:**
- Verify `VITE_API_URL` is correct
- Rebuild frontend: `./build.sh && docker-compose -f docker-compose.prod.yml up -d frontend`
- Check CORS settings in backend

See [DEPLOYMENT.md Troubleshooting](DEPLOYMENT.md#troubleshooting) for more solutions.

## Contributing

When contributing features that affect deployment:

1. Update [CHANGELOG.md](CHANGELOG.md) under `[Unreleased]`
2. Update [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) if applicable
3. Test both development and production builds
4. Update documentation if adding new environment variables or services

## Support

**Documentation:**
- [DEPLOYMENT.md](DEPLOYMENT.md) - Full deployment guide
- [QUICK_START_PRODUCTION.md](QUICK_START_PRODUCTION.md) - Quick start
- [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) - Release process
- [CLAUDE.md](CLAUDE.md) - Development guide

**Getting Help:**
1. Check the documentation above
2. Review logs: `docker-compose -f docker-compose.prod.yml logs`
3. Check [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for known issues
4. Open an issue on the project repository

## Roadmap

Future enhancements:

- [ ] Kubernetes manifests (for k8s deployments)
- [ ] Helm charts (for easier k8s management)
- [ ] Docker Swarm configuration (for multi-node deployments)
- [ ] Monitoring stack (Prometheus + Grafana)
- [ ] Log aggregation (ELK or Loki)
- [ ] Automated database migrations on container startup
- [ ] Blue-green deployment scripts
- [ ] Automated backup system

See [FEATURE_IDEAS.md](FEATURE_IDEAS.md) for all planned features.

## License

See project LICENSE file.

---

**Questions?** See the support section above or open an issue.
