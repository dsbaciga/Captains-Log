# Captain's Log - TrueNAS Scale Deployment Guide

This guide covers deploying Captain's Log on TrueNAS Scale using Docker Compose.

## The Issue and Solution

**Problem**: When deploying on TrueNAS with exposed ports (30600, 30601), the frontend cannot reach the backend because they're on different ports and Docker's internal networking isn't being used.

**Solution**: The TrueNAS deployment uses an nginx reverse proxy in the frontend container that forwards `/api` and `/uploads` requests to the backend container using Docker's internal networking.

## Architecture

```
User Browser (http://truenas-ip:30600)
         |
         v
Frontend Container (nginx on port 80)
         |
         +---> /api/*     --> backend:5000/api/*
         +---> /uploads/* --> backend:5000/uploads/*
         +---> /*         --> React SPA
```

This allows the frontend to use relative URLs (`/api`, `/uploads`) which are proxied to the backend container internally.

## Prerequisites

- TrueNAS Scale installed and configured
- Docker and Docker Compose support enabled
- At least 8GB RAM available (16GB recommended for Nominatim)
- 50GB+ disk space (Nominatim requires ~30GB for US map data)
- SSH access to TrueNAS (enabled in System Settings → Services → SSH)
- Git installed on TrueNAS (or ability to transfer files)

## Deployment Methods

There are three ways to deploy Captain's Log on TrueNAS:

**Method 1**: Use pre-built images from GitHub Container Registry (easiest, no code transfer needed)
**Method 2**: Clone the repository on TrueNAS and build locally
**Method 3**: Build on Windows and transfer deployment files only

Choose the method that best fits your workflow. We recommend **Method 1** for production deployments.

---

## Method 1: Use Pre-Built Images (Recommended)

This is the easiest method - no code transfer needed! You just need the docker-compose file.

### Step 1.1: Transfer docker-compose.truenas.yml to TrueNAS

**Option A: Using SCP from Windows PowerShell**
```powershell
# From your Windows machine where you have the code
cd c:\Users\dsbac\Captains-Log
scp docker-compose.truenas.yml root@YOUR-TRUENAS-IP:/mnt/main_pool/captains-log/
```

**Option B: Using TrueNAS Web UI**
1. Open TrueNAS web interface
2. Go to **Storage** → Browse your pool
3. Navigate to `/mnt/main_pool/captains-log/` (create if needed)
4. Click **Upload** and upload `docker-compose.truenas.yml`

**Option C: Copy/Paste via SSH**
```bash
# SSH into TrueNAS
ssh root@YOUR-TRUENAS-IP

# Create directory
mkdir -p /mnt/main_pool/captains-log

# Create file with nano or vi
nano /mnt/main_pool/captains-log/docker-compose.truenas.yml
# Paste the contents, save with Ctrl+X, Y, Enter
```

### Step 1.2: Create datasets (if not already done)

```bash
# SSH into TrueNAS
ssh root@YOUR-TRUENAS-IP

# Create directories
mkdir -p /mnt/main_pool/captains-log/postgres
mkdir -p /mnt/main_pool/captains-log/nominatim
mkdir -p /mnt/main_pool/captains-log/uploads
mkdir -p /mnt/main_pool/captains-log/logs

# Set permissions
chown -R 999:999 /mnt/main_pool/captains-log/postgres
chmod -R 755 /mnt/main_pool/captains-log
```

### Step 1.3: Pull and start services

```bash
cd /mnt/main_pool/captains-log

# Pull the latest images from GitHub Container Registry
docker-compose -f docker-compose.truenas.yml pull

# Start all services
docker-compose -f docker-compose.truenas.yml up -d

# Wait 30 seconds for services to initialize, then run migrations
sleep 30
docker exec captains-log-backend npx prisma migrate deploy
```

### Step 1.4: Access your application

Open your browser to: `http://YOUR-TRUENAS-IP:30600`

**That's it!** Skip to the [Verification](#verification) section.

---

## Method 2: Clone Repository on TrueNAS

This method clones the git repository directly on TrueNAS and builds images locally.

### Step 2.1: Install Git on TrueNAS (if needed)

```bash
# SSH into TrueNAS
ssh root@YOUR-TRUENAS-IP

# Check if git is installed
which git

# If not installed, you may need to install it
# For TrueNAS Scale (Debian-based):
apt update && apt install -y git
```

