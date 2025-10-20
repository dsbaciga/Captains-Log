# Captain's Log - TrueNAS Quick Reference

## Initial Setup Commands

```bash
# 1. Create datasets
zfs create pool/captains-log
zfs create -o recordsize=16K pool/captains-log/postgres
zfs create -o recordsize=16K pool/captains-log/nominatim
zfs create pool/captains-log/uploads
zfs create pool/captains-log/logs

# 2. Set permissions
chown -R 999:999 /mnt/pool/captains-log/postgres
chown -R 999:999 /mnt/pool/captains-log/nominatim
chown -R 1000:1000 /mnt/pool/captains-log/uploads
chown -R 1000:1000 /mnt/pool/captains-log/logs

# 3. Clone application
cd /mnt/pool/apps
git clone https://github.com/dsbaciga/Captains-Log.git captains-log
cd captains-log

# 4. Configure
cp .env.truenas.example .env
nano .env  # Edit: TRUENAS_DATASET_PATH, DB_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET

# 5. Deploy (migrations run automatically on startup)
docker-compose -f docker-compose.truenas.yml up -d

# 6. Verify deployment
docker logs -f captains-log-backend
```

## Common Commands

```bash
# Start all services
docker-compose -f docker-compose.truenas.yml up -d

# Stop all services
docker-compose -f docker-compose.truenas.yml down

# View logs (all services)
docker-compose -f docker-compose.truenas.yml logs -f

# View logs (specific service)
docker logs -f captains-log-backend

# Restart a service
docker-compose -f docker-compose.truenas.yml restart backend

# Check service status
docker-compose -f docker-compose.truenas.yml ps

# Update to new version
docker-compose -f docker-compose.truenas.yml pull
docker-compose -f docker-compose.truenas.yml up -d

# Manually run database migrations (rarely needed - runs automatically on startup)
docker exec -it captains-log-backend npx prisma migrate deploy

# Access database directly
docker exec -it captains-log-db psql -U captains_log_user captains_log
```

## Backup & Restore

```bash
# Create snapshot
zfs snapshot -r pool/captains-log@backup-$(date +%Y%m%d)

# List snapshots
zfs list -t snapshot -r pool/captains-log

# Restore from snapshot
docker-compose -f docker-compose.truenas.yml down
zfs rollback pool/captains-log@backup-20250120
docker-compose -f docker-compose.truenas.yml up -d

# Export database
docker exec captains-log-db pg_dump -U captains_log_user captains_log > backup.sql

# Import database
docker exec -i captains-log-db psql -U captains_log_user captains_log < backup.sql
```

## Troubleshooting

```bash
# Check container health
docker ps
docker stats

# Restart all services
docker-compose -f docker-compose.truenas.yml restart

# Rebuild and restart
docker-compose -f docker-compose.truenas.yml up -d --force-recreate

# Check disk usage
df -h /mnt/pool/captains-log/*

# Check permissions
ls -la /mnt/pool/captains-log/

# Check port conflicts
netstat -tlnp | grep -E '3000|5000|5432|8080'

# View container resource usage
docker stats captains-log-backend
```

## URLs

- **Frontend:** http://your-truenas-ip:3000
- **Backend API:** http://your-truenas-ip:5000
- **Health Check:** http://your-truenas-ip:5000/health
- **Nominatim:** http://your-truenas-ip:8080

## Important Paths

- **Application:** `/mnt/pool/apps/captains-log`
- **Postgres Data:** `/mnt/pool/captains-log/postgres`
- **Uploads:** `/mnt/pool/captains-log/uploads`
- **Nominatim:** `/mnt/pool/captains-log/nominatim`
- **Config:** `/mnt/pool/apps/captains-log/.env`

## Default Credentials

**Database:**
- User: `captains_log_user` (or from .env)
- Password: From `.env` → `DB_PASSWORD`
- Database: `captains_log`

**Application:**
- First user registration becomes admin

## Resource Requirements

**Minimum:**
- 2 CPU cores
- 4GB RAM
- 20GB storage (with US geocoding data)

**Recommended:**
- 4 CPU cores
- 8GB RAM
- 50GB storage

## Quick Fixes

**Service won't start:**
```bash
docker-compose -f docker-compose.truenas.yml down
docker-compose -f docker-compose.truenas.yml up -d
```

**Database connection failed:**
```bash
docker exec captains-log-db pg_isready -U captains_log_user
```

**Reset everything (DANGER - deletes all data):**
```bash
docker-compose -f docker-compose.truenas.yml down -v
rm -rf /mnt/pool/captains-log/postgres/*
rm -rf /mnt/pool/captains-log/nominatim/*
docker-compose -f docker-compose.truenas.yml up -d
docker exec -it captains-log-backend npx prisma migrate deploy
```

**Check application logs for errors:**
```bash
docker logs captains-log-backend --tail 100
docker logs captains-log-frontend --tail 100
docker logs captains-log-db --tail 100
```
