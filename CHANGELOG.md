# Changelog

All notable changes to Captain's Log will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Production Docker Compose configuration
- Multi-stage production Dockerfiles for optimized builds
- Build scripts for bash (build.sh) and PowerShell (build.ps1)
- Nginx configuration for frontend with gzip compression and security headers
- Health checks for all services
- Comprehensive deployment documentation
- Environment variable templates for production

### Changed
- Separated development and production Docker configurations

### Security
- Added security headers to nginx configuration
- Implemented health checks for all containers
- Added non-root user for backend container in production

## [1.0.0] - Initial Release

### Added
- Full-stack travel documentation application
- User authentication with JWT (access and refresh tokens)
- Trip management with multiple statuses (Dream, Planning, Planned, In Progress, Completed, Cancelled)
- Location tracking with PostGIS geospatial support
- Photo management with local uploads and Immich integration
- EXIF data extraction from photos
- Transportation tracking (flights, trains, buses, etc.)
- Lodging management with booking details
- Activity planning and tracking with cost management
- Journal entries (trip-level and daily)
- Photo albums for organization
- Tag system for trip categorization
- Companion tracking for trips
- Custom location and activity categories
- Weather data integration (OpenWeatherMap)
- Flight tracking integration (AviationStack)
- Self-hosted Nominatim geocoding service
- Responsive React frontend with Tailwind CSS
- Interactive maps with Leaflet
- State management with Zustand
- Server state caching with TanStack Query
- Express backend with TypeScript
- PostgreSQL database with Prisma ORM
- Docker Compose development environment
- Comprehensive API documentation
- Rate limiting and security headers

### Security
- JWT-based authentication
- Password hashing with bcrypt
- CORS protection
- Helmet.js security headers
- Input validation with Zod
- SQL injection protection via Prisma

[Unreleased]: https://github.com/yourusername/captains-log/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/yourusername/captains-log/releases/tag/v1.0.0
