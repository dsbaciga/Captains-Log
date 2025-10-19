# 🚀 Start Captain's Log Application

## Prerequisites Check

✅ Node.js installed
✅ npm dependencies installed (backend and frontend)
✅ Prisma client generated
⚠️ **Docker Desktop needs to be started**

## Quick Start Steps

### Step 1: Start Docker Desktop

1. Open **Docker Desktop** application on your Windows machine
2. Wait for Docker to fully start (you'll see "Docker Desktop is running" in the system tray)
3. This usually takes 1-2 minutes

### Step 2: Start the Database

Once Docker Desktop is running, open a terminal in the project root and run:

```bash
docker compose up -d db
```

This starts PostgreSQL with PostGIS on `localhost:5432`

Wait about 10-15 seconds for the database to be ready.

### Step 3: Run Database Migrations

```bash
cd backend
npx prisma migrate dev --name init
```

This creates all the database tables.

### Step 4: Start the Backend

In one terminal:

```bash
cd backend
npm run dev
```

The backend API will run on **http://localhost:5000**

You should see:
```
Server running in development mode on port 5000
Base URL: http://localhost:5000
```

### Step 5: Start the Frontend

In another terminal:

```bash
cd frontend
npm run dev
```

The frontend will run on **http://localhost:3000** (or 5173 depending on Vite config)

### Step 6: Open the Application

Open your browser to: **http://localhost:5173** (or whatever port Vite shows)

You should see the **Captain's Log** login page!

## 🎉 Test the Application

1. Click **Register** to create a new account
2. Fill in:
   - Username: `testuser`
   - Email: `test@example.com`
   - Password: `password123`
3. Click **Register** button
4. You should be logged in and redirected to the Dashboard!

## Troubleshooting

### Docker Desktop Not Starting

**Error**: `unable to get image 'postgis/postgis:16-3.4'`
**Solution**: Make sure Docker Desktop is fully started and running

### Database Connection Error

**Error**: `Can't reach database server at localhost:5432`
**Solution**:
1. Make sure Docker container is running: `docker ps`
2. You should see `captains-log-db` in the list
3. If not, start it: `docker compose up -d db`

### Port Already in Use

**Error**: `Port 5000 is already in use`
**Solution**: Either kill the process using that port, or change the port in `backend/.env`

### Prisma Client Issues

**Error**: `Cannot find module '@prisma/client'`
**Solution**:
```bash
cd backend
npx prisma generate
```

## What's Next?

Once you have the application running and can login:

1. **Explore the dashboard** - Basic placeholder UI is there
2. **Start implementing features**:
   - Trip management (create, list, edit trips)
   - Location tracking with maps
   - Photo uploads
   - Journal entries

See [PLANNING.md](PLANNING.md) for the complete feature roadmap!

## Full Docker Compose (Optional)

If you want to run everything in Docker (including backend and frontend):

```bash
docker compose up -d
```

Then run migrations:
```bash
docker exec -it captains-log-backend npx prisma migrate dev --name init
```

Access the app at **http://localhost:3000**

## Need Help?

- Check logs: `docker logs captains-log-db`
- View backend logs: Check terminal where `npm run dev` is running
- Inspect database: `cd backend && npm run prisma:studio`

---

**Ready to build?** Once the app is running, start implementing features from Phase 1 in [PLANNING.md](PLANNING.md)! 🚢
