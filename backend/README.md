# Travel Life — Backend

Express + TypeScript API for [Travel Life](../README.md), a travel documentation app for tracking trips, locations, photos, transportation, lodging, and journal entries.

See the root [README](../README.md) for full setup instructions (Docker Compose, environment variables, etc.) and the [Documentation Index](../docs/README.md) for architecture details — [Backend Architecture](../docs/architecture/BACKEND_ARCHITECTURE.md) and [Database Schema](../docs/architecture/DATABASE_SCHEMA.md) are the most relevant starting points.

## Tech Stack

Node.js + Express + TypeScript + PostgreSQL (PostGIS) + Prisma ORM + JWT Authentication

## Development

```bash
npm install
npm run dev
```

Runs on http://localhost:5000. Requires `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `NOMINATIM_URL` in `.env` — see `.env.example` and the root README's Environment Setup section for the full list of optional integrations (Immich, weather, flight tracking, AI/PDF import, OIDC/SSO, etc.).

## Scripts

- `npm run dev` - Start development server with hot reload (tsx watch)
- `npm run build` - Compile TypeScript to JavaScript (relaxed `tsconfig.prod.json`)
- `npm run build:strict` - Compile with full strict type-checking
- `npm start` - Run production build
- `npm test` - Run Jest tests
- `npm run prisma:generate` - Generate Prisma Client after schema changes
- `npm run prisma:migrate` - Create and run a new migration
- `npm run prisma:studio` - Open Prisma Studio GUI at http://localhost:5555
