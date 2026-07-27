# Changelog

All notable changes to Travel Life are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## How this file is used

- Version headings must be exactly `## [X.Y.Z] - YYYY-MM-DD` (no `v` prefix). The
  release workflow (`.github/workflows/release.yml`) extracts the section matching the
  pushed tag and uses it as the GitHub Release body.
- Add entries under `## [Unreleased]` as you work. `release.ps1` / `release.sh` promote
  that section to the new version heading during a release.
- A missing or empty section is tolerated by CI - the release body falls back to a
  generic note rather than failing the workflow.

## [Unreleased]

## [6.0.3] - 2026-07-27

### Changed

- `release.ps1` no longer builds Docker images. The step was labelled "final
  verification" but built *different* images than CI publishes — the frontend from
  `Dockerfile.prod.truenas` (hardcoding `VITE_API_URL=/api`) rather than CI's
  `Dockerfile.prod` (which takes it as a build-arg). That is precisely how the 6.0.2
  localhost bug shipped: the local build passed, and its success was read as evidence the
  release was sound. CI building the tagged commit from a clean checkout is the only real
  gate. `build.truenas.ps1` remains for building images by hand, and now states plainly
  that its output must not be pushed and does not verify a release.

### Fixed

- **Uploaded images rendered as broken images behind nginx.** Both nginx configs cache
  static assets with a regex location (`~* \.(js|css|png|jpg|...)$`), and nginx picks a
  matching regex location over a plain prefix location. `/uploads/` and `/api/` were plain
  prefixes, so every proxied path ending in one of those extensions — including trip cover
  images, which are always re-encoded to `.jpg` — skipped the proxy and was looked up in
  the SPA's document root, where it does not exist. Both locations are now `^~`, which
  stops regex evaluation. Only affects deployments served through the frontend image's
  nginx; local dev talks to the backend directly.

- **Long text broke out of buttons, cards and badges on mobile.** Audited at ~412px
  (Galaxy S25 Ultra). Two distinct causes. Long unbroken strings — emails, phone numbers,
  confirmation and booking reference numbers, link hostnames, tag names, trip/album/
  checklist titles, usernames — have no wrap opportunity, so they set a min-content width
  wider than their container and ran past its edge; these now carry `break-words` /
  `break-all` / `truncate`, with `min-w-0` on the flex wrapper and `shrink-0` on sibling
  actions so a long name can no longer shove buttons off-screen. Separately, the
  Edit/Delete action rows on locations, activities, lodging and transportation packed up
  to six controls onto one non-wrapping line; since the buttons carry `whitespace-nowrap`
  the row's min-content width is fixed, so when it did not fit it ran past the card edge
  instead of reflowing. Sub-locations hit this first, rendering the same six controls in a
  card that is already visually inset. Those rows now wrap. Presentation only — no logic
  or data changes.

## [6.0.2] - 2026-07-26

### Fixed

- **The published frontend image called `http://localhost:5000/api` (regression in 6.0.0).**
  Every request from the browser failed with `ERR_CONNECTION_REFUSED`, so login, silent
  refresh and the SSO button (which hides itself when `/auth/oidc/config` fails) were all
  broken. `release.yml` passed `VITE_API_URL=${{ vars.VITE_API_URL || 'http://localhost:5000/api' }}`,
  and with the repository variable unset that localhost default was baked into the bundle.
  6.0.0 is the release where CI became the image publisher; before that `build.truenas.ps1`
  used `Dockerfile.prod.truenas`, which hardcodes `/api`, which is why 5.6.1 was unaffected.
  The default is now `/api` and `/uploads` — the frontend image's nginx proxies both, so
  relative URLs are correct for every deployment, and these values cannot be changed after
  build time.

## [6.0.1] - 2026-07-26

### Fixed

- **Login loop after signing in (regression in 6.0.0).** 6.0.0 made refresh tokens
  single-use and treats a second presentation as token theft, bumping `passwordVersion` to
  invalidate every session for that user. But the app has two independent refresh paths —
  the axios 401 interceptor (`/auth/refresh`) and silent refresh (`/auth/silent-refresh`)
  — which race on page load and legitimately present the same cookie. The second was
  flagged as theft, so a successful sign-in immediately invalidated itself and bounced the
  user back to `/login`, permanently. `claimToken` now distinguishes a concurrent replay
  inside a short grace window from genuine reuse: the in-flight rotation result is
  replayed for honest clients, while a genuine replay outside the window still invalidates
  every session.

- The frontend container was reported `unhealthy` while serving traffic normally. Its
  healthcheck probed `http://localhost:80`, and `wget` resolves `localhost` to `::1` first
  while nginx's `listen 80` binds IPv4 only, so every probe got `Connection refused`. All
  frontend healthchecks (both Dockerfiles and all three compose files) now probe
  `http://127.0.0.1:80/health`.
- The PWA could get permanently stuck on an old build. Both nginx configs matched `sw.js`
  with the `\.(js|css|…)$` rule and served the service worker as
  `Cache-Control: public, immutable` with a one-year expiry. `sw.js`, `registerSW.js`,
  `manifest.webmanifest` and `index.html` have stable (non-content-hashed) filenames, so a
  long cache pins clients to whatever build they first loaded. They are now served
  `no-cache` via exact-match locations; the content-hashed assets keep the immutable cache.
