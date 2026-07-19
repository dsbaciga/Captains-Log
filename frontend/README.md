# Travel Life — Frontend

React + TypeScript + Vite frontend for [Travel Life](../README.md), a travel documentation app for tracking trips, locations, photos, transportation, lodging, and journal entries.

See the root [README](../README.md) for full setup instructions (Docker Compose, environment variables, etc.) and the [Documentation Index](../docs/README.md) for architecture and style guides — [Frontend Architecture](../docs/architecture/FRONTEND_ARCHITECTURE.md) and the [Style Guide](../docs/architecture/STYLE_GUIDE.md) (required reading for UI work) are the most relevant starting points.

## Tech Stack

React 19 + TypeScript + Vite + Tailwind CSS + TanStack Query + Zustand + React Router + Leaflet

## Development

```bash
npm install
npm run dev
```

Runs on http://localhost:5173 locally (port 3000 when started via Docker Compose). Requires `VITE_API_URL` and `VITE_UPLOAD_URL` in `.env` — see `.env.example`.

## Scripts

- `npm run dev` - Start Vite dev server
- `npm run build` - Build production bundle (TypeScript errors are non-blocking)
- `npm run build:strict` - Build with strict type-checking (TypeScript errors fail the build)
- `npm run lint` - Run ESLint
- `npm test` - Run Vitest tests (`test:ui`, `test:coverage` also available)
- `npm run preview` - Preview production build
- `npm run analyze` - Build with bundle analyzer (`analyze:win` on Windows)
