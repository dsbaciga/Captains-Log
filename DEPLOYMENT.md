# Captain's Log - Production Deployment Guide

This guide covers building and deploying Captain's Log in production environments.

## Table of Contents

- [Quick Start](#quick-start)
- [Production Build](#production-build)
- [Deployment Options](#deployment-options)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Security Considerations](#security-considerations)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- At least 4GB RAM available
- 10GB+ disk space (more for Nominatim data)

### 1. Clone and Configure

```bash
git clone <repository-url>
cd Captains-Log

# Copy and edit production environment file
cp .env.production.example .env.production
# Edit .env.production with your configuration
```

### 2. Configure Environment Variables

Edit `.env.production` and set at minimum:

```env
DB_PASSWORD=<strong-password>
JWT_SECRET=<strong-random-secret-at-least-32-chars>
JWT_REFRESH_SECRET=<different-strong-random-secret>
VITE_API_URL=http://your-domain.com:5000/api
VITE_UPLOAD_URL=http://your-domain.com:5000/uploads
```

**Generate secure secrets:**
```bash
# Linux/Mac
openssl rand -hex 32

# PowerShell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

### 3. Build Production Images

**Linux/Mac:**
```bash
chmod +x build.sh
./build.sh v1.0.0
```

**Windows:**
```powershell
.\build.ps1 -Version v1.0.0
```

### 4. Start Application

```bash
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
```

### 5. Initialize Database

```bash
# Run migrations
docker exec captains-log-backend npx prisma migrate deploy

# (Optional) Seed initial data if you have seed scripts
docker exec captains-log-backend npx prisma db seed
```

### 6. Access Application

- **Frontend**: http://localhost (or http://your-domain.com)
- **Backend API**: http://localhost:5000 (or http://your-domain.com:5000)

## Production Build

### Build Architecture

The production build uses multi-stage Docker builds for optimization:

#### Backend Build
- **Stage 1 (Builder)**: Compiles TypeScript, generates Prisma client
- **Stage 2 (Production)**: Runs compiled JS with production dependencies only
- **Result**: Smaller image (~200MB vs ~500MB dev)

#### Frontend Build
- **Stage 1 (Builder)**: Builds React app with Vite
- **Stage 2 (Production)**: Serves static files with nginx
- **Result**: Optimized static assets with gzip compression

### Build Scripts

Both `build.sh` (bash) and `build.ps1` (PowerShell) are provided:

```bash
# Basic build
./build.sh

# Build with version tag
./build.sh v1.0.0

# Build with custom registry
DOCKER_REGISTRY=registry.example.com/ ./build.sh v1.0.0
```

### Manual Build

If you prefer manual control:

```bash
# Backend
docker build -f backend/Dockerfile.prod -t captains-log-backend:v1.0.0 ./backend

# Frontend (with build args)
docker build -f frontend/Dockerfile.prod \
  --build-arg VITE_API_URL=http://your-domain.com:5000/api \
  --build-arg VITE_UPLOAD_URL=http://your-domain.com:5000/uploads \
  -t captains-log-frontend:v1.0.0 \
  ./frontend
```

## Deployment Options

### Option 1: Single Server with Docker Compose (Recommended)

Best for small to medium deployments.

```bash
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
```

**Pros**: Simple, all-in-one solution
**Cons**: Single point of failure, limited scaling

### Option 2: Separate Database Server

For better performance and scalability:

1. Set up PostgreSQL with PostGIS on separate server
2. Update `DATABASE_URL` in `.env.production`
3. Remove `db` service from docker-compose.prod.yml
4. Deploy backend and frontend containers

### Option 3: Cloud Deployment

#### Docker Hub / Container Registry

```bash
# Tag images
docker tag captains-log-backend:latest your-registry/captains-log-backend:v1.0.0
docker tag captains-log-frontend:latest your-registry/captains-log-frontend:v1.0.0

# Push to registry
docker push your-registry/captains-log-backend:v1.0.0
docker push your-registry/captains-log-frontend:v1.0.0
```

#### Deploy to Cloud Platforms

- **AWS ECS**: Use Docker images with ECS task definitions
- **Google Cloud Run**: Deploy containerized services
- **Azure Container Instances**: Run containers without orchestration
- **DigitalOcean App Platform**: Connect to Docker registry

### Option 4: Behind Reverse Proxy (Nginx/Traefik)

For HTTPS and better routing:

**Example Nginx Configuration:**
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Upload files
    location /uploads {
        proxy_pass http://localhost:5000;
    }
}
```

## Configuration

### Environment Variables

See [.env.production.example](.env.production.example) for all options.

**Critical Variables:**
- `DB_PASSWORD`: Strong database password
- `JWT_SECRET`: Secret for access tokens (32+ chars)
- `JWT_REFRESH_SECRET`: Secret for refresh tokens (32+ chars, different from JWT_SECRET)
- `VITE_API_URL`: Public URL for API access
- `VITE_UPLOAD_URL`: Public URL for uploaded files

**Optional Services:**
- `IMMICH_API_URL` + `IMMICH_API_KEY`: Connect to Immich photo library
- `OPENWEATHERMAP_API_KEY`: Enable weather data
- `AVIATIONSTACK_API_KEY`: Enable flight tracking

### Port Configuration

Default ports can be changed via environment variables:

```env
FRONTEND_PORT=80      # Frontend nginx server
BACKEND_PORT=5000     # Backend API
DB_PORT=5432          # PostgreSQL
NOMINATIM_PORT=8080   # Geocoding service
```

### Nominatim Configuration

Nominatim downloads and imports OpenStreetMap data on first run:

- **Default**: US map data (~8GB download, 1-2 hours initialization)
- **Customize**: Change `NOMINATIM_PBF_URL` for different regions
- **Smaller datasets**: Use city or state-level data from [Geofabrik](https://download.geofabrik.de/)

**Example - California only:**
```env
NOMINATIM_PBF_URL=https://download.geofabrik.de/north-america/us/california-latest.osm.pbf
NOMINATIM_REPLICATION_URL=https://download.geofabrik.de/north-america/us/california-updates/
```

## Database Setup

### Initial Migration

On first deployment, run migrations:

```bash
docker exec captains-log-backend npx prisma migrate deploy
```

### Backup Strategy

**Automated Backups:**
```bash
# Add to crontab (daily at 2 AM)
0 2 * * * docker exec captains-log-db pg_dump -U captains_log_user captains_log > /backups/captains-log-$(date +\%Y\%m\%d).sql
```

**Manual Backup:**
```bash
docker exec captains-log-db pg_dump -U captains_log_user captains_log > backup.sql
```

**Restore:**
```bash
docker exec -i captains-log-db psql -U captains_log_user captains_log < backup.sql
```

### Database Migrations on Updates

When deploying new versions with schema changes:

```bash
# Stop backend
docker-compose -f docker-compose.prod.yml stop backend

# Backup database
docker exec captains-log-db pg_dump -U captains_log_user captains_log > pre-migration-backup.sql

# Pull/build new version
docker-compose -f docker-compose.prod.yml pull backend
# or rebuild if using local images

# Run migrations
docker-compose -f docker-compose.prod.yml run --rm backend npx prisma migrate deploy

# Start backend
docker-compose -f docker-compose.prod.yml up -d backend
```

## Security Considerations

### Essential Security Steps

1. **Change Default Secrets**: Never use example secrets in production
2. **Strong Passwords**: Use 32+ character random strings for JWT secrets
3. **Firewall**: Restrict database port (5432) to localhost only
4. **HTTPS**: Always use HTTPS in production (reverse proxy with SSL)
5. **Updates**: Regularly update Docker images and dependencies

### Recommended Security Enhancements

```env
# In .env.production

# Limit database access to backend container only
# Remove DB_PORT mapping from docker-compose.prod.yml

# Use Docker secrets for sensitive values (Docker Swarm/Kubernetes)
```

### File Upload Security

- Backend validates file types and sizes
- Files stored in Docker volume with restricted permissions
- Consider adding virus scanning for user uploads

### API Rate Limiting

Backend includes rate limiting via `express-rate-limit`. Adjust in [backend/src/index.ts](backend/src/index.ts) if needed.

## Monitoring and Maintenance

### Health Checks

All services include health checks:

```bash
# Check container health
docker ps

# View logs
docker logs captains-log-backend
docker logs captains-log-frontend
docker logs captains-log-db
```

### Log Management

**View Logs:**
```bash
# Follow logs
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend
```

**Log Rotation:**
Configure Docker daemon to rotate logs in `/etc/docker/daemon.json`:
```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

### Resource Monitoring

```bash
# Container resource usage
docker stats

# Disk usage
docker system df
```

### Updates and Maintenance

**Update Application:**
```bash
# Pull new images (if using registry)
docker-compose -f docker-compose.prod.yml pull

# Or rebuild locally
./build.sh v1.1.0

# Restart with new images
docker-compose -f docker-compose.prod.yml up -d
```

**Clean Up Old Images:**
```bash
docker image prune -a
```

## Troubleshooting

### Backend Won't Start

**Check logs:**
```bash
docker logs captains-log-backend
```

**Common issues:**
- Database connection failed: Check `DATABASE_URL` and db health
- Prisma Client not generated: Rebuild image
- Port already in use: Change `BACKEND_PORT`

### Frontend Can't Connect to Backend

**Check:**
1. `VITE_API_URL` matches your backend URL
2. CORS configuration in backend allows your domain
3. Backend is healthy: `curl http://localhost:5000/health`

**Rebuild frontend with correct URLs:**
```bash
./build.sh v1.0.0
docker-compose -f docker-compose.prod.yml up -d frontend
```

### Database Connection Issues

**Test connection:**
```bash
docker exec -it captains-log-db psql -U captains_log_user -d captains_log
```

**Reset database (⚠️ DELETES ALL DATA):**
```bash
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d
```

### Nominatim Not Working

- Check if initialization is complete: `docker logs captains-log-nominatim`
- First run takes 1-2 hours for US data
- Test: `curl http://localhost:8080/search?q=San+Francisco&format=json`

### Out of Disk Space

**Check usage:**
```bash
docker system df
```

**Clean up:**
```bash
# Remove unused containers, networks, images
docker system prune

# Remove volumes (⚠️ includes database data!)
docker system prune -a --volumes
```

### Performance Issues

**Scale backend containers:**
```bash
# Add more backend replicas (requires load balancer)
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

**Optimize database:**
```bash
# Vacuum and analyze
docker exec captains-log-db psql -U captains_log_user -d captains_log -c "VACUUM ANALYZE;"
```

## Support

For issues or questions:
- Check logs first: `docker-compose -f docker-compose.prod.yml logs`
- Review [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for known issues
- Open an issue on the project repository

## Next Steps

- Set up automated backups
- Configure HTTPS with Let's Encrypt
- Set up monitoring (Prometheus + Grafana)
- Configure log aggregation (ELK stack or similar)
- Set up CI/CD pipeline for automated deployments