- `release.ps1` no longer corrupts non-ASCII characters when promoting the changelog.
  `Get-Content -Raw` without `-Encoding UTF8` reads UTF-8 as the system ANSI codepage and
  `WriteAllText` re-encodes it, double-encoding every em-dash and accent — which CI then
  publishes verbatim as the GitHub Release body (visible in the 6.0.0 release notes).
- The TrueNAS compose files defaulted to `${APP_VERSION:-v5.6.1}` after 6.0.0 shipped, so
  a deploy without `APP_VERSION` set would silently bring up the previous release. Both
  files now default to the current version, and bumping them is a documented release step.

### Documentation

- `backend/prisma/migrations/README.md` documents recovery from a failed baseline
  (`P3009`). The previous text implied `migrate resolve --applied` alone was enough;
  Prisma rejects that once the migration is recorded as failed, and `--rolled-back` must
  come first. Includes the one-off container form for a crash-looping backend.
- `BUILD_AND_PUSH.md`: dropped the "re-push to registry" and manual `docker login`
  remedies that contradicted CI-only publishing, and added migration steps to deploy.

## [6.0.0] - 2026-07-26

### Added

- Travel partner requests: a partnership must now be accepted by the recipient before it
  takes effect. Accepting is the only operation permitted to write both users' records.

### Security

- Setting a travel partner no longer writes the *other* user's record. Previously
  `updateTravelPartnerSettings` wrote the link bidirectionally, which let a user grant
  themselves collaborator access to every trip the other person subsequently created —
  including lodging confirmations, expenses, journal entries and photos. Consent is now
  required via a travel partner request.

### Environment — action required before deploying

- `JWT_SECRET` and `JWT_REFRESH_SECRET` are now validated at startup and must be at least
  32 characters and not a well-known placeholder. Tokens are HS256, so the signing key is
  offline-crackable from a single issued token — presence alone was not enough. **A backend
  with a shorter secret will refuse to start** (`JWT_SECRET is too weak`). Generate
  replacements with `openssl rand -base64 48`. The check is skipped only under
  `NODE_ENV=test`. Note that changing either secret invalidates all existing sessions and
  refresh tokens, so every user must sign in again.

### Migrations — action required before deploying

- Adds a baseline migration, `00000000000000_init`, that creates the entire schema from
  empty. **Every database that already contains data must have it marked as applied once,
  before the next `prisma migrate deploy`:** `npx prisma migrate resolve --applied
  00000000000000_init`. Skipping this aborts the deploy on a guard (nothing is damaged,
  but no later migration is applied). See `backend/prisma/migrations/README.md`.
- Also adds: a uniqueness constraint on weather data per trip/date, a trip-expense
  trip/date index, a trip-expense amount check constraint, a PostGIS coordinate backfill,
  and the travel partner request tables.

### Fixed

- Release pipeline: `release.ps1` now aborts when the backend or frontend verification
  build fails (previously the failure was silently swallowed and the release continued).
- `release.sh` is runnable again: it reads the current version from
  `backend/package.json` instead of a non-existent `VERSION` file, strips a leading `v`
  from explicit versions (`./release.sh v5.6.1` no longer tags `vv5.6.1`), and no longer
  aborts mid-bump on a missing changelog.
- `build.sh` builds correct image references when `DOCKER_REGISTRY` is set (missing `/`
  separator produced tags like `ghcr.io/dsbagictravel-life-backend`).
- The release workflow no longer fails when a changelog section is missing.
- CI runs the backend test suite for real and type-checks both packages instead of
  swallowing failures.
- TrueNAS compose files deploy a pinned `${APP_VERSION}` image instead of `:latest`.

### Changed

- CI (`.github/workflows/release.yml`) is now the single publisher of container images.
  `release.ps1` / `release.sh` build images locally for verification only.
- Removed the one-off `fix-migration.ps1` / `fix-migration.sh` /
  `fix-journal-associations-migration.sql` hotfix scripts.

## [5.6.1] - 2026-07-25

### Added

- Bulk actions for saved links.
- Year in Review widget.
- Multi-currency budgets.
- Opening-hours warnings for locations.
- Transit deep links.

### Fixed

- Opening-hours service failed to compile under the relaxed production build
  (discriminated-union narrowing without `strictNullChecks`).

## [5.6.0] - 2026-07-25

### Added

- Saved links, with ingest of links sent by email.
- Trip cover images.
- OIDC single sign-on: PKCE support for public clients (client secret optional),
  `DISABLE_PASSWORD_LOGIN` for SSO-only mode with a lockout guard, and `OIDC_TRUST_EMAIL`
  for identity providers that omit `email_verified`.

### Fixed

- Actionable errors surfaced for OIDC discovery and token-exchange failures.
- `BASE_URL`, `FRONTEND_URL`, OIDC and VAPID variables are passed through to the backend
  in the production compose file.

---

Releases before 5.6.0 predate this changelog; see the git history and the
[tag list](https://github.com/dsbaciga/travel-life/tags).