### Step 2.2: Clone the repository

```bash
# Navigate to your deployment location
cd /mnt/main_pool

# Clone the repository
git clone https://github.com/YOUR-USERNAME/Captains-Log.git captains-log

cd captains-log
```

### Step 2.3: Create datasets

```bash
mkdir -p /mnt/main_pool/captains-log/postgres
mkdir -p /mnt/main_pool/captains-log/nominatim
mkdir -p /mnt/main_pool/captains-log/uploads
mkdir -p /mnt/main_pool/captains-log/logs

chown -R 999:999 /mnt/main_pool/captains-log/postgres
chmod -R 755 /mnt/main_pool/captains-log
```

### Step 2.4: Build and start

```bash
cd /mnt/main_pool/captains-log

# Build images locally
docker build -f backend/Dockerfile.prod -t captains-log-backend:latest ./backend
docker build -f frontend/Dockerfile.prod.truenas -t captains-log-frontend:latest ./frontend

# Update docker-compose.truenas.yml to use local images
# Change:
#   image: ghcr.io/dsbaciga/captains-log-backend:latest
# To:
#   image: captains-log-backend:latest

# Start services
docker-compose -f docker-compose.truenas.yml up -d

# Run migrations
docker exec captains-log-backend npx prisma migrate deploy
```

---

## Method 3: Build on Windows, Deploy to TrueNAS

This method builds images on your Windows machine, pushes to a registry, then pulls on TrueNAS.

### Step 3.1: Build images on Windows

```powershell
# On your Windows machine
cd c:\Users\dsbac\Captains-Log

# Set registry (use your GitHub username or Docker Hub username)
$env:DOCKER_REGISTRY = "ghcr.io/dsbaciga"

# Build TrueNAS-optimized images
.\build.truenas.ps1 -Version latest -Registry $env:DOCKER_REGISTRY

# Login to GitHub Container Registry
docker login ghcr.io
# Username: your-github-username
# Password: your personal access token (not your GitHub password!)

# Push images
docker push ghcr.io/dsbaciga/captains-log-backend:latest
docker push ghcr.io/dsbaciga/captains-log-frontend:latest
```

**Creating a GitHub Personal Access Token:**
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token
3. Select scopes: `write:packages`, `read:packages`, `delete:packages`
4. Copy the token and use it as your password when running `docker login ghcr.io`

### Step 3.2: Update docker-compose.truenas.yml

Make sure your `docker-compose.truenas.yml` references your registry:

```yaml
services:
  backend:
    image: ghcr.io/dsbaciga/captains-log-backend:latest
  frontend:
    image: ghcr.io/dsbaciga/captains-log-frontend:latest
```

### Step 3.3: Transfer and deploy

```powershell
# Transfer docker-compose file from Windows
scp docker-compose.truenas.yml root@YOUR-TRUENAS-IP:/mnt/main_pool/captains-log/
```

```bash
# On TrueNAS
ssh root@YOUR-TRUENAS-IP

cd /mnt/main_pool/captains-log

# Create datasets (if not already done)
mkdir -p postgres nominatim uploads logs
chown -R 999:999 postgres
chmod -R 755 .

# Pull and start
docker-compose -f docker-compose.truenas.yml pull
docker-compose -f docker-compose.truenas.yml up -d

# Run migrations
docker exec captains-log-backend npx prisma migrate deploy
```

---

## Quick Fix for Existing Deployment

If you already have Captain's Log deployed on TrueNAS and it's not working:

1. **Pull the updated frontend image** (once you rebuild and push it):
   ```bash
   cd /mnt/main_pool/captains-log
   docker-compose -f docker-compose.truenas.yml pull frontend
   docker-compose -f docker-compose.truenas.yml up -d frontend
   ```

2. **Or rebuild locally** (if you have the source on TrueNAS):
   ```bash
   cd /mnt/main_pool/captains-log
   docker build -f frontend/Dockerfile.prod.truenas -t captains-log-frontend:latest ./frontend
   docker-compose -f docker-compose.truenas.yml up -d frontend
   ```

---

## Verification

After deployment, verify everything is working:

