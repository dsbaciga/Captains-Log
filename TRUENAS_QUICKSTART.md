# Captain's Log - TrueNAS Quick Start

**Problem solved**: Frontend couldn't talk to backend due to missing nginx proxy configuration.

## Fastest Way to Deploy (5 minutes)

### Step 1: Enable SSH on TrueNAS

1. Open TrueNAS Web UI at `http://10.0.0.10` (or your TrueNAS IP)
2. Go to **System Settings** � **Services**
3. Find **SSH**, click pencil icon
4. Check **"Log in as Root with Password"**
5. Click **Save** and ensure SSH is **Started**

### Step 2: Copy docker-compose File

**Option A: Use the helper script (easiest)**

```powershell
# In PowerShell on your Windows machine
cd c:\Users\dsbac\Captains-Log

# Run the deployment helper
.\deploy-to-truenas.ps1 -TruenasIP 10.0.0.10
```

**Option B: Manual copy**

```powershell
# In PowerShell
cd c:\Users\dsbac\Captains-Log
scp docker-compose.truenas.yml root@10.0.0.10:/mnt/main_pool/captains-log/
```

### Step 3: Deploy on TrueNAS

```bash
# SSH into TrueNAS
ssh root@10.0.0.10

# Create directories
mkdir -p /mnt/main_pool/captains-log/{postgres,nominatim,uploads,logs}
chown -R 999:999 /mnt/main_pool/captains-log/postgres
chmod -R 755 /mnt/main_pool/captains-log

# Navigate to directory
cd /mnt/main_pool/captains-log

# Pull pre-built images
docker-compose -f docker-compose.truenas.yml pull

# Start services
docker-compose -f docker-compose.truenas.yml up -d

# Wait 30 seconds for services to start
sleep 30

# Run database migrations
docker exec captains-log-backend npx prisma migrate deploy
```

### Step 4: Access Your Application

Open your browser to: **http://10.0.0.10:30600**

That's it! You should now be able to use Captain's Log.

---

## Verification Commands

```bash
# Check all containers are running
docker ps | grep captains-log

# Check frontend has proxy config
docker exec captains-log-frontend cat /etc/nginx/conf.d/default.conf | grep proxy_pass

# Test backend from frontend
docker exec captains-log-frontend wget -qO- http://backend:5000/health

# View logs
docker logs captains-log-frontend
docker logs captains-log-backend
```

---

## What Was Fixed

The TrueNAS deployment now uses a special nginx configuration that:

1. Serves the React frontend
2. Proxies `/api/*` requests to the backend container via Docker networking
3. Proxies `/uploads/*` requests to the backend container
4. Supports configurable backend URL via environment variables

This means the frontend uses relative URLs and everything works seamlessly!

**Key files:**
- [nginx.truenas.conf](frontend/nginx.truenas.conf) - Nginx proxy configuration
- [Dockerfile.prod.truenas](frontend/Dockerfile.prod.truenas) - TrueNAS-specific frontend build
- [docker-compose.truenas.yml](docker-compose.truenas.yml) - TrueNAS deployment config

---

## Configuring Backend URL

By default, the frontend proxies to `backend:5000` (Docker internal networking). You can change this by editing the environment variables in `docker-compose.truenas.yml`:

```yaml
frontend:
  environment:
    BACKEND_HOST: backend      # Change to different hostname/IP
    BACKEND_PORT: 5000         # Change to different port
```

**Examples:**

**Use external backend:**
```yaml
environment:
  BACKEND_HOST: 10.0.0.20
  BACKEND_PORT: 8080
```

**Use different container name:**
```yaml
environment:
  BACKEND_HOST: my-custom-backend
  BACKEND_PORT: 5000
```

After changing these values, restart the frontend container:
```bash
docker-compose -f docker-compose.truenas.yml up -d frontend
```

---

## Troubleshooting

### SSH Permission Denied

If you get "Permission denied (publickey)" when trying to SSH:

1. Open TrueNAS Web UI
2. Go to **System Settings** � **Services** � **SSH** (pencil icon)
3. Check **"Log in as Root with Password"**
4. Save and try again

### Frontend Shows Network Error

Rebuild the frontend with the TrueNAS configuration:

```bash
ssh root@10.0.0.10
cd /mnt/main_pool/captains-log
docker-compose -f docker-compose.truenas.yml pull frontend
docker-compose -f docker-compose.truenas.yml up -d frontend
```

### Check Backend is Running

```bash
# Test directly
curl http://10.0.0.10:30601/health

# Or from frontend container
docker exec captains-log-frontend wget -qO- http://backend:5000/health
```

---

## Full Documentation

See [DEPLOYMENT_TRUENAS.md](DEPLOYMENT_TRUENAS.md) for complete deployment guide including:
- Three deployment methods
- SSH setup instructions
- Building custom images
- Security recommendations
- Performance optimization

---

## Ports

| Service    | Port  | Access                           |
|------------|-------|----------------------------------|
| Frontend   | 30600 | http://10.0.0.10:30600          |
| Backend    | 30601 | http://10.0.0.10:30601/health   |
| PostgreSQL | 30603 | For external DB tools           |
| Nominatim  | 30602 | For geocoding queries           |

---

## Updates

To update to a new version:

```bash
ssh root@10.0.0.10
cd /mnt/main_pool/captains-log

# Backup first
docker exec captains-log-db pg_dump -U captains_log_user captains_log > backup.sql

# Update
docker-compose -f docker-compose.truenas.yml pull
docker-compose -f docker-compose.truenas.yml up -d
docker exec captains-log-backend npx prisma migrate deploy
```
