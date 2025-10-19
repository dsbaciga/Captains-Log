# Getting Started with Captain's Log

## ✅ What's Been Implemented

### Backend
- ✅ Express server with TypeScript
- ✅ PostgreSQL with PostGIS (via Prisma)
- ✅ Complete database schema (19 tables)
- ✅ JWT authentication system
  - User registration
  - User login
  - Token refresh
  - Protected routes
- ✅ Error handling middleware
- ✅ Logging (Winston)
- ✅ Security (Helmet, CORS, rate limiting)

### Frontend
- ✅ React + TypeScript + Vite
- ✅ Tailwind CSS styling
- ✅ React Router navigation
- ✅ Zustand state management
- ✅ Authentication pages (Login, Register)
- ✅ Protected routes
- ✅ Dashboard page
- ✅ Toast notifications

## 🚀 Running the Application

### Step 1: Set Up Environment Variables

#### Backend
```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and set strong secrets:
```env
JWT_SECRET=your-strong-secret-key-here
JWT_REFRESH_SECRET=your-strong-refresh-secret-here
```

#### Frontend
```bash
cd frontend
cp .env.example .env
```

The default values should work for development.

### Step 2: Start with Docker Compose

From the project root:

```bash
docker-compose up -d
```

This will start:
- PostgreSQL (localhost:5432)
- Backend API (localhost:5000)
- Frontend (localhost:3000)
- Nominatim (localhost:8080) - *will take 1-2 hours to initialize*

### Step 3: Run Database Migrations

```bash
cd backend
docker exec -it captains-log-backend npx prisma migrate dev --name init
```

This creates all the database tables.

### Step 4: Access the Application

Open your browser to: **http://localhost:3000**

You should see the login page. Click "Register" to create a new account!

## 📝 Testing Authentication

1. Go to http://localhost:3000
2. Click "Register"
3. Create a new account:
   - Username: testuser
   - Email: test@example.com
   - Password: password123
4. You'll be automatically logged in and redirected to the dashboard
5. Try logging out and logging back in

## 🔍 Verify Backend API

Test the API directly:

### Health Check
```bash
curl http://localhost:5000/health
```

### Register a User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

## 🛠️ Development

### Backend Development

```bash
cd backend
npm install
npm run dev
```

Backend runs on http://localhost:5000

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:3000

### View Database with Prisma Studio

```bash
cd backend
npm run prisma:studio
```

Opens at http://localhost:5555

## 📂 Project Structure

```
backend/src/
├── config/          # Configuration and database client
├── controllers/     # Route controllers (auth.controller.ts)
├── middleware/      # Auth middleware, error handlers
├── routes/          # API routes (auth.routes.ts)
├── services/        # Business logic (auth.service.ts)
├── types/           # TypeScript types
├── utils/           # Utilities (JWT, password hashing)
└── index.ts         # Express app entry point

frontend/src/
├── components/      # React components (ProtectedRoute.tsx)
├── pages/           # Page components (LoginPage, RegisterPage, DashboardPage)
├── lib/             # Axios instance with interceptors
├── services/        # API services (auth.service.ts)
├── store/           # Zustand stores (authStore.ts)
├── types/           # TypeScript types
└── App.tsx          # Main app with routing
```

## 🎯 Next Steps

Now that authentication is working, you can implement:

1. **Trip Management** (Phase 1)
   - Create/edit/delete trips
   - Trip list view
   - Trip detail view

2. **Location Management** (Phase 1)
   - Add locations to trips
   - Display on map (OpenStreetMap)

3. **Photo Management** (Phase 2)
   - Upload photos
   - Immich integration

4. **And more** (see PLANNING.md for the full roadmap)

## 🐛 Troubleshooting

### Database Connection Error
- Ensure Docker containers are running: `docker ps`
- Check backend logs: `docker logs captains-log-backend`
- Check database logs: `docker logs captains-log-db`

### Prisma Client Not Found
```bash
cd backend
npx prisma generate
```

### Frontend Can't Connect to Backend
- Verify backend is running on localhost:5000
- Check `frontend/.env` has correct `VITE_API_URL`
- Check browser console for errors

### Port Already in Use
Change ports in `docker-compose.yml` if 3000, 5000, 5432, or 8080 are already in use.

## 📚 Additional Resources

- Full feature list: [PLANNING.md](PLANNING.md)
- Setup instructions: [README.md](README.md)
- Prisma docs: https://www.prisma.io/docs
- React Router: https://reactrouter.com
- Zustand: https://github.com/pmndrs/zustand

## 🎉 Success!

You now have a working authentication system for Captain's Log!

The foundation is ready for building out the rest of the features. Happy coding! 🚀