```bash
# Check all containers are running
docker ps | grep captains-log

# You should see 4 containers:
# - captains-log-frontend
# - captains-log-backend
# - captains-log-db
# - captains-log-nominatim

# Check frontend nginx config includes proxy
docker exec captains-log-frontend cat /etc/nginx/conf.d/default.conf | grep proxy_pass

# Test backend health
docker exec captains-log-frontend wget -qO- http://backend:5000/health

# Check backend logs
docker logs captains-log-backend --tail 50
```

**Access the application**: `http://YOUR-TRUENAS-IP:30600`

---

## Configuring Backend URL

The frontend uses nginx to proxy API requests to the backend. By default, it connects to `backend:5000` using Docker's internal networking. You can customize this by editing environment variables in `docker-compose.truenas.yml`.

### Default Configuration

```yaml
frontend:
  environment:
    BACKEND_HOST: backend    # Docker service name
    BACKEND_PORT: 5000       # Backend port
```

### Use Cases

**1. Connect to external backend server:**

If your backend is running on a different machine or network:

```yaml
frontend:
  environment:
    BACKEND_HOST: 10.0.0.20
    BACKEND_PORT: 5000
```

**2. Use different container name:**

If you renamed the backend service:

```yaml
frontend:
  environment:
    BACKEND_HOST: captains-log-api
    BACKEND_PORT: 5000
```

**3. Connect via hostname:**

If using custom DNS or hostname resolution:

```yaml
frontend:
  environment:
    BACKEND_HOST: api.captains-log.local
    BACKEND_PORT: 8080
```

### Apply Changes

After modifying the environment variables:

```bash
# Restart just the frontend container
docker-compose -f docker-compose.truenas.yml up -d frontend

# Verify the new configuration
docker exec captains-log-frontend cat /etc/nginx/conf.d/default.conf | grep proxy_pass
```

You should see:
```
proxy_pass http://YOUR_BACKEND_HOST:YOUR_BACKEND_PORT/api/;
proxy_pass http://YOUR_BACKEND_HOST:YOUR_BACKEND_PORT/uploads/;
```

### Troubleshooting Backend Connection

If the frontend can't reach the backend after changing these values:

```bash
# Test from frontend container
docker exec captains-log-frontend wget -qO- http://YOUR_BACKEND_HOST:YOUR_BACKEND_PORT/health

# Check nginx error logs
docker logs captains-log-frontend | grep error

# Verify environment variables are set
docker exec captains-log-frontend env | grep BACKEND
```

---

## Enabling SSH Access to TrueNAS

If you get "Permission denied (publickey)" when trying to SSH:

### Option 1: Enable Password Authentication (Easier)

1. Open TrueNAS Web UI
2. Go to **System Settings** → **Services**
3. Find **SSH** service and click the pencil icon to configure
4. Check **"Log in as Root with Password"**
5. Click **Save**
6. Make sure SSH service is **Started**

Now you can SSH with password:
```powershell
ssh root@YOUR-TRUENAS-IP
# Enter your root password when prompted
```

### Option 2: Use SSH Key (More Secure)

