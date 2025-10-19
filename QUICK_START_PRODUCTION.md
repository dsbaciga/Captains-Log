# Captain's Log - Production Quick Start

Get Captain's Log running in production in under 10 minutes.

## Prerequisites

- Docker and Docker Compose installed
- 4GB+ RAM available
- 10GB+ disk space

## Step 1: Get the Code

```bash
git clone <repository-url>
cd Captains-Log
```

## Step 2: Configure Environment

```bash
# Copy example environment file
cp .env.production.example .env.production
```

**Edit `.env.production` and set these critical values:**

```env
# Database
DB_PASSWORD=<generate-strong-password>

# JWT Secrets (use 32+ character random strings)
JWT_SECRET=<generate-random-secret>
JWT_REFRESH_SECRET=<generate-different-random-secret>

# API URLs (replace with your domain)
VITE_API_URL=http://your-domain.com:5000/api
VITE_UPLOAD_URL=http://your-domain.com:5000/uploads
```

**Generate secure secrets:**

```bash
# Linux/Mac
openssl rand -hex 32

# Windows PowerShell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

## Step 3: Build Images

**Linux/Mac:**
```bash
chmod +x build.sh
./build.sh v1.0.0
```

**Windows:**
```powershell
.\build.ps1 -Version v1.0.0
```

## Step 4: Start Services

```bash
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
```

**Note:** Nominatim will take 1-2 hours to initialize on first run (downloads US map data).

## Step 5: Initialize Database

```bash
# Run database migrations
docker exec captains-log-backend npx prisma migrate deploy
```

## Step 6: Access Application

- **Frontend**: http://localhost (or http://your-domain.com)
- **Backend API**: http://localhost:5000

## Verify Installation

```bash
# Check all containers are running
docker ps

# Check health
curl http://localhost:5000/health
curl http://localhost/health

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

## What's Running?

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 80 | React app served by nginx |
| Backend | 5000 | Express API server |
| Database | 5432 | PostgreSQL with PostGIS |
| Nominatim | 8080 | Geocoding service |

## Next Steps

### Add HTTPS (Recommended)

Use a reverse proxy like nginx or Traefik with Let's Encrypt. See [DEPLOYMENT.md](DEPLOYMENT.md#option-4-behind-reverse-proxy-nginxtraefik) for details.

### Set Up Backups

```bash
# Daily database backup (add to crontab)
0 2 * * * docker exec captains-log-db pg_dump -U captains_log_user captains_log > /backups/captains-log-$(date +\%Y\%m\%d).sql
```

### Monitor Services

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Check resource usage
docker stats

# Check disk usage
docker system df
```

## Common Issues

### Backend won't start
```bash
# Check logs
docker logs captains-log-backend

# Common fix: Rebuild with correct DATABASE_URL
./build.sh
docker-compose -f docker-compose.prod.yml up -d
```

### Frontend can't connect to backend
- Verify `VITE_API_URL` matches your backend URL
- Check CORS settings in backend
- Rebuild frontend: `./build.sh && docker-compose -f docker-compose.prod.yml up -d frontend`

### Database connection failed
```bash
# Test database connection
docker exec -it captains-log-db psql -U captains_log_user -d captains_log
```

### Nominatim not responding
- First initialization takes 1-2 hours
- Check progress: `docker logs captains-log-nominatim`
- Use smaller dataset for faster init (see DEPLOYMENT.md)

## Stopping Services

```bash
# Stop all services (data preserved in volumes)
docker-compose -f docker-compose.prod.yml down

# Stop and remove volumes (⚠️ DELETES ALL DATA)
docker-compose -f docker-compose.prod.yml down -v
```

## Updating to New Version

```bash
# 1. Backup database
docker exec captains-log-db pg_dump -U captains_log_user captains_log > backup.sql

# 2. Pull new code
git pull origin main

# 3. Rebuild images
./build.sh v1.1.0

# 4. Run migrations
docker exec captains-log-backend npx prisma migrate deploy

# 5. Restart services
docker-compose -f docker-compose.prod.yml up -d
```

## Getting Help

- **Full Documentation**: See [DEPLOYMENT.md](DEPLOYMENT.md)
- **Release Process**: See [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md)
- **Known Issues**: See [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)
- **Logs**: Always check `docker-compose -f docker-compose.prod.yml logs` first

## Production Checklist

Before going live:

- [ ] Changed all default passwords and secrets
- [ ] Set up HTTPS with valid SSL certificate
- [ ] Configured automated database backups
- [ ] Restricted database port (5432) to localhost only
- [ ] Set up log rotation
- [ ] Configured firewall rules
- [ ] Tested backup and restore procedure
- [ ] Set up monitoring/alerting
- [ ] Documented your specific configuration

## Environment Variables Reference

**Required:**
- `DB_PASSWORD` - Database password
- `JWT_SECRET` - Access token secret (32+ chars)
- `JWT_REFRESH_SECRET` - Refresh token secret (32+ chars)
- `VITE_API_URL` - Public API URL
- `VITE_UPLOAD_URL` - Public uploads URL

**Optional:**
- `IMMICH_API_URL` + `IMMICH_API_KEY` - Connect to Immich photos
- `OPENWEATHERMAP_API_KEY` - Enable weather data
- `AVIATIONSTACK_API_KEY` - Enable flight tracking
- `NOMINATIM_PBF_URL` - Custom map data (default: US)

See [.env.production.example](.env.production.example) for full list.
