# TrueNAS Frontend API Proxy Configuration

## Problem

When deploying Captain's Log on TrueNAS, the frontend needs to communicate with the backend API. However, the frontend is a static React application built at compile time with hardcoded API URLs. This creates a problem:

- Pre-built Docker images from GitHub Container Registry have `http://localhost:5000` hardcoded
- This won't work when accessing the frontend from a browser on a different machine
- Rebuilding the frontend for every TrueNAS deployment with a specific IP is inconvenient

## Solution: Nginx Reverse Proxy

The TrueNAS deployment uses an nginx reverse proxy configuration to solve this problem:

### How It Works

1. **Frontend uses relative URLs**: The frontend is built with `/api` and `/uploads` as the API endpoints
2. **Nginx proxies requests**: When the browser requests `/api/trips`, nginx forwards it to `http://backend:5000/api/trips`
3. **Docker network resolution**: The `backend` hostname resolves to the backend container via Docker's internal DNS

### Architecture

```
Browser (http://truenas-ip:30600)
    ↓
Frontend Container (nginx on port 80)
    ↓ /api/* requests
Backend Container (port 5000)
```

### Files

- **`frontend/nginx.truenas.conf`**: TrueNAS-specific nginx configuration with proxy rules
- **`frontend/Dockerfile.truenas`**: TrueNAS-specific frontend build using the proxy config
- **`docker-compose.truenas.yml`**: Configured to build frontend with `Dockerfile.truenas`

### Nginx Configuration

The key proxy configuration in `nginx.truenas.conf`:

```nginx
# Proxy API requests to backend service
location /api {
    proxy_pass http://backend:5000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Proxy uploads requests to backend service
location /uploads {
    proxy_pass http://backend:5000;
    proxy_set_header Host $host;
    # ... headers ...
}
```

### Benefits

1. **No hardcoded IPs**: Frontend works on any TrueNAS server without modification
2. **Same-origin requests**: Browser sees all requests going to port 30600, avoiding CORS issues
3. **Simplified deployment**: Just run `docker-compose up -d` - no environment variables needed
4. **Better security**: Backend is only exposed via the frontend proxy, not directly to browsers
5. **Caching**: Nginx can cache API responses and uploaded images for better performance

### Differences from Standard Deployment

**Standard `frontend/nginx.conf`**:
- Serves static files only
- Frontend makes direct requests to backend IP/hostname
- Requires `VITE_API_URL` and `VITE_UPLOAD_URL` at build time

**TrueNAS `frontend/nginx.truenas.conf`**:
- Serves static files AND proxies API requests
- Frontend uses relative URLs (`/api`, `/uploads`)
- No environment variables needed - works anywhere

## Usage

The docker-compose.truenas.yml file automatically uses the TrueNAS configuration:

```yaml
frontend:
  build:
    context: ./frontend
    dockerfile: Dockerfile.truenas  # Uses nginx.truenas.conf
  container_name: captains-log-frontend
  ports:
    - "30600:80"
  depends_on:
    - backend
```

When you run `docker-compose -f docker-compose.truenas.yml up -d`, the frontend is automatically built with the proxy configuration.

## Accessing the Application

Once deployed, access the application at:

- **Frontend**: `http://your-truenas-ip:30600`
- **API** (proxied): `http://your-truenas-ip:30600/api`
- **Uploads** (proxied): `http://your-truenas-ip:30600/uploads`

The backend service on port 30601 doesn't need to be accessed directly by browsers.

## Troubleshooting

### API requests fail with 502 Bad Gateway

Check that the backend service is running and healthy:

```bash
docker logs captains-log-backend
docker exec captains-log-backend curl http://localhost:5000/health
```

### Frontend shows but API requests fail

Check nginx proxy logs:

```bash
docker logs captains-log-frontend
```

Verify the backend service name is correct:

```bash
docker exec captains-log-frontend getent hosts backend
```

### Want to use external backend

If you want the frontend to connect to a backend on a different server, modify `nginx.truenas.conf`:

```nginx
location /api {
    proxy_pass http://external-backend-ip:5000;
    # ... rest of config ...
}
```

Then rebuild: `docker-compose -f docker-compose.truenas.yml build frontend`