**Generate SSH key on Windows (if you don't have one):**
```powershell
# In PowerShell
ssh-keygen -t ed25519 -C "your-email@example.com"
# Press Enter to accept default location
# Enter a passphrase (or leave empty)
```

**Copy your public key to TrueNAS:**

1. Open TrueNAS Web UI
2. Go to **Credentials** → **Local Users**
3. Click on **root** user
4. Scroll to **SSH Public Key** section
5. Paste your public key (from `C:\Users\dsbac\.ssh\id_ed25519.pub`)
6. Click **Save**

Or use the TrueNAS Shell directly:
```bash
# In TrueNAS Web UI, go to System Settings → Shell
# Then run:
mkdir -p /root/.ssh
chmod 700 /root/.ssh
# Paste your public key into authorized_keys
nano /root/.ssh/authorized_keys
# Paste key, save with Ctrl+X, Y, Enter
chmod 600 /root/.ssh/authorized_keys
```

Now test SSH connection:
```powershell
ssh root@YOUR-TRUENAS-IP
```

### Option 3: Use TrueNAS Web Shell

If you can't get SSH working, you can use the TrueNAS web interface:

1. Open TrueNAS Web UI
2. Go to **System Settings** → **Shell**
3. This gives you a terminal in the browser
4. Run all commands directly here

---

### Step 3: Configure docker-compose.truenas.yml

Update the image references:

```yaml
services:
  backend:
    image: ghcr.io/yourusername/captains-log-backend:latest
  frontend:
    image: ghcr.io/yourusername/captains-log-frontend:latest
```

### Step 4: Deploy on TrueNAS

```bash
# SSH into TrueNAS
ssh root@truenas-ip

cd /mnt/main_pool/captains-log

# Pull images
docker-compose -f docker-compose.truenas.yml pull

# Start services
docker-compose -f docker-compose.truenas.yml up -d

# Run migrations
docker exec captains-log-backend npx prisma migrate deploy
```

### Step 5: Access Application

- **Frontend**: http://truenas-ip:30600
- **Backend API**: http://truenas-ip:30601/health (verify it's running)

## How the Nginx Proxy Works

The TrueNAS frontend uses [nginx.truenas.conf](frontend/nginx.truenas.conf) which includes:

```nginx
# Proxy API requests to backend container
location /api/ {
    proxy_pass http://backend:5000/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    # ... other headers
}

# Proxy upload requests to backend container
location /uploads/ {
    proxy_pass http://backend:5000/uploads/;
    # ... caching configuration
}
```

This means:
- User requests `http://truenas-ip:30600/api/trips`
- Nginx proxies to `http://backend:5000/api/trips` (internal Docker network)
- Backend responds through the proxy
- User sees seamless communication

## Troubleshooting

### Verify Nginx Configuration

Check that the frontend container has the correct nginx config:

```bash
docker exec captains-log-frontend cat /etc/nginx/conf.d/default.conf | grep proxy_pass
```

You should see:
```
proxy_pass http://backend:5000/api/;
proxy_pass http://backend:5000/uploads/;
```

### Test Backend Connectivity

From the frontend container:

```bash
# Should return "OK" or health status
docker exec captains-log-frontend wget -qO- http://backend:5000/health
```

### Check Container Networking

```bash
# All containers should be on the same network
docker network inspect bridge | grep captains-log

# Or check the default network
docker network inspect captains-log_default
```

### View Logs

```bash
# Frontend logs (nginx access logs)
docker logs captains-log-frontend

# Backend logs
docker logs captains-log-backend

# All services
docker-compose -f docker-compose.truenas.yml logs -f
```

### Common Issues

**Issue**: Frontend shows "Network Error" or cannot connect to API

**Solution**:
1. Verify frontend image was built with `Dockerfile.prod.truenas`
2. Check nginx config includes proxy rules
3. Verify backend container is running and healthy
4. Test backend directly: `curl http://truenas-ip:30601/health`

**Issue**: Images not found when pulling

**Solution**:
1. Make sure you pushed images to registry: `docker push ghcr.io/yourusername/captains-log-frontend:latest`
2. Update image references in docker-compose.truenas.yml
3. Login to registry on TrueNAS: `docker login ghcr.io`

## Port Configuration

| Service    | Internal Port | External Port | Purpose                    |
|------------|---------------|---------------|----------------------------|
| Frontend   | 80            | 30600         | Web UI                     |
| Backend    | 5000          | 30601         | API (optional direct access)|
| Nominatim  | 8080          | 30602         | Geocoding service          |
| PostgreSQL | 5432          | 30603         | Database                   |

## Security Recommendations

1. **Change default passwords** in docker-compose.truenas.yml
2. **Use strong JWT secrets** (32+ characters)
3. **Close external ports** if not needed (only expose 30600 for frontend)
4. **Use HTTPS** with a reverse proxy (Traefik, nginx proxy manager, etc.)
5. **Enable TrueNAS firewall** rules

## Updating the Application

```bash
cd /mnt/main_pool/captains-log

# Backup first
docker exec captains-log-db pg_dump -U captains_log_user captains_log > backup.sql

# Pull new images
docker-compose -f docker-compose.truenas.yml pull

# Recreate containers
docker-compose -f docker-compose.truenas.yml up -d

# Run migrations
docker exec captains-log-backend npx prisma migrate deploy
```

## Files Reference

- [docker-compose.truenas.yml](docker-compose.truenas.yml) - TrueNAS deployment configuration
- [frontend/nginx.truenas.conf](frontend/nginx.truenas.conf) - Nginx reverse proxy config
- [frontend/Dockerfile.prod.truenas](frontend/Dockerfile.prod.truenas) - TrueNAS-specific frontend build
- [build.truenas.ps1](build.truenas.ps1) - Build script for Windows
