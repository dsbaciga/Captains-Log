# Captain's Log - TrueNAS Scale Deployment Guide

This guide will help you deploy Captain's Log on TrueNAS Scale using Docker Compose.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [Dataset Structure](#dataset-structure)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Post-Deployment](#post-deployment)
- [Updating](#updating)
- [Backup and Restore](#backup-and-restore)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- TrueNAS Scale 22.12 or later
- Docker and Docker Compose enabled on TrueNAS
- At least 20GB free space for full US geocoding data (or 2GB for state-level data)
- Recommended: 4GB RAM minimum, 8GB for optimal performance

## Quick Start

For users familiar with TrueNAS Scale:

```bash
# 1. Create datasets
zfs create pool/captains-log
zfs create pool/captains-log/postgres
zfs create pool/captains-log/nominatim
zfs create pool/captains-log/uploads
zfs create pool/captains-log/logs

# 2. Clone/copy application files to a dataset
cd /mnt/pool/apps
git clone https://github.com/dsbaciga/Captains-Log.git captains-log
cd captains-log

# 3. Configure environment
cp .env.truenas.example .env
nano .env  # Edit with your settings

# 4. Deploy (migrations run automatically on startup)
docker-compose -f docker-compose.truenas.yml up -d

# 5. Verify deployment
docker logs -f captains-log-backend

# 6. Access application
# Frontend: http://your-truenas-ip:3000
# API: http://your-truenas-ip:5000
```

## Detailed Setup

### Step 1: Create Datasets

TrueNAS Scale uses ZFS datasets for storage management. Create dedicated datasets for Captain's Log data:

#### Using TrueNAS Web UI:

1. Navigate to **Storage** → **Pools**
2. Select your pool (e.g., `main-pool`)
3. Click **Add Dataset**
4. Create the following datasets:
   - **Name:** `captains-log` (parent)
     - **Type:** Generic
     - **Compression:** LZ4
   - **Name:** `captains-log/postgres`
     - **Type:** Generic
     - **Record Size:** 16K (optimal for PostgreSQL)
   - **Name:** `captains-log/nominatim`
     - **Type:** Generic
     - **Record Size:** 16K
   - **Name:** `captains-log/uploads`
     - **Type:** Generic
     - **Compression:** LZ4

#### Using CLI:

```bash
# SSH into TrueNAS as root
ssh admin@your-truenas-ip

# Replace 'pool' with your actual pool name
zfs create pool/captains-log
zfs create -o recordsize=16K pool/captains-log/postgres
zfs create -o recordsize=16K pool/captains-log/nominatim
zfs create pool/captains-log/uploads
zfs create pool/captains-log/logs

# Set permissions (adjust UID/GID based on container users)
chown -R 999:999 /mnt/pool/captains-log/postgres  # PostgreSQL
chown -R 999:999 /mnt/pool/captains-log/nominatim # Nominatim
chown -R 1000:1000 /mnt/pool/captains-log/uploads # Node.js app
chown -R 1000:1000 /mnt/pool/captains-log/logs    # Application logs
```

### Step 2: Prepare Application Files

You have two options for getting the application files onto TrueNAS:

#### Option A: Using Git (Recommended)

```bash
# Create apps directory if it doesn't exist
mkdir -p /mnt/pool/apps
cd /mnt/pool/apps

# Clone the repository
git clone https://github.com/dsbaciga/Captains-Log.git captains-log
cd captains-log
```

#### Option B: Manual Upload

1. Download the latest release from GitHub
2. Use the TrueNAS web interface or SCP to upload files
3. Extract to `/mnt/pool/apps/captains-log`

### Step 3: Pull or Build Docker Images

You have two options for getting the Docker images:

#### Option A: Use Docker Compose Build (Recommended for TrueNAS)

The docker-compose.truenas.yml file is configured to build images automatically with the correct configuration:

```bash
cd /mnt/pool/apps/captains-log

# Docker Compose will build images on first run
docker-compose -f docker-compose.truenas.yml up -d

# Or explicitly build first
docker-compose -f docker-compose.truenas.yml build
```

**Note:** The frontend uses a TrueNAS-specific configuration that proxies API requests through nginx, eliminating the need to hardcode your TrueNAS IP address.

#### Option B: Pull from GitHub Container Registry

If you prefer to use pre-built images:

```bash
docker pull ghcr.io/dsbaciga/captains-log-backend:latest

# Note: For frontend, use local build with TrueNAS proxy configuration
# The GHCR frontend image has hardcoded localhost URLs
```

#### Option C: Build Manually

```bash
cd /mnt/pool/apps/captains-log

# Build backend
docker build -f backend/Dockerfile.prod -t captains-log-backend:latest ./backend

# Build frontend with TrueNAS proxy config
docker build -f frontend/Dockerfile.truenas -t captains-log-frontend:latest ./frontend
```

### Step 4: Configure Environment Variables

```bash
cd /mnt/pool/apps/captains-log

# Copy the template
cp .env.truenas.example .env

# Edit with nano or vi
nano .env
```

**Critical settings to change:**

```env
# Update to match your pool/dataset structure
TRUENAS_DATASET_PATH=/mnt/YOUR-POOL-NAME/captains-log

# REQUIRED: Change these passwords and secrets!
DB_PASSWORD=your_secure_database_password
JWT_SECRET=your_secure_jwt_secret
JWT_REFRESH_SECRET=your_secure_refresh_secret

# Update to your TrueNAS IP address
VITE_API_URL=http://192.168.1.100:5000/api
VITE_UPLOAD_URL=http://192.168.1.100:5000/uploads
```

**Generate strong secrets:**

```bash
# Generate JWT secrets
openssl rand -base64 32  # Use for JWT_SECRET
openssl rand -base64 32  # Use for JWT_REFRESH_SECRET

# Generate database password
openssl rand -base64 24
```

### Step 5: Deploy the Application

```bash
cd /mnt/pool/apps/captains-log

# Start all services
docker-compose -f docker-compose.truenas.yml up -d

# View logs to monitor startup
docker-compose -f docker-compose.truenas.yml logs -f
```

**Expected startup sequence:**

1. **PostgreSQL** starts first (10-20 seconds)
2. **Backend** waits for database, runs health checks (20-30 seconds)
3. **Frontend** starts once backend is healthy (5-10 seconds)
4. **Nominatim** begins importing map data (1-2 hours for US, 5-15 minutes for states)

### Step 6: Verify Database Migrations

The backend automatically runs database migrations on startup via an entrypoint script. You can verify this by checking the logs:

```bash
# Check backend logs to see migration output
docker logs captains-log-backend

# You should see output like:
# "Starting Captain's Log Backend..."
# "Waiting for database to be ready..."
# "Database is ready!"
# "Running Prisma migrations..."
# "Starting application..."
```

If you need to manually run migrations (rare):

```bash
docker exec -it captains-log-backend npx prisma migrate deploy
```

### Step 7: Verify Deployment

Check that all services are running:

```bash
# Check container status
docker ps | grep captains-log

# Test backend health
curl http://localhost:5000/health

# Test frontend
curl http://localhost:3000
```

Access the application:
- **Frontend:** `http://your-truenas-ip:3000`
- **API Docs:** `http://your-truenas-ip:5000/api`

## Dataset Structure

Your final TrueNAS dataset structure should look like:

```
/mnt/pool/
├── captains-log/              # Data datasets
│   ├── postgres/              # PostgreSQL data (ZFS: recordsize=16K)
│   ├── nominatim/             # Nominatim geocoding data (ZFS: recordsize=16K)
│   ├── uploads/               # User uploaded photos
│   └── logs/                  # Application logs
└── apps/
    └── captains-log/          # Application files
        ├── backend/
        ├── frontend/
        ├── docker-compose.truenas.yml
        └── .env
```

## Configuration

### Port Configuration

Default ports (change in `.env` if needed):

- **3000** - Frontend web interface
- **5000** - Backend API
- **5432** - PostgreSQL (internal)
- **8080** - Nominatim geocoding service

### Resource Limits

The compose file includes resource limits. Adjust in `docker-compose.truenas.yml` based on your hardware:

```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'      # Maximum CPU cores
      memory: 2G       # Maximum RAM
    reservations:
      cpus: '0.5'      # Minimum guaranteed CPU
      memory: 512M     # Minimum guaranteed RAM
```

### Nominatim Region Selection

For faster setup, use a smaller geographic region:

**In `.env` file:**

```env
# California only (~500MB)
NOMINATIM_PBF_URL=https://download.geofabrik.de/north-america/us/california-latest.osm.pbf
NOMINATIM_REPLICATION_URL=https://download.geofabrik.de/north-america/us/california-updates/

# Or any other region from: https://download.geofabrik.de/
```

## Post-Deployment

### Create First User

1. Open `http://your-truenas-ip:3000` in a browser
2. Click "Register" to create your account
3. First registered user becomes the admin

### Configure Reverse Proxy (Optional)

If you want to access Captain's Log via HTTPS with a domain name, configure TrueNAS Scale's built-in nginx or use an external reverse proxy:

**Example nginx config (place in TrueNAS):**

```nginx
server {
    listen 443 ssl http2;
    server_name captains-log.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Uploads
    location /uploads {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
    }
}
```

### Enable Automatic Backups

Use TrueNAS ZFS snapshots for automatic backups:

```bash
# Create snapshot schedule via TrueNAS UI:
# Tasks → Periodic Snapshot Tasks
# - Dataset: pool/captains-log
# - Schedule: Daily at 2 AM
# - Retention: 7 days

# Or via CLI:
zfs snapshot -r pool/captains-log@$(date +%Y%m%d-%H%M%S)
```

## Updating

### Update to New Version

```bash
cd /mnt/pool/apps/captains-log

# Pull latest code (if using git)
git pull origin main

# Or pull new Docker images
docker pull ghcr.io/dsbaciga/captains-log-backend:v1.1.0
docker pull ghcr.io/dsbaciga/captains-log-frontend:v1.1.0

# Update .env with new version
nano .env
# Change: BACKEND_IMAGE=captains-log-backend:v1.1.0
# Change: FRONTEND_IMAGE=captains-log-frontend:v1.1.0

# Recreate containers with new images (migrations run automatically)
docker-compose -f docker-compose.truenas.yml up -d

# Watch logs to verify migration completed
docker logs -f captains-log-backend
```

### Rollback to Previous Version

```bash
# Stop containers
docker-compose -f docker-compose.truenas.yml down

# Restore from ZFS snapshot
zfs rollback pool/captains-log/postgres@backup-20250120

# Start with old version
# Update .env to old version number
docker-compose -f docker-compose.truenas.yml up -d
```

## Backup and Restore

### Manual Backup

```bash
# Create ZFS snapshot
zfs snapshot -r pool/captains-log@backup-$(date +%Y%m%d)

# Or export data
docker exec captains-log-backend npx prisma db push --force-reset
docker exec captains-log-db pg_dump -U captains_log_user captains_log > backup.sql

# Backup uploads
tar -czf uploads-backup.tar.gz /mnt/pool/captains-log/uploads/
```

### Restore from Backup

```bash
# Restore from ZFS snapshot
zfs rollback pool/captains-log@backup-20250120

# Or restore from SQL dump
docker exec -i captains-log-db psql -U captains_log_user captains_log < backup.sql

# Restart backend to run migrations on restored database
docker-compose -f docker-compose.truenas.yml restart backend

# Restore uploads
tar -xzf uploads-backup.tar.gz -C /
```

## Troubleshooting

### Services won't start

```bash
# Check logs
docker-compose -f docker-compose.truenas.yml logs

# Check specific service
docker logs captains-log-backend
docker logs captains-log-db

# Verify datasets exist and have correct permissions
ls -la /mnt/pool/captains-log/
```

### Database connection errors

```bash
# Verify database is running
docker exec captains-log-db pg_isready -U captains_log_user

# Check DATABASE_URL in .env matches db service credentials
docker exec captains-log-backend env | grep DATABASE_URL

# Reset database (WARNING: deletes all data)
docker-compose -f docker-compose.truenas.yml down
rm -rf /mnt/pool/captains-log/postgres/*
# Migrations run automatically on startup
docker-compose -f docker-compose.truenas.yml up -d
```

### Nominatim import stuck or slow

```bash
# Check Nominatim logs
docker logs captains-log-nominatim

# Reduce region size in .env (use state instead of country)
# Increase resources in docker-compose.truenas.yml:
#   cpus: '4.0'
#   memory: 8G

# Or skip Nominatim and use external service
# In .env: NOMINATIM_URL=https://nominatim.openstreetmap.org
# Remove nominatim service from docker-compose.truenas.yml
```

### High memory usage

```bash
# Check container resource usage
docker stats

# Reduce resource limits in docker-compose.truenas.yml
# Or increase ZFS ARC cache limits in TrueNAS:
# System Settings → Advanced → Kernel → Tunables
# vfs.zfs.arc_max = 8589934592  # 8GB in bytes
```

### Port conflicts

```bash
# Check what's using a port
netstat -tlnp | grep 3000

# Change ports in .env:
FRONTEND_PORT=8080
BACKEND_PORT=5001
```

### Permission errors on datasets

```bash
# Fix PostgreSQL permissions
chown -R 999:999 /mnt/pool/captains-log/postgres
chmod 700 /mnt/pool/captains-log/postgres

# Fix uploads permissions
chown -R 1000:1000 /mnt/pool/captains-log/uploads
chmod 755 /mnt/pool/captains-log/uploads
```

## Additional Resources

- [Captain's Log Documentation](DEPLOYMENT.md)
- [TrueNAS Scale Docker Documentation](https://www.truenas.com/docs/scale/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [ZFS Dataset Best Practices](https://openzfs.github.io/openzfs-docs/)

## Support

For issues specific to TrueNAS deployment:
- Check logs: `docker-compose -f docker-compose.truenas.yml logs`
- Verify dataset permissions
- Ensure adequate system resources

For application issues:
- GitHub Issues: https://github.com/dsbaciga/Captains-Log/issues
- Review [DEPLOYMENT.md](DEPLOYMENT.md) for general deployment guidance
