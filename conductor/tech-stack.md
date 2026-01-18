# Tech Stack

This document outlines the technology stack used in the project, covering both backend and frontend components, as well as core infrastructure.

## Backend

-   **Language & Framework:** Node.js with Express and TypeScript for robust and scalable API development.
-   **Database:** PostgreSQL with PostGIS for advanced geospatial data handling and reliable data storage.
-   **ORM:** Prisma ORM for type-safe database access and streamlined development.
-   **Authentication:** JWT (JSON Web Tokens) for secure and stateless user authentication.

## Frontend

-   **Language & Framework:** React with TypeScript for building dynamic and interactive user interfaces.
-   **Build Tool:** Vite for a fast and optimized development experience.
-   **Styling:** Tailwind CSS for utility-first CSS styling, enabling rapid UI development.
-   **Routing:** React Router for declarative navigation within the single-page application.
-   **Data Fetching:** TanStack Query (React Query) for efficient data fetching, caching, and state management.
-   **State Management:** Zustand for lightweight and flexible global state management.
-   **Mapping:** Leaflet for interactive maps, utilizing OpenStreetMap data.
-   **Rich Text Editor:** TipTap for a powerful and customizable rich text editing experience.

## Infrastructure

-   **Containerization:** Docker Compose for defining and running multi-container Docker applications, simplifying deployment and development environments.
-   **Geocoding:** Self-hosted Nominatim for accurate and customizable geocoding services.
-   **External APIs:**
    -   OpenWeatherMap API for weather data integration.
    -   AviationStack API for real-time flight tracking information.
    -   Immich Integration for photo management and synchronization.
