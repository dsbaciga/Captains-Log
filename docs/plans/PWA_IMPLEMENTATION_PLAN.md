# Progressive Web App (PWA) Implementation Plan

**Created**: 2026-01-31
**Status**: Planning
**Priority**: High
**Estimated Effort**: 5-6 weeks

---

## Table of Contents

1. [Overview](#overview)
2. [Goals & Success Criteria](#goals--success-criteria)
3. [Critical Implementation Notes](#critical-implementation-notes)
4. [Current State Analysis](#current-state-analysis)
5. [Architecture Design](#architecture-design)
6. [Implementation Phases](#implementation-phases)
7. [Offline Authentication](#offline-authentication)
8. [Offline Trip Preparation](#offline-trip-preparation)
9. [Offline ID Generation Strategy](#offline-id-generation-strategy)
10. [iOS and Safari Limitations](#ios-and-safari-limitations)
11. [Offline Search](#offline-search)
12. [Map Pre-Caching](#map-pre-caching)
13. [Data Freshness Indicators](#data-freshness-indicators)
14. [Database Migration Strategy](#database-migration-strategy)
15. [Storage Management](#storage-management)
16. [Technical Specifications](#technical-specifications)
17. [Offline Feature Scope](#offline-feature-scope)
18. [Data Synchronization Strategy](#data-synchronization-strategy)
19. [Photo Caching Strategy](#photo-caching-strategy)
20. [Offline Trip Creation](#offline-trip-creation)
21. [Immich Photo Caching](#immich-photo-caching)
22. [Video File Handling](#video-file-handling)
23. [Migration from Existing localStorage](#migration-from-existing-localstorage)
24. [Edge Cases & Error Handling](#edge-cases--error-handling)
25. [Testing Strategy](#testing-strategy)
26. [Risks & Mitigations](#risks--mitigations)
27. [Future Enhancements](#future-enhancements)
28. [File Structure](#file-structure)
29. [Summary](#summary)
30. [Appendix: Entity Type Coverage](#appendix-entity-type-coverage)
31. [Changelog](#changelog)

---

## Overview

Transform Travel Life into a Progressive Web App to enable offline access, installability, and enhanced mobile experience. This is critical for a travel application where users frequently have limited or no connectivity.

### Why PWA for Travel Life?

| Scenario | Problem Today | PWA Solution |
|----------|---------------|--------------|
| International travel | No data, can't view itinerary | Cached trip data available offline |
| Flight mode | App unusable during flights | Full trip access, can add notes |
| Remote locations | Spotty connectivity | Graceful degradation, sync when online |
| Data roaming costs | Avoid heavy data usage | Pre-cached content, minimal network |
| Quick access | Open browser, navigate to URL | Install to home screen, instant launch |

---

## Goals & Success Criteria

### Primary Goals

1. **Offline Trip Viewing** - View complete trip details without network
2. **Installability** - Add to home screen on mobile/desktop
3. **Offline Editing** - Create/edit activities, journal entries offline
4. **Photo Access** - View cached thumbnails and selected full photos offline
5. **Reliable Sync** - Changes sync automatically when back online

### Success Criteria

| Metric | Target |
|--------|--------|
| Lighthouse PWA Score | 100 |
| Offline trip load time | < 500ms |
| Install prompt acceptance | > 20% |
| Sync conflict rate | < 1% |
| Offline-capable pages | 80%+ |

---

## Critical Implementation Notes

**IMPORTANT**: This section documents critical technical details that MUST be followed during implementation. Failure to address these will cause bugs or security vulnerabilities.

### ID Type Handling

The database uses **integer auto-increment IDs** (Prisma: `Int @id @default(autoincrement())`), but IndexedDB keys are strings. This mismatch must be handled carefully:

```typescript
// CORRECT: Always convert IDs to strings for IndexedDB operations
const dbKey = String(entity.id);

// CORRECT: Convert back to number for API calls
const apiId = parseInt(dbKey, 10);

// WRONG: Direct comparison will fail
if (localId === serverId) // May fail if types differ

// CORRECT: Always compare as strings
if (String(localId) === String(serverId))
```

**Rules:**
1. All IndexedDB keys are strings
2. Server IDs (integers) are converted to strings when storing
3. Local IDs use format `local_${uuid}` (already strings)
4. ID comparisons always use `String()` conversion
5. API calls convert string keys back to integers

### Required Dependencies

**All of these MUST be installed before starting:**

```bash
cd frontend

# PWA core
npm install vite-plugin-pwa workbox-window --save-dev

# Offline data
npm install idb --save

# ID generation
npm install uuid --save
npm install @types/uuid --save-dev

# Query persistence
npm install @tanstack/react-query-persist-client --save

# Encryption (for offline sessions)
# No install needed - uses native Web Crypto API
```

**Verify versions are compatible:**
- `vite-plugin-pwa` >= 0.20.0 (for Vite 7.x)
- `idb` >= 8.0.0 (for TypeScript 5.x)
- `@tanstack/react-query-persist-client` matching your `@tanstack/react-query` version

### Security Requirements

**Offline Session Encryption (MANDATORY):**

The offline session token MUST be encrypted before storing in IndexedDB:

```typescript
// src/lib/crypto.ts

const ENCRYPTION_ALGORITHM = 'AES-GCM';
const KEY_DERIVATION = 'PBKDF2';

// Derive a key from a device-specific identifier
async function deriveKey(deviceId: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(deviceId),
    KEY_DERIVATION,
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: KEY_DERIVATION,
      salt: encoder.encode('travel-life-offline'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: ENCRYPTION_ALGORITHM, length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptSessionData(data: string, deviceId: string): Promise<string> {
  const key = await deriveKey(deviceId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();

  const encrypted = await crypto.subtle.encrypt(
    { name: ENCRYPTION_ALGORITHM, iv },
    key,
    encoder.encode(data)
  );

  // Combine IV + encrypted data and base64 encode
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode(...combined));
}

export async function decryptSessionData(encrypted: string, deviceId: string): Promise<string> {
  const key = await deriveKey(deviceId);
  const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));

  const iv = combined.slice(0, 12);
  const data = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: ENCRYPTION_ALGORITHM, iv },
    key,
    data
  );

  return new TextDecoder().decode(decrypted);
}

// Generate device ID (stored separately in localStorage, not IndexedDB)
export function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem('device-id');
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem('device-id', deviceId);
  }
  return deviceId;
}
```

**CSRF Token Refresh:**

Before starting any sync operation, refresh the CSRF token:

```typescript
// In syncManager.ts
async syncAll(): Promise<SyncResult> {
  if (!navigator.onLine) return { status: 'offline' };

  // CRITICAL: Refresh CSRF token first
  try {
    await axios.get('/api/auth/csrf-token');
  } catch (error) {
    console.error('Failed to refresh CSRF token');
    return { status: 'error', error: 'csrf-refresh-failed' };
  }

  // Now proceed with sync...
}
```

### App.tsx Integration

The QueryClient MUST be wrapped with persistence:

```typescript
// src/App.tsx - REQUIRED CHANGES

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createIndexedDBPersister } from './lib/queryPersister';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const persister = createIndexedDBPersister();

function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        buster: APP_VERSION, // Invalidate on version change
      }}
    >
      {/* ... rest of app */}
    </PersistQueryClientProvider>
  );
}
```

### URL Pattern Configuration

Workbox URL patterns must match actual API URLs. Use environment variables:

```typescript
// vite.config.ts
const API_URL = process.env.VITE_API_URL || 'http://localhost:5000';

// In workbox runtimeCaching:
{
  // Use actual API URL, not generic pattern
  urlPattern: new RegExp(`^${API_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/api/(trips|locations|activities)`),
  handler: 'NetworkFirst',
  // ...
}
```

---

## Current State Analysis

### Existing Infrastructure

| Component | Status | PWA Readiness |
|-----------|--------|---------------|
| Vite build system | ✅ Hash-based caching | Ready for PWA plugin |
| TanStack Query | ✅ 5-min staleTime | Can persist to IndexedDB |
| localStorage drafts | ✅ 24-hour auto-save | Extend for offline queue |
| ProgressiveImage | ✅ Lazy load + blur-up | Add cache-first strategy |
| Auth tokens | ⚠️ Memory-only | Need offline auth strategy |
| Service Worker | ❌ None | Must implement |
| Manifest | ❌ None | Must create |
| IndexedDB | ❌ Not used | Must implement |

### Data Size Estimates

| Data Type | Per Trip | 10 Trips | Storage |
|-----------|----------|----------|---------|
| Trip metadata | 5 KB | 50 KB | IndexedDB |
| Locations (50) | 150 KB | 1.5 MB | IndexedDB |
| Activities (30) | 60 KB | 600 KB | IndexedDB |
| Transportation (20) | 100 KB | 1 MB | IndexedDB |
| Lodging (15) | 60 KB | 600 KB | IndexedDB |
| Journal entries (10) | 100 KB | 1 MB | IndexedDB |
| Photo metadata (100) | 50 KB | 500 KB | IndexedDB |
| **Subtotal metadata** | **525 KB** | **5.25 MB** | IndexedDB |
| Thumbnails (100 @ 50KB) | 5 MB | 50 MB | Cache API |
| Full photos (10 @ 3MB) | 30 MB | 300 MB | Cache API (selective) |

**Recommendation**: Cache all metadata + thumbnails automatically (~55 MB for 10 trips). Full photos are user-selective.

---

## Architecture Design

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   React     │  │  TanStack   │  │   Zustand Stores    │  │
│  │   App       │←→│   Query     │←→│   (auth, theme)     │  │
│  └─────────────┘  └──────┬──────┘  └─────────────────────┘  │
│                          │                                   │
│                          ▼                                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Offline Data Layer                        │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────┐  │  │
│  │  │  IndexedDB  │  │  Sync Queue │  │ Conflict Res. │  │  │
│  │  │  (metadata) │  │  (pending)  │  │   (merge)     │  │  │
│  │  └─────────────┘  └─────────────┘  └───────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                          │                                   │
├──────────────────────────┼──────────────────────────────────┤
│                   Service Worker                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Cache     │  │  Background │  │   Push              │  │
│  │   Strategy  │  │    Sync     │  │   Notifications     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    Cache Storage                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   App Shell │  │   API Cache │  │   Photo Cache       │  │
│  │   (static)  │  │  (metadata) │  │   (thumbnails)      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
                    ┌───────────┐
                    │  Backend  │
                    │   API     │
                    └───────────┘
```

### Caching Strategies by Resource Type

| Resource | Strategy | Reason |
|----------|----------|--------|
| App shell (HTML, JS, CSS) | Cache-first, update in background | Fast load, always available |
| API responses (trip data) | Network-first, fallback to cache | Fresh data preferred |
| Static assets (icons, fonts) | Cache-first | Never change |
| Photos (thumbnails) | Cache-first, network fallback | Bandwidth savings |
| Photos (full resolution) | Network-only, user-selectable cache | Storage management |
| Auth endpoints | Network-only | Security |

---

## Implementation Phases

### Phase 1: Foundation (Week 1)

**Goal**: Basic PWA infrastructure with installability

#### 1.1 Install vite-plugin-pwa

```bash
cd frontend
npm install vite-plugin-pwa workbox-window --save-dev
```

#### 1.2 Configure Vite for PWA

Update `vite.config.ts`:

```typescript
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', // User controls update
      includeAssets: ['favicon.svg', 'robots.txt'],
      manifest: {
        name: 'Travel Life',
        short_name: 'Travel Life',
        description: 'Document your travel adventures',
        theme_color: '#1a365d', // navy-900
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        categories: ['travel', 'lifestyle', 'productivity'],
        screenshots: [
          {
            src: '/screenshots/dashboard.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide'
          },
          {
            src: '/screenshots/trip-mobile.png',
            sizes: '750x1334',
            type: 'image/png',
            form_factor: 'narrow'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          // API caching configured in Phase 2
        ]
      }
    })
  ]
});
```

#### 1.3 Create App Icons

Required icons in `public/icons/`:

| File | Size | Purpose |
|------|------|---------|
| `icon-192.png` | 192x192 | Android home screen |
| `icon-512.png` | 512x512 | Android splash, PWA install |
| `icon-512-maskable.png` | 512x512 | Adaptive icons (safe zone) |
| `apple-touch-icon.png` | 180x180 | iOS home screen |
| `favicon.ico` | 32x32 | Browser tab |

#### 1.4 Add Install Prompt Component

Create `src/components/pwa/InstallPrompt.tsx`:

```typescript
import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96
                    bg-white dark:bg-navy-800 rounded-lg shadow-xl p-4 z-50
                    border border-primary-200 dark:border-navy-600">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <img src="/icons/icon-192.png" alt="" className="w-12 h-12 rounded-lg" />
        </div>
        <div className="flex-1">
          <h3 className="font-display font-semibold text-navy-900 dark:text-white">
            Install Travel Life
          </h3>
          <p className="text-sm text-navy-600 dark:text-navy-300 mt-1">
            Access your trips offline and get a native app experience.
          </p>
          <div className="flex gap-2 mt-3">
            <button onClick={handleInstall} className="btn-primary text-sm">
              Install
            </button>
            <button
              onClick={() => setShowPrompt(false)}
              className="btn-secondary text-sm"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### 1.5 Add Update Prompt Component

Create `src/components/pwa/UpdatePrompt.tsx`:

```typescript
import { useRegisterSW } from 'virtual:pwa-register/react';

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96
                    bg-amber-50 dark:bg-amber-900/20 rounded-lg shadow-xl p-4 z-50
                    border border-amber-200 dark:border-amber-700">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-amber-500">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="font-display font-semibold text-navy-900 dark:text-white">
            Update Available
          </h3>
          <p className="text-sm text-navy-600 dark:text-navy-300 mt-1">
            A new version of Travel Life is ready.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => updateServiceWorker(true)}
              className="btn-primary text-sm"
            >
              Update Now
            </button>
            <button
              onClick={() => setNeedRefresh(false)}
              className="btn-secondary text-sm"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### 1.6 Deliverables - Phase 1

- [ ] PWA plugin installed and configured
- [ ] App manifest with proper icons
- [ ] Install prompt UI
- [ ] Update prompt UI
- [ ] Lighthouse PWA audit passing basic checks

---

### Phase 2: Offline Data Layer (Week 2)

**Goal**: Store trip data in IndexedDB for offline access

#### 2.1 Install Dependencies

```bash
npm install idb --save  # IndexedDB wrapper
```

#### 2.2 Create IndexedDB Schema

Create `src/lib/offlineDb.ts`:

```typescript
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface TravelLifeDB extends DBSchema {
  // ============================================
  // CORE TRIP DATA
  // ============================================
  trips: {
    key: string;
    value: {
      id: string;
      data: Trip;
      lastSync: number;
      version: number;
      downloadedForOffline: boolean; // User explicitly downloaded
    };
    indexes: { 'by-status': string; 'by-date': string; 'by-downloaded': string };
  };
  locations: {
    key: string;
    value: {
      id: string;
      tripId: string;
      data: Location;
      lastSync: number;
      localId?: string; // UUID for offline-created entities
    };
    indexes: { 'by-trip': string; 'by-local-id': string };
  };
  activities: {
    key: string;
    value: {
      id: string;
      tripId: string;
      data: Activity;
      lastSync: number;
      localId?: string;
    };
    indexes: { 'by-trip': string };
  };
  transportation: {
    key: string;
    value: {
      id: string;
      tripId: string;
      data: Transportation;
      lastSync: number;
      localId?: string;
    };
    indexes: { 'by-trip': string };
  };
  lodging: {
    key: string;
    value: {
      id: string;
      tripId: string;
      data: Lodging;
      lastSync: number;
      localId?: string;
    };
    indexes: { 'by-trip': string };
  };
  journals: {
    key: string;
    value: {
      id: string;
      tripId: string;
      data: JournalEntry;
      lastSync: number;
      localId?: string;
    };
    indexes: { 'by-trip': string };
  };

  // ============================================
  // PHOTO & MEDIA DATA
  // ============================================
  photos: {
    key: string;
    value: {
      id: string;
      tripId: string;
      metadata: PhotoMetadata;
      thumbnailCached: boolean;
      fullCached: boolean;
      lastSync: number;
    };
    indexes: { 'by-trip': string; 'by-cached': string };
  };
  photoAlbums: {
    key: string;
    value: {
      id: string;
      tripId: string;
      data: PhotoAlbum;
      lastSync: number;
    };
    indexes: { 'by-trip': string };
  };

  // ============================================
  // ENTITY RELATIONSHIPS
  // ============================================
  entityLinks: {
    key: string;
    value: {
      id: string;
      tripId: string;
      data: EntityLink;
      lastSync: number;
      localId?: string;
    };
    indexes: { 'by-trip': string; 'by-source': string; 'by-target': string };
  };

  // ============================================
  // TAGS & COMPANIONS
  // ============================================
  tripTags: {
    key: string;
    value: {
      id: string;
      userId: string;
      data: TripTag;
      lastSync: number;
    };
    indexes: { 'by-user': string };
  };
  tagAssignments: {
    key: string;
    value: {
      id: string;
      tripId: string;
      tagId: string;
      lastSync: number;
    };
    indexes: { 'by-trip': string; 'by-tag': string };
  };
  travelCompanions: {
    key: string;
    value: {
      id: string;
      userId: string;
      data: TravelCompanion;
      lastSync: number;
    };
    indexes: { 'by-user': string };
  };
  tripCompanions: {
    key: string;
    value: {
      id: string;
      tripId: string;
      companionId: string;
      lastSync: number;
    };
    indexes: { 'by-trip': string };
  };

  // ============================================
  // CHECKLISTS
  // ============================================
  checklists: {
    key: string;
    value: {
      id: string;
      tripId: string;
      data: Checklist;
      lastSync: number;
      localId?: string;
    };
    indexes: { 'by-trip': string };
  };
  checklistItems: {
    key: string;
    value: {
      id: string;
      checklistId: string;
      data: ChecklistItem;
      lastSync: number;
      localId?: string;
    };
    indexes: { 'by-checklist': string };
  };

  // ============================================
  // CATEGORIES
  // ============================================
  locationCategories: {
    key: string;
    value: {
      id: string;
      userId: string;
      data: LocationCategory;
      lastSync: number;
    };
    indexes: { 'by-user': string };
  };

  // ============================================
  // WEATHER & FLIGHT DATA
  // ============================================
  weatherData: {
    key: string;
    value: {
      id: string;
      tripId: string;
      locationId: string;
      data: WeatherData;
      lastSync: number;
    };
    indexes: { 'by-trip': string; 'by-location': string };
  };
  flightTracking: {
    key: string;
    value: {
      id: string;
      transportationId: string;
      data: FlightTracking;
      lastSync: number;
    };
    indexes: { 'by-transportation': string };
  };

  // ============================================
  // VALIDATION & DISMISSED ISSUES
  // ============================================
  dismissedValidationIssues: {
    key: string;
    value: {
      id: string;
      tripId: string;
      data: DismissedValidationIssue;
      lastSync: number;
    };
    indexes: { 'by-trip': string };
  };

  // ============================================
  // OFFLINE SESSION & SYNC
  // ============================================
  offlineSession: {
    key: string;
    value: {
      id: string;
      userId: number;
      username: string;
      email: string;
      timezone: string;
      sessionToken: string; // Encrypted offline session token
      createdAt: number;
      expiresAt: number; // Extended validity for offline (30 days)
    };
  };
  syncQueue: {
    key: number;
    value: {
      id?: number;
      operation: 'create' | 'update' | 'delete';
      entityType: string;
      entityId: string;
      localId?: string; // For offline-created entities
      tripId: string;
      data: unknown;
      timestamp: number;
      retryCount: number;
      conflictData?: unknown; // Store conflict info if detected
    };
  };
  syncConflicts: {
    key: number;
    value: {
      id?: number;
      entityType: string;
      entityId: string;
      localData: unknown;
      serverData: unknown;
      localTimestamp: number;
      serverTimestamp: number;
      status: 'pending' | 'resolved';
      resolution?: 'local' | 'server' | 'merge';
      resolvedAt?: number;
    };
  };
  metadata: {
    key: string;
    value: {
      key: string;
      value: unknown;
    };
  };

  // ============================================
  // OFFLINE SEARCH INDEX
  // ============================================
  searchIndex: {
    key: string;
    value: {
      id: string;
      entityType: string;
      entityId: string;
      tripId: string;
      searchText: string; // Normalized, lowercase text for searching
      title: string;
      subtitle?: string;
    };
    indexes: { 'by-trip': string; 'by-type': string };
  };
}

const DB_NAME = 'travel-life-offline';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<TravelLifeDB> | null = null;

export async function getDb(): Promise<IDBPDatabase<TravelLifeDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<TravelLifeDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      console.log(`Upgrading IndexedDB from v${oldVersion} to v${newVersion}`);

      // ========================================
      // CORE TRIP DATA (7 stores)
      // ========================================

      // Trips store
      if (!db.objectStoreNames.contains('trips')) {
        const tripStore = db.createObjectStore('trips', { keyPath: 'id' });
        tripStore.createIndex('by-status', 'data.status');
        tripStore.createIndex('by-date', 'data.startDate');
        tripStore.createIndex('by-downloaded', 'downloadedForOffline');
      }

      // Locations store
      if (!db.objectStoreNames.contains('locations')) {
        const locationStore = db.createObjectStore('locations', { keyPath: 'id' });
        locationStore.createIndex('by-trip', 'tripId');
        locationStore.createIndex('by-local-id', 'localId');
      }

      // Activities store
      if (!db.objectStoreNames.contains('activities')) {
        const activityStore = db.createObjectStore('activities', { keyPath: 'id' });
        activityStore.createIndex('by-trip', 'tripId');
      }

      // Transportation store
      if (!db.objectStoreNames.contains('transportation')) {
        const transportStore = db.createObjectStore('transportation', { keyPath: 'id' });
        transportStore.createIndex('by-trip', 'tripId');
      }

      // Lodging store
      if (!db.objectStoreNames.contains('lodging')) {
        const lodgingStore = db.createObjectStore('lodging', { keyPath: 'id' });
        lodgingStore.createIndex('by-trip', 'tripId');
      }

      // Journals store
      if (!db.objectStoreNames.contains('journals')) {
        const journalStore = db.createObjectStore('journals', { keyPath: 'id' });
        journalStore.createIndex('by-trip', 'tripId');
      }

      // ========================================
      // PHOTO & MEDIA DATA (2 stores)
      // ========================================

      // Photos store
      if (!db.objectStoreNames.contains('photos')) {
        const photoStore = db.createObjectStore('photos', { keyPath: 'id' });
        photoStore.createIndex('by-trip', 'tripId');
        photoStore.createIndex('by-cached', 'thumbnailCached');
      }

      // Photo Albums store
      if (!db.objectStoreNames.contains('photoAlbums')) {
        const albumStore = db.createObjectStore('photoAlbums', { keyPath: 'id' });
        albumStore.createIndex('by-trip', 'tripId');
      }

      // ========================================
      // ENTITY RELATIONSHIPS (1 store)
      // ========================================

      // Entity Links store
      if (!db.objectStoreNames.contains('entityLinks')) {
        const linkStore = db.createObjectStore('entityLinks', { keyPath: 'id' });
        linkStore.createIndex('by-trip', 'tripId');
        linkStore.createIndex('by-source', 'data.sourceId');
        linkStore.createIndex('by-target', 'data.targetId');
      }

      // ========================================
      // TAGS & COMPANIONS (4 stores)
      // ========================================

      // Trip Tags store
      if (!db.objectStoreNames.contains('tripTags')) {
        const tagStore = db.createObjectStore('tripTags', { keyPath: 'id' });
        tagStore.createIndex('by-user', 'userId');
      }

      // Tag Assignments store
      if (!db.objectStoreNames.contains('tagAssignments')) {
        const assignStore = db.createObjectStore('tagAssignments', { keyPath: 'id' });
        assignStore.createIndex('by-trip', 'tripId');
        assignStore.createIndex('by-tag', 'tagId');
      }

      // Travel Companions store
      if (!db.objectStoreNames.contains('travelCompanions')) {
        const companionStore = db.createObjectStore('travelCompanions', { keyPath: 'id' });
        companionStore.createIndex('by-user', 'userId');
      }

      // Trip Companions store
      if (!db.objectStoreNames.contains('tripCompanions')) {
        const tcStore = db.createObjectStore('tripCompanions', { keyPath: 'id' });
        tcStore.createIndex('by-trip', 'tripId');
      }

      // ========================================
      // CHECKLISTS (2 stores)
      // ========================================

      // Checklists store
      if (!db.objectStoreNames.contains('checklists')) {
        const checklistStore = db.createObjectStore('checklists', { keyPath: 'id' });
        checklistStore.createIndex('by-trip', 'tripId');
      }

      // Checklist Items store
      if (!db.objectStoreNames.contains('checklistItems')) {
        const itemStore = db.createObjectStore('checklistItems', { keyPath: 'id' });
        itemStore.createIndex('by-checklist', 'checklistId');
      }

      // ========================================
      // CATEGORIES (1 store)
      // ========================================

      // Location Categories store
      if (!db.objectStoreNames.contains('locationCategories')) {
        const catStore = db.createObjectStore('locationCategories', { keyPath: 'id' });
        catStore.createIndex('by-user', 'userId');
      }

      // ========================================
      // WEATHER & FLIGHT DATA (2 stores)
      // ========================================

      // Weather Data store
      if (!db.objectStoreNames.contains('weatherData')) {
        const weatherStore = db.createObjectStore('weatherData', { keyPath: 'id' });
        weatherStore.createIndex('by-trip', 'tripId');
        weatherStore.createIndex('by-location', 'locationId');
      }

      // Flight Tracking store
      if (!db.objectStoreNames.contains('flightTracking')) {
        const flightStore = db.createObjectStore('flightTracking', { keyPath: 'id' });
        flightStore.createIndex('by-transportation', 'transportationId');
      }

      // ========================================
      // VALIDATION (1 store)
      // ========================================

      // Dismissed Validation Issues store
      if (!db.objectStoreNames.contains('dismissedValidationIssues')) {
        const dismissedStore = db.createObjectStore('dismissedValidationIssues', { keyPath: 'id' });
        dismissedStore.createIndex('by-trip', 'tripId');
      }

      // ========================================
      // OFFLINE SESSION & SYNC (4 stores)
      // ========================================

      // Offline Session store
      if (!db.objectStoreNames.contains('offlineSession')) {
        db.createObjectStore('offlineSession', { keyPath: 'id' });
      }

      // Sync Queue store
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
      }

      // Sync Conflicts store
      if (!db.objectStoreNames.contains('syncConflicts')) {
        db.createObjectStore('syncConflicts', { keyPath: 'id', autoIncrement: true });
      }

      // Metadata store
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' });
      }

      // ========================================
      // OFFLINE SEARCH (1 store)
      // ========================================

      // Search Index store
      if (!db.objectStoreNames.contains('searchIndex')) {
        const searchStore = db.createObjectStore('searchIndex', { keyPath: 'id' });
        searchStore.createIndex('by-trip', 'tripId');
        searchStore.createIndex('by-type', 'entityType');
      }

      // ========================================
      // ID MAPPINGS (1 store)
      // ========================================

      // ID Mappings store (local ID -> server ID)
      if (!db.objectStoreNames.contains('idMappings')) {
        const mappingStore = db.createObjectStore('idMappings', { keyPath: 'localId' });
        mappingStore.createIndex('by-server-id', 'serverId');
        mappingStore.createIndex('by-type', 'entityType');
      }

      console.log(`IndexedDB upgrade complete. Created ${db.objectStoreNames.length} stores.`);
    },

    blocked() {
      console.warn('IndexedDB upgrade blocked. Please close other tabs using this app.');
      // Could show a user-facing notification here
    },

    blocking() {
      console.warn('This tab is blocking an IndexedDB upgrade in another tab.');
      // Close our connection to allow the upgrade
      dbInstance?.close();
      dbInstance = null;
    },

    terminated() {
      console.error('IndexedDB connection terminated unexpectedly.');
      dbInstance = null;
    }
  });

  return dbInstance;
}

// Total: 22 object stores covering all entity types
```

#### 2.3 Create Offline Service Layer

Create `src/services/offline.service.ts`:

```typescript
import { getDb } from '../lib/offlineDb';

export class OfflineService {
  // Cache trip data after successful API fetch
  async cacheTrip(trip: Trip): Promise<void> {
    const db = await getDb();
    await db.put('trips', {
      id: trip.id,
      data: trip,
      lastSync: Date.now(),
      version: 1
    });
  }

  // Get cached trip (offline fallback)
  async getCachedTrip(tripId: string): Promise<Trip | null> {
    const db = await getDb();
    const record = await db.get('trips', tripId);
    return record?.data ?? null;
  }

  // Cache all trip entities
  async cacheTripEntities(tripId: string, entities: TripEntities): Promise<void> {
    const db = await getDb();
    const tx = db.transaction(
      ['locations', 'activities', 'transportation', 'lodging', 'journals', 'photos'],
      'readwrite'
    );

    const now = Date.now();

    // Cache each entity type
    for (const location of entities.locations) {
      await tx.objectStore('locations').put({
        id: location.id,
        tripId,
        data: location,
        lastSync: now
      });
    }

    // ... repeat for other entity types

    await tx.done;
  }

  // Get all cached data for a trip (offline mode)
  async getCachedTripData(tripId: string): Promise<TripEntities | null> {
    const db = await getDb();

    const [locations, activities, transportation, lodging, journals] = await Promise.all([
      db.getAllFromIndex('locations', 'by-trip', tripId),
      db.getAllFromIndex('activities', 'by-trip', tripId),
      db.getAllFromIndex('transportation', 'by-trip', tripId),
      db.getAllFromIndex('lodging', 'by-trip', tripId),
      db.getAllFromIndex('journals', 'by-trip', tripId)
    ]);

    return {
      locations: locations.map(r => r.data),
      activities: activities.map(r => r.data),
      transportation: transportation.map(r => r.data),
      lodging: lodging.map(r => r.data),
      journals: journals.map(r => r.data)
    };
  }

  // Add to sync queue (offline changes)
  async queueChange(operation: SyncOperation): Promise<void> {
    const db = await getDb();
    await db.add('syncQueue', {
      ...operation,
      timestamp: Date.now(),
      retryCount: 0
    });
  }

  // Get pending sync operations
  async getPendingChanges(): Promise<SyncOperation[]> {
    const db = await getDb();
    return db.getAll('syncQueue');
  }

  // Remove synced operation
  async removeSyncedChange(id: number): Promise<void> {
    const db = await getDb();
    await db.delete('syncQueue', id);
  }
}

export const offlineService = new OfflineService();
```

#### 2.4 Integrate with TanStack Query

Create `src/lib/queryPersister.ts`:

```typescript
import { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { getDb } from './offlineDb';

export function createIndexedDBPersister(): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      const db = await getDb();
      await db.put('metadata', {
        key: 'queryClient',
        value: client
      });
    },
    restoreClient: async () => {
      const db = await getDb();
      const record = await db.get('metadata', 'queryClient');
      return record?.value as PersistedClient | undefined;
    },
    removeClient: async () => {
      const db = await getDb();
      await db.delete('metadata', 'queryClient');
    }
  };
}
```

#### 2.5 Deliverables - Phase 2

- [ ] IndexedDB schema implemented
- [ ] Offline service layer for all entity types
- [ ] Sync queue for offline changes
- [ ] TanStack Query persistence
- [ ] Automatic caching after API fetches

---

### Phase 3: Service Worker & Caching (Week 3)

**Goal**: Intelligent caching strategies for all resources

#### 3.1 Configure Workbox Runtime Caching

Update `vite.config.ts` workbox section:

```typescript
workbox: {
  globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],

  runtimeCaching: [
    // API responses - network first with cache fallback
    {
      urlPattern: /^https?:\/\/.*\/api\/(trips|locations|activities|transportation|lodging|journals)/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 60 * 60 * 24 * 7 // 1 week
        },
        cacheableResponse: {
          statuses: [0, 200]
        }
      }
    },

    // Photo thumbnails - cache first
    {
      urlPattern: /^https?:\/\/.*\/(uploads\/thumbnails|api\/photos\/.*\/thumbnail)/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'thumbnail-cache',
        expiration: {
          maxEntries: 500,
          maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
        },
        cacheableResponse: {
          statuses: [0, 200]
        }
      }
    },

    // Full photos - network only (user selective caching)
    {
      urlPattern: /^https?:\/\/.*\/uploads\/photos\//,
      handler: 'NetworkOnly'
    },

    // Immich photos - cache first with network fallback
    {
      urlPattern: /^https?:\/\/.*\/api\/immich\//,
      handler: 'CacheFirst',
      options: {
        cacheName: 'immich-cache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 60 * 60 * 24 * 7
        }
      }
    },

    // Nominatim geocoding - cache first (rarely changes)
    {
      urlPattern: /nominatim/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'geocoding-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 30
        }
      }
    },

    // Map tiles - cache first
    {
      urlPattern: /^https?:\/\/.*\/(tile|tiles)\//,
      handler: 'CacheFirst',
      options: {
        cacheName: 'map-tiles',
        expiration: {
          maxEntries: 500,
          maxAgeSeconds: 60 * 60 * 24 * 30
        }
      }
    }
  ],

  // Offline fallback page
  navigateFallback: '/offline.html',
  navigateFallbackDenylist: [/^\/api\//]
}
```

#### 3.2 Create Offline Fallback Page

Create `public/offline.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline - Travel Life</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Manrope', system-ui, sans-serif;
      background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      padding: 1rem;
    }
    .container {
      text-align: center;
      max-width: 400px;
    }
    .icon {
      width: 80px;
      height: 80px;
      margin-bottom: 1.5rem;
      opacity: 0.9;
    }
    h1 {
      font-family: 'Crimson Pro', serif;
      font-size: 1.75rem;
      margin-bottom: 0.75rem;
    }
    p {
      color: rgba(255,255,255,0.8);
      line-height: 1.6;
      margin-bottom: 1.5rem;
    }
    .btn {
      display: inline-block;
      background: #d4a853;
      color: #1a365d;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      text-decoration: none;
      font-weight: 600;
      transition: transform 0.2s;
    }
    .btn:hover { transform: scale(1.05); }
    .cached-trips {
      margin-top: 2rem;
      padding-top: 2rem;
      border-top: 1px solid rgba(255,255,255,0.2);
    }
    .cached-trips h2 {
      font-size: 1rem;
      margin-bottom: 1rem;
      color: rgba(255,255,255,0.9);
    }
    #cached-list {
      text-align: left;
    }
    .trip-link {
      display: block;
      color: #d4a853;
      padding: 0.5rem 0;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <path d="M18.364 5.636a9 9 0 010 12.728m-2.829-2.829a5 5 0 000-7.07m-4.243 4.243a1 1 0 110-1.414" stroke-linecap="round"/>
      <path d="M12 12h.01" stroke-linecap="round"/>
    </svg>
    <h1>You're Offline</h1>
    <p>
      It looks like you've lost your internet connection.
      Don't worry - your cached trips are still available!
    </p>
    <a href="/" class="btn">View Cached Trips</a>

    <div class="cached-trips" id="cached-section" style="display:none">
      <h2>Available Offline:</h2>
      <div id="cached-list"></div>
    </div>
  </div>

  <script>
    // Show cached trips if available
    if ('indexedDB' in window) {
      const request = indexedDB.open('travel-life-offline', 1);
      request.onsuccess = (e) => {
        const db = e.target.result;
        if (db.objectStoreNames.contains('trips')) {
          const tx = db.transaction('trips', 'readonly');
          const store = tx.objectStore('trips');
          const getAll = store.getAll();
          getAll.onsuccess = () => {
            const trips = getAll.result;
            if (trips.length > 0) {
              document.getElementById('cached-section').style.display = 'block';
              const list = document.getElementById('cached-list');
              trips.forEach(t => {
                const a = document.createElement('a');
                a.href = '/trips/' + t.id;
                a.className = 'trip-link';
                a.textContent = t.data.title || 'Untitled Trip';
                list.appendChild(a);
              });
            }
          };
        }
      };
    }
  </script>
</body>
</html>
```

#### 3.3 Add Network Status Hook

Create `src/hooks/useNetworkStatus.ts`:

```typescript
import { useState, useEffect } from 'react';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        // Trigger sync when coming back online
        window.dispatchEvent(new CustomEvent('app:back-online'));
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  return { isOnline, wasOffline };
}
```

#### 3.4 Add Offline Status Banner

Create `src/components/pwa/OfflineBanner.tsx`:

```typescript
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export function OfflineBanner() {
  const { isOnline } = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-amber-500 text-navy-900
                    text-center py-2 px-4 text-sm font-medium z-50">
      <span className="inline-flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M18.364 5.636a9 9 0 010 12.728m-3.536-3.536a4 4 0 000-5.656" />
        </svg>
        You're offline. Changes will sync when you reconnect.
      </span>
    </div>
  );
}
```

#### 3.5 Deliverables - Phase 3

- [ ] Service worker with runtime caching
- [ ] Offline fallback page
- [ ] Network status hook and banner
- [ ] Map tile caching
- [ ] Thumbnail caching working

---

### Phase 4: Sync & Conflict Resolution (Week 4)

**Goal**: Reliable sync of offline changes with conflict handling

#### 4.1 Background Sync Registration

Update service worker to support background sync:

```typescript
// In custom service worker extension
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-changes') {
    event.waitUntil(syncPendingChanges());
  }
});

async function syncPendingChanges() {
  const db = await openDB('travel-life-offline', 1);
  const pending = await db.getAll('syncQueue');

  for (const change of pending) {
    try {
      await processChange(change);
      await db.delete('syncQueue', change.id);
    } catch (error) {
      // Increment retry count, remove after 5 failures
      if (change.retryCount >= 5) {
        await db.delete('syncQueue', change.id);
        // Notify user of failed sync
      } else {
        await db.put('syncQueue', {
          ...change,
          retryCount: change.retryCount + 1
        });
      }
    }
  }
}
```

#### 4.2 Conflict Resolution Strategy

Create `src/lib/conflictResolver.ts`:

```typescript
export type ConflictResolution = 'local' | 'server' | 'merge';

export interface ConflictInfo {
  entityType: string;
  entityId: string;
  localData: unknown;
  serverData: unknown;
  localTimestamp: number;
  serverTimestamp: number;
}

export class ConflictResolver {
  // Auto-resolve obvious conflicts
  autoResolve(conflict: ConflictInfo): ConflictResolution | null {
    // If server hasn't changed, use local
    if (conflict.serverTimestamp < conflict.localTimestamp) {
      return 'local';
    }

    // If only metadata changed (not content), merge
    if (this.isMetadataOnlyChange(conflict)) {
      return 'merge';
    }

    // Require user decision for content conflicts
    return null;
  }

  // Merge non-conflicting fields
  mergeChanges(local: Record<string, unknown>, server: Record<string, unknown>): Record<string, unknown> {
    const merged = { ...server };

    for (const [key, value] of Object.entries(local)) {
      // Keep local changes for fields that didn't change on server
      if (JSON.stringify(server[key]) === JSON.stringify(value)) {
        continue;
      }

      // Local wins for text fields (user's work)
      if (typeof value === 'string' && key !== 'id') {
        merged[key] = value;
      }
    }

    return merged;
  }

  private isMetadataOnlyChange(conflict: ConflictInfo): boolean {
    const metadataFields = ['updatedAt', 'version', 'lastSync'];
    const local = conflict.localData as Record<string, unknown>;
    const server = conflict.serverData as Record<string, unknown>;

    for (const key of Object.keys(local)) {
      if (metadataFields.includes(key)) continue;
      if (JSON.stringify(local[key]) !== JSON.stringify(server[key])) {
        return false;
      }
    }
    return true;
  }
}
```

#### 4.3 Sync Manager

Create `src/services/syncManager.ts`:

```typescript
import { offlineService } from './offline.service';
import { ConflictResolver, ConflictInfo } from '../lib/conflictResolver';

export class SyncManager {
  private resolver = new ConflictResolver();
  private isSyncing = false;
  private pendingConflicts: ConflictInfo[] = [];

  async syncAll(): Promise<SyncResult> {
    if (this.isSyncing) return { status: 'already-syncing' };
    if (!navigator.onLine) return { status: 'offline' };

    this.isSyncing = true;
    const results: SyncResult = {
      status: 'complete',
      synced: 0,
      failed: 0,
      conflicts: []
    };

    try {
      const pending = await offlineService.getPendingChanges();

      for (const change of pending) {
        try {
          const result = await this.processChange(change);

          if (result.conflict) {
            const resolution = this.resolver.autoResolve(result.conflict);

            if (resolution === 'local') {
              await this.pushLocalChange(change);
              results.synced++;
            } else if (resolution === 'merge') {
              await this.pushMergedChange(change, result.conflict);
              results.synced++;
            } else {
              // Requires user decision
              this.pendingConflicts.push(result.conflict);
              results.conflicts.push(result.conflict);
            }
          } else {
            results.synced++;
          }

          await offlineService.removeSyncedChange(change.id!);
        } catch (error) {
          results.failed++;
        }
      }
    } finally {
      this.isSyncing = false;
    }

    return results;
  }

  // ... implementation details
}

export const syncManager = new SyncManager();
```

#### 4.4 Sync Status UI

Create `src/components/pwa/SyncStatus.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { syncManager } from '../../services/syncManager';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export function SyncStatus() {
  const { isOnline } = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const checkPending = async () => {
      const pending = await offlineService.getPendingChanges();
      setPendingCount(pending.length);
    };

    checkPending();
    const interval = setInterval(checkPending, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      handleSync();
    }
  }, [isOnline]);

  const handleSync = async () => {
    setIsSyncing(true);
    await syncManager.syncAll();
    setIsSyncing(false);
  };

  if (pendingCount === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-navy-800
                    rounded-lg shadow-lg p-3 flex items-center gap-3 z-40">
      {isSyncing ? (
        <>
          <div className="animate-spin w-5 h-5 border-2 border-primary-500
                          border-t-transparent rounded-full" />
          <span className="text-sm">Syncing changes...</span>
        </>
      ) : (
        <>
          <span className="text-sm text-navy-600 dark:text-navy-300">
            {pendingCount} pending {pendingCount === 1 ? 'change' : 'changes'}
          </span>
          {isOnline && (
            <button onClick={handleSync} className="btn-primary text-sm py-1">
              Sync Now
            </button>
          )}
        </>
      )}
    </div>
  );
}
```

#### 4.5 Conflict Resolution UI

Create `src/components/pwa/ConflictResolutionModal.tsx`:

```typescript
import { useState } from 'react';
import { ConflictInfo } from '../../lib/conflictResolver';

interface ConflictResolutionModalProps {
  conflict: ConflictInfo;
  onResolve: (resolution: 'local' | 'server' | 'merge') => void;
  onDismiss: () => void;
}

export function ConflictResolutionModal({
  conflict,
  onResolve,
  onDismiss
}: ConflictResolutionModalProps) {
  const [selectedResolution, setSelectedResolution] = useState<'local' | 'server' | 'merge'>('local');

  const getFieldDiff = () => {
    const local = conflict.localData as Record<string, unknown>;
    const server = conflict.serverData as Record<string, unknown>;
    const diffs: Array<{ field: string; local: unknown; server: unknown }> = [];

    const allKeys = new Set([...Object.keys(local), ...Object.keys(server)]);
    for (const key of allKeys) {
      if (JSON.stringify(local[key]) !== JSON.stringify(server[key])) {
        diffs.push({ field: key, local: local[key], server: server[key] });
      }
    }
    return diffs;
  };

  const diffs = getFieldDiff();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-navy-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-navy-200 dark:border-navy-600">
          <h2 className="font-display text-xl font-semibold text-navy-900 dark:text-white">
            Sync Conflict Detected
          </h2>
          <p className="text-sm text-navy-600 dark:text-navy-300 mt-1">
            This {conflict.entityType.toLowerCase()} was modified both offline and on the server.
          </p>
        </div>

        <div className="p-4 overflow-y-auto max-h-[50vh]">
          <div className="space-y-4">
            {diffs.map((diff) => (
              <div key={diff.field} className="border border-navy-200 dark:border-navy-600 rounded-lg overflow-hidden">
                <div className="bg-navy-100 dark:bg-navy-700 px-3 py-2 font-medium text-sm">
                  {diff.field}
                </div>
                <div className="grid grid-cols-2 divide-x divide-navy-200 dark:divide-navy-600">
                  <div className="p-3">
                    <div className="text-xs text-navy-500 mb-1 flex items-center gap-1">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      Your version
                    </div>
                    <div className="text-sm bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                      {String(diff.local ?? '(empty)')}
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="text-xs text-navy-500 mb-1 flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      Server version
                    </div>
                    <div className="text-sm bg-green-50 dark:bg-green-900/20 p-2 rounded">
                      {String(diff.server ?? '(empty)')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-3">
            <label className="flex items-start gap-3 p-3 border border-navy-200 dark:border-navy-600 rounded-lg cursor-pointer hover:bg-navy-50 dark:hover:bg-navy-700/50">
              <input
                type="radio"
                name="resolution"
                value="local"
                checked={selectedResolution === 'local'}
                onChange={() => setSelectedResolution('local')}
                className="mt-1"
              />
              <div>
                <div className="font-medium">Keep my changes</div>
                <div className="text-sm text-navy-500">Overwrite server with your offline changes</div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 border border-navy-200 dark:border-navy-600 rounded-lg cursor-pointer hover:bg-navy-50 dark:hover:bg-navy-700/50">
              <input
                type="radio"
                name="resolution"
                value="server"
                checked={selectedResolution === 'server'}
                onChange={() => setSelectedResolution('server')}
                className="mt-1"
              />
              <div>
                <div className="font-medium">Use server version</div>
                <div className="text-sm text-navy-500">Discard your offline changes</div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 border border-navy-200 dark:border-navy-600 rounded-lg cursor-pointer hover:bg-navy-50 dark:hover:bg-navy-700/50">
              <input
                type="radio"
                name="resolution"
                value="merge"
                checked={selectedResolution === 'merge'}
                onChange={() => setSelectedResolution('merge')}
                className="mt-1"
              />
              <div>
                <div className="font-medium">Merge changes</div>
                <div className="text-sm text-navy-500">Keep both where possible (your text, server metadata)</div>
              </div>
            </label>
          </div>
        </div>

        <div className="p-4 border-t border-navy-200 dark:border-navy-600 flex justify-end gap-3">
          <button onClick={onDismiss} className="btn-secondary">
            Decide Later
          </button>
          <button onClick={() => onResolve(selectedResolution)} className="btn-primary">
            Apply Resolution
          </button>
        </div>
      </div>
    </div>
  );
}
```

#### 4.6 Deliverables - Phase 4

- [ ] Background sync for offline changes
- [ ] Conflict detection
- [ ] Auto-resolution for simple conflicts
- [ ] Conflict resolution UI modal
- [ ] Sync status indicator

---

## Offline Authentication

### The Challenge

Current authentication uses:
- **Access tokens**: Stored in memory (lost on page refresh/close)
- **Refresh tokens**: httpOnly cookies (requires network to refresh)

This means: If a user is offline and closes the PWA, they're logged out and can't access their cached data.

### Solution: Offline Session Persistence

Store an encrypted offline session in IndexedDB that allows read-only access to cached data without network.

#### Offline Session Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      ONLINE LOGIN                            │
├─────────────────────────────────────────────────────────────┤
│  1. User logs in normally                                    │
│  2. Server returns accessToken + sets httpOnly cookie        │
│  3. Store in-memory accessToken (existing)                   │
│  4. Create offlineSession in IndexedDB:                      │
│     - userId, username, email, timezone                      │
│     - sessionToken (server-signed, 30-day validity)          │
│     - expiresAt timestamp                                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    OFFLINE APP OPEN                          │
├─────────────────────────────────────────────────────────────┤
│  1. Check navigator.onLine → false                           │
│  2. Try silentRefresh → fails (no network)                   │
│  3. Load offlineSession from IndexedDB                       │
│  4. Validate sessionToken not expired                        │
│  5. Grant READ-ONLY access to cached data                    │
│  6. Show "Offline Mode" indicator                            │
│  7. Queue any edits for sync when online                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   BACK ONLINE                                │
├─────────────────────────────────────────────────────────────┤
│  1. Detect network restored                                  │
│  2. Attempt silentRefresh with httpOnly cookie               │
│  3. If successful: resume normal operation, sync changes     │
│  4. If failed (cookie expired): prompt re-login              │
│  5. After re-login: sync offline changes                     │
└─────────────────────────────────────────────────────────────┘
```

#### Backend Changes Required

Add endpoint to generate offline session token:

```typescript
// POST /api/auth/offline-session
// Returns a signed token for offline access

interface OfflineSessionResponse {
  sessionToken: string;  // JWT with 30-day expiry
  expiresAt: number;     // Unix timestamp
}

// Token payload includes:
// - userId
// - offlineOnly: true (can't be used for API calls)
// - scope: 'read' (read-only access indicator)
```

#### Frontend Offline Auth Service

```typescript
// src/services/offlineAuth.service.ts

import { getDb } from '../lib/offlineDb';

export class OfflineAuthService {
  async createOfflineSession(user: User): Promise<void> {
    // Request offline session token from server
    const response = await axios.post('/api/auth/offline-session');

    const db = await getDb();
    await db.put('offlineSession', {
      id: 'current',
      userId: user.id,
      username: user.username,
      email: user.email,
      timezone: user.timezone || 'UTC',
      sessionToken: response.data.sessionToken,
      createdAt: Date.now(),
      expiresAt: response.data.expiresAt
    });
  }

  async getOfflineSession(): Promise<OfflineSession | null> {
    const db = await getDb();
    const session = await db.get('offlineSession', 'current');

    if (!session) return null;

    // Check if expired
    if (Date.now() > session.expiresAt) {
      await this.clearOfflineSession();
      return null;
    }

    return session;
  }

  async clearOfflineSession(): Promise<void> {
    const db = await getDb();
    await db.delete('offlineSession', 'current');
  }

  isValidOfflineSession(session: OfflineSession): boolean {
    return session && Date.now() < session.expiresAt;
  }
}

export const offlineAuthService = new OfflineAuthService();
```

#### Auth Store Integration

Update `authStore.ts` to support offline mode:

```typescript
interface AuthState {
  // ... existing state
  isOfflineMode: boolean;
  offlineUser: OfflineUser | null;
}

// In initializeAuth():
async initializeAuth() {
  // Try online refresh first
  if (navigator.onLine) {
    const result = await authService.silentRefresh();
    if (result) {
      this.setAuth(result.user, result.accessToken);
      // Create/update offline session for future offline use
      await offlineAuthService.createOfflineSession(result.user);
      return;
    }
  }

  // Fallback to offline session
  const offlineSession = await offlineAuthService.getOfflineSession();
  if (offlineSession && offlineAuthService.isValidOfflineSession(offlineSession)) {
    this.setOfflineMode(offlineSession);
    return;
  }

  // No valid session - user needs to log in
  this.clearAuth();
}
```

### Security Considerations

| Risk | Mitigation |
|------|------------|
| Stolen device | Offline session expires after 30 days |
| Token tampering | Server-signed JWT, validated on sync |
| Unauthorized edits | Changes queued, verified on sync |
| Stale permissions | Re-validate permissions when online |

---

## Offline Trip Preparation

### "Download for Offline" Feature

Users traveling need to explicitly prepare for offline access before losing connectivity. This is different from automatic caching - it's intentional preparation.

### User Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    TRIP DETAIL PAGE                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │  📥 Download for Offline                             │    │
│  │                                                      │    │
│  │  Prepare this trip for offline access:               │    │
│  │                                                      │    │
│  │  ✓ Trip details & itinerary          (~50 KB)       │    │
│  │  ✓ All locations & activities        (~200 KB)      │    │
│  │  ✓ Transportation & lodging          (~100 KB)      │    │
│  │  ✓ Journal entries                   (~150 KB)      │    │
│  │  ✓ Checklists                        (~20 KB)       │    │
│  │  ✓ Photo thumbnails (150 photos)     (~7.5 MB)      │    │
│  │  ☐ Full resolution photos            (~450 MB)      │    │
│  │  ☐ Map tiles for trip area           (~25 MB)       │    │
│  │                                                      │    │
│  │  Estimated download: 8 MB (without full photos)     │    │
│  │  Storage available: 150 MB                          │    │
│  │                                                      │    │
│  │  [Download Selected]                                 │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Download Progress UI

```typescript
// src/components/pwa/OfflineDownloadModal.tsx

interface DownloadProgress {
  phase: 'metadata' | 'photos' | 'maps' | 'complete';
  current: number;
  total: number;
  currentItem?: string;
  bytesDownloaded: number;
  estimatedTimeRemaining?: number;
}

export function OfflineDownloadModal({
  tripId,
  options,
  onComplete,
  onCancel
}: OfflineDownloadModalProps) {
  const [progress, setProgress] = useState<DownloadProgress>({
    phase: 'metadata',
    current: 0,
    total: 0,
    bytesDownloaded: 0
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-navy-800 rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="font-display text-xl font-semibold mb-4">
          Downloading for Offline
        </h2>

        <div className="space-y-4">
          {/* Phase indicator */}
          <div className="flex items-center gap-2 text-sm">
            <PhaseIcon phase={progress.phase} />
            <span>{getPhaseLabel(progress.phase)}</span>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-navy-200 dark:bg-navy-600 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>

          {/* Stats */}
          <div className="flex justify-between text-sm text-navy-500">
            <span>{progress.current} / {progress.total}</span>
            <span>{formatBytes(progress.bytesDownloaded)}</span>
          </div>

          {/* Current item */}
          {progress.currentItem && (
            <div className="text-xs text-navy-400 truncate">
              {progress.currentItem}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Offline Download Service

```typescript
// src/services/offlineDownload.service.ts

export interface DownloadOptions {
  includeFullPhotos: boolean;
  includeMapTiles: boolean;
  photoQuality: 'thumbnail' | 'medium' | 'full';
}

export class OfflineDownloadService {
  async downloadTripForOffline(
    tripId: string,
    options: DownloadOptions,
    onProgress: (progress: DownloadProgress) => void
  ): Promise<void> {
    const db = await getDb();

    // Phase 1: Download trip metadata
    onProgress({ phase: 'metadata', current: 0, total: 8, bytesDownloaded: 0 });

    const trip = await tripService.getTrip(tripId);
    await offlineService.cacheTrip(trip);
    onProgress({ phase: 'metadata', current: 1, total: 8, bytesDownloaded: 5000 });

    // Download all related entities
    const [locations, activities, transportation, lodging, journals, checklists, entityLinks] =
      await Promise.all([
        locationService.getLocations(tripId),
        activityService.getActivities(tripId),
        transportationService.getTransportation(tripId),
        lodgingService.getLodging(tripId),
        journalService.getJournals(tripId),
        checklistService.getChecklists(tripId),
        entityLinkService.getTripLinks(tripId)
      ]);

    // Cache each entity type...
    await offlineService.cacheLocations(tripId, locations);
    onProgress({ phase: 'metadata', current: 2, total: 8, bytesDownloaded: 50000 });

    // ... continue for all entity types

    // Phase 2: Download photos
    if (options.includeFullPhotos || options.photoQuality !== 'thumbnail') {
      const photos = await photoService.getTripPhotos(tripId);
      onProgress({ phase: 'photos', current: 0, total: photos.length, bytesDownloaded: 100000 });

      for (let i = 0; i < photos.length; i++) {
        await this.cachePhoto(photos[i], options.photoQuality);
        onProgress({
          phase: 'photos',
          current: i + 1,
          total: photos.length,
          currentItem: photos[i].filename,
          bytesDownloaded: 100000 + (i * 50000)
        });
      }
    }

    // Phase 3: Download map tiles (if requested)
    if (options.includeMapTiles) {
      await this.cacheMapTilesForTrip(tripId, locations, onProgress);
    }

    // Mark trip as downloaded
    await db.put('trips', {
      ...await db.get('trips', tripId),
      downloadedForOffline: true
    });

    onProgress({ phase: 'complete', current: 1, total: 1, bytesDownloaded: 0 });
  }

  async removeOfflineTrip(tripId: string): Promise<void> {
    const db = await getDb();

    // Remove all cached data for this trip
    const stores = ['locations', 'activities', 'transportation', 'lodging',
                    'journals', 'photos', 'checklists', 'entityLinks'];

    for (const store of stores) {
      const items = await db.getAllFromIndex(store as any, 'by-trip', tripId);
      for (const item of items) {
        await db.delete(store as any, item.id);
      }
    }

    // Clear photo cache
    const cache = await caches.open('photo-cache');
    // ... delete cached photos for this trip

    // Update trip record
    const trip = await db.get('trips', tripId);
    if (trip) {
      await db.put('trips', { ...trip, downloadedForOffline: false });
    }
  }

  async getOfflineStorageUsage(): Promise<StorageUsage> {
    const estimate = await navigator.storage.estimate();
    const db = await getDb();

    // Count items in each store
    const trips = await db.count('trips');
    const photos = await db.count('photos');

    return {
      used: estimate.usage || 0,
      quota: estimate.quota || 0,
      tripCount: trips,
      photoCount: photos,
      percentUsed: ((estimate.usage || 0) / (estimate.quota || 1)) * 100
    };
  }
}
```

### Offline Status Indicator on Trip Card

```typescript
// Show download status on trip cards
<div className="trip-card">
  {trip.downloadedForOffline && (
    <div className="absolute top-2 right-2 bg-green-500 text-white
                    text-xs px-2 py-1 rounded-full flex items-center gap-1">
      <CloudOffIcon className="w-3 h-3" />
      Available Offline
    </div>
  )}
  {/* ... rest of card */}
</div>
```

---

## Offline ID Generation Strategy

### The Problem

When creating entities offline:
- Server uses auto-increment integers for IDs
- We can't predict what ID the server will assign
- We need a temporary ID to reference the entity locally
- After sync, we need to update all references to use the real ID

### Solution: UUID + ID Mapping

```typescript
// src/lib/offlineId.ts

import { v4 as uuidv4 } from 'uuid';

// Generate a local ID for offline-created entities
export function generateLocalId(): string {
  return `local_${uuidv4()}`;
}

// Check if an ID is a local (offline-created) ID
export function isLocalId(id: string): boolean {
  return typeof id === 'string' && id.startsWith('local_');
}

// ID mapping stored in IndexedDB
interface IdMapping {
  localId: string;
  serverId: string;
  entityType: string;
  createdAt: number;
}
```

### Offline Entity Creation Flow

```typescript
// When creating an entity offline:

async function createActivityOffline(tripId: string, data: ActivityInput): Promise<Activity> {
  const localId = generateLocalId();

  const activity: Activity = {
    id: localId, // Temporary local ID
    tripId,
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Store in IndexedDB
  const db = await getDb();
  await db.put('activities', {
    id: localId,
    tripId,
    data: activity,
    lastSync: 0, // Never synced
    localId: localId
  });

  // Queue for sync
  await offlineService.queueChange({
    operation: 'create',
    entityType: 'activity',
    entityId: localId,
    localId: localId,
    tripId,
    data: data // Original input data (without generated fields)
  });

  return activity;
}
```

### Sync and ID Resolution

```typescript
// When syncing offline-created entity:

async function syncOfflineCreate(change: SyncOperation): Promise<void> {
  // Send to server (without local ID)
  const response = await api.post(`/trips/${change.tripId}/activities`, change.data);
  const serverEntity = response.data;

  // Store ID mapping
  const db = await getDb();
  await db.put('idMappings', {
    localId: change.localId!,
    serverId: serverEntity.id,
    entityType: change.entityType,
    createdAt: Date.now()
  });

  // Update local entity with server ID
  const localRecord = await db.get('activities', change.localId!);
  if (localRecord) {
    // Delete old record with local ID
    await db.delete('activities', change.localId!);

    // Create new record with server ID
    await db.put('activities', {
      id: serverEntity.id,
      tripId: change.tripId,
      data: serverEntity,
      lastSync: Date.now(),
      localId: undefined // Clear local ID
    });
  }

  // Update any references to this entity
  await updateEntityReferences(change.localId!, serverEntity.id, change.entityType);
}

// Update references in other entities (e.g., EntityLinks)
async function updateEntityReferences(
  localId: string,
  serverId: string,
  entityType: string
): Promise<void> {
  const db = await getDb();

  // Update EntityLinks that reference this entity
  const links = await db.getAll('entityLinks');
  for (const link of links) {
    let updated = false;

    if (link.data.sourceId === localId && link.data.sourceType === entityType.toUpperCase()) {
      link.data.sourceId = serverId;
      updated = true;
    }
    if (link.data.targetId === localId && link.data.targetType === entityType.toUpperCase()) {
      link.data.targetId = serverId;
      updated = true;
    }

    if (updated) {
      await db.put('entityLinks', link);
    }
  }

  // Update sync queue items that reference this entity
  const queue = await db.getAll('syncQueue');
  for (const item of queue) {
    if (item.entityId === localId) {
      item.entityId = serverId;
      await db.put('syncQueue', item);
    }
  }
}
```

---

## iOS and Safari Limitations

### Critical Limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| **7-day cache eviction** | If PWA unused for 7 days, all cached data may be deleted | Show reminder to open app periodically |
| **No Background Sync** | Can't sync in background when app closed | Sync on app open, show pending indicator |
| **No Push Notifications** | Can't notify about flight changes, reminders | Use email fallback for critical alerts |
| **50MB Cache API limit** | Limited photo caching | Prioritize thumbnails, fewer full photos |
| **No beforeinstallprompt** | Can't show custom install prompt | Use Safari's "Add to Home Screen" instructions |
| **No persistent storage** | Storage can be evicted under pressure | Request persistent storage, warn users |

### iOS-Specific UI Components

```typescript
// src/components/pwa/IOSInstallInstructions.tsx

export function IOSInstallInstructions() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Detect iOS Safari
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

    if (isIOS && isSafari && !isStandalone) {
      // Check if already dismissed
      const dismissed = localStorage.getItem('ios-install-dismissed');
      if (!dismissed) {
        setShow(true);
      }
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-navy-800
                    border-t border-navy-200 dark:border-navy-600 p-4 z-50
                    safe-area-inset-bottom">
      <div className="max-w-md mx-auto">
        <h3 className="font-display font-semibold text-lg mb-2">
          Install Travel Life
        </h3>
        <p className="text-sm text-navy-600 dark:text-navy-300 mb-3">
          Add to your home screen for the best experience:
        </p>
        <ol className="text-sm space-y-2 mb-4">
          <li className="flex items-center gap-2">
            <span className="bg-navy-100 dark:bg-navy-700 rounded px-2 py-1">1</span>
            Tap the <ShareIcon className="w-5 h-5 inline text-blue-500" /> Share button
          </li>
          <li className="flex items-center gap-2">
            <span className="bg-navy-100 dark:bg-navy-700 rounded px-2 py-1">2</span>
            Scroll down and tap "Add to Home Screen"
          </li>
          <li className="flex items-center gap-2">
            <span className="bg-navy-100 dark:bg-navy-700 rounded px-2 py-1">3</span>
            Tap "Add" to confirm
          </li>
        </ol>
        <button
          onClick={() => {
            localStorage.setItem('ios-install-dismissed', 'true');
            setShow(false);
          }}
          className="btn-secondary w-full"
        >
          Maybe Later
        </button>
      </div>
    </div>
  );
}
```

### iOS Storage Warning

```typescript
// src/components/pwa/IOSStorageWarning.tsx

export function IOSStorageWarning() {
  const [lastOpened, setLastOpened] = useState<number | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (!isIOS) return;

    // Check last opened time
    const stored = localStorage.getItem('last-app-open');
    const last = stored ? parseInt(stored, 10) : null;
    setLastOpened(last);

    // Update last opened
    localStorage.setItem('last-app-open', Date.now().toString());

    // Warn if > 5 days since last open
    if (last && Date.now() - last > 5 * 24 * 60 * 60 * 1000) {
      setShowWarning(true);
    }
  }, []);

  if (!showWarning) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200
                    dark:border-amber-700 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-medium text-amber-800 dark:text-amber-200">
            Keep Your Data Safe
          </h4>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
            On iOS, Safari may delete cached data if the app isn't used for 7 days.
            Open Travel Life at least once a week to keep your offline trips available.
          </p>
          <button
            onClick={() => setShowWarning(false)}
            className="text-sm text-amber-600 hover:text-amber-800 mt-2"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Request Persistent Storage

```typescript
// src/lib/storage.ts

export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage || !navigator.storage.persist) {
    return false;
  }

  // Check if already persistent
  const isPersisted = await navigator.storage.persisted();
  if (isPersisted) return true;

  // Request persistence
  const granted = await navigator.storage.persist();

  if (!granted) {
    console.warn('Persistent storage not granted. Data may be evicted under storage pressure.');
  }

  return granted;
}

// Call on app startup
useEffect(() => {
  requestPersistentStorage().then(granted => {
    if (!granted) {
      // Show subtle warning to user
      setShowStorageWarning(true);
    }
  });
}, []);
```

---

## Offline Search

### Local Search Implementation

Since global search (Ctrl+K) won't work offline, we need a local search index.

### Search Index Population

```typescript
// src/services/searchIndex.service.ts

export class SearchIndexService {
  // Build search index for a trip
  async indexTrip(tripId: string): Promise<void> {
    const db = await getDb();

    // Get all cached entities for this trip
    const [trip, locations, activities, journals] = await Promise.all([
      db.get('trips', tripId),
      db.getAllFromIndex('locations', 'by-trip', tripId),
      db.getAllFromIndex('activities', 'by-trip', tripId),
      db.getAllFromIndex('journals', 'by-trip', tripId)
    ]);

    // Index trip
    if (trip) {
      await db.put('searchIndex', {
        id: `trip_${tripId}`,
        entityType: 'trip',
        entityId: tripId,
        tripId,
        searchText: this.normalizeText([trip.data.title, trip.data.description]),
        title: trip.data.title,
        subtitle: trip.data.status
      });
    }

    // Index locations
    for (const loc of locations) {
      await db.put('searchIndex', {
        id: `location_${loc.id}`,
        entityType: 'location',
        entityId: loc.id,
        tripId,
        searchText: this.normalizeText([loc.data.name, loc.data.address, loc.data.notes]),
        title: loc.data.name,
        subtitle: loc.data.category
      });
    }

    // Index activities
    for (const act of activities) {
      await db.put('searchIndex', {
        id: `activity_${act.id}`,
        entityType: 'activity',
        entityId: act.id,
        tripId,
        searchText: this.normalizeText([act.data.name, act.data.description, act.data.notes]),
        title: act.data.name,
        subtitle: act.data.category
      });
    }

    // Index journal entries
    for (const journal of journals) {
      await db.put('searchIndex', {
        id: `journal_${journal.id}`,
        entityType: 'journal',
        entityId: journal.id,
        tripId,
        searchText: this.normalizeText([journal.data.title, journal.data.content]),
        title: journal.data.title || 'Journal Entry',
        subtitle: journal.data.date
      });
    }
  }

  // Search local index
  async search(query: string, tripId?: string): Promise<SearchResult[]> {
    const db = await getDb();
    const normalizedQuery = query.toLowerCase().trim();

    if (!normalizedQuery) return [];

    // Get all index entries (optionally filtered by trip)
    let entries;
    if (tripId) {
      entries = await db.getAllFromIndex('searchIndex', 'by-trip', tripId);
    } else {
      entries = await db.getAll('searchIndex');
    }

    // Simple text matching
    const results = entries
      .filter(entry => entry.searchText.includes(normalizedQuery))
      .map(entry => ({
        entityType: entry.entityType,
        entityId: entry.entityId,
        tripId: entry.tripId,
        title: entry.title,
        subtitle: entry.subtitle,
        // Calculate relevance score
        score: this.calculateScore(entry.searchText, normalizedQuery)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20); // Limit results

    return results;
  }

  private normalizeText(parts: (string | undefined | null)[]): string {
    return parts
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private calculateScore(text: string, query: string): number {
    let score = 0;

    // Exact match bonus
    if (text.includes(query)) score += 10;

    // Word start match bonus
    const words = text.split(' ');
    for (const word of words) {
      if (word.startsWith(query)) score += 5;
    }

    // Frequency bonus
    const matches = text.split(query).length - 1;
    score += matches * 2;

    return score;
  }
}
```

### Offline-Aware Search Component

```typescript
// Update GlobalSearch to use local search when offline

export function GlobalSearch() {
  const { isOnline } = useNetworkStatus();
  const [results, setResults] = useState<SearchResult[]>([]);

  const handleSearch = async (query: string) => {
    if (isOnline) {
      // Use server search
      const response = await searchService.search(query);
      setResults(response.data);
    } else {
      // Use local search
      const localResults = await searchIndexService.search(query);
      setResults(localResults);
    }
  };

  return (
    <div>
      {!isOnline && (
        <div className="text-xs text-amber-500 mb-2 flex items-center gap-1">
          <CloudOffIcon className="w-3 h-3" />
          Searching offline data only
        </div>
      )}
      {/* ... rest of search UI */}
    </div>
  );
}
```

---

## Map Pre-Caching

### Tile Pre-Cache Service

```typescript
// src/services/mapCache.service.ts

interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

export class MapCacheService {
  private readonly TILE_URL_TEMPLATE = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  private readonly CACHE_NAME = 'map-tiles';

  // Calculate tiles needed for a bounding box at given zoom levels
  getTilesForBoundingBox(bbox: BoundingBox, minZoom: number, maxZoom: number): TileCoord[] {
    const tiles: TileCoord[] = [];

    for (let zoom = minZoom; zoom <= maxZoom; zoom++) {
      const minTile = this.latLngToTile(bbox.north, bbox.west, zoom);
      const maxTile = this.latLngToTile(bbox.south, bbox.east, zoom);

      for (let x = minTile.x; x <= maxTile.x; x++) {
        for (let y = minTile.y; y <= maxTile.y; y++) {
          tiles.push({ x, y, z: zoom });
        }
      }
    }

    return tiles;
  }

  // Calculate bounding box from trip locations with padding
  getBoundingBoxForTrip(locations: Location[], padding: number = 0.1): BoundingBox {
    if (locations.length === 0) {
      throw new Error('No locations to calculate bounding box');
    }

    let north = -90, south = 90, east = -180, west = 180;

    for (const loc of locations) {
      if (loc.latitude > north) north = loc.latitude;
      if (loc.latitude < south) south = loc.latitude;
      if (loc.longitude > east) east = loc.longitude;
      if (loc.longitude < west) west = loc.longitude;
    }

    // Add padding
    const latPadding = (north - south) * padding;
    const lngPadding = (east - west) * padding;

    return {
      north: north + latPadding,
      south: south - latPadding,
      east: east + lngPadding,
      west: west - lngPadding
    };
  }

  // Estimate cache size for tiles
  estimateCacheSize(tileCount: number): number {
    // Average tile size ~20KB
    return tileCount * 20 * 1024;
  }

  // Cache tiles for a trip
  async cacheTilesForTrip(
    tripId: string,
    locations: Location[],
    onProgress: (current: number, total: number) => void
  ): Promise<void> {
    const bbox = this.getBoundingBoxForTrip(locations);

    // Cache zoom levels 10-16 (city to street level)
    const tiles = this.getTilesForBoundingBox(bbox, 10, 16);

    const cache = await caches.open(this.CACHE_NAME);

    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      const url = this.getTileUrl(tile);

      try {
        // Check if already cached
        const existing = await cache.match(url);
        if (!existing) {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response);
          }
        }
      } catch (error) {
        console.warn(`Failed to cache tile: ${url}`, error);
      }

      onProgress(i + 1, tiles.length);

      // Small delay to avoid rate limiting
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  // Convert lat/lng to tile coordinates
  private latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
    const x = Math.floor((lng + 180) / 360 * Math.pow(2, zoom));
    const y = Math.floor(
      (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI)
      / 2 * Math.pow(2, zoom)
    );
    return { x, y };
  }

  private getTileUrl(tile: TileCoord): string {
    const subdomains = ['a', 'b', 'c'];
    const s = subdomains[Math.abs(tile.x + tile.y) % subdomains.length];
    return `https://${s}.tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`;
  }
}
```

---

## Data Freshness Indicators

### Last Synced Display

```typescript
// src/components/pwa/DataFreshnessIndicator.tsx

interface DataFreshnessIndicatorProps {
  lastSync: number;
  entityName?: string;
}

export function DataFreshnessIndicator({ lastSync, entityName }: DataFreshnessIndicatorProps) {
  const { isOnline } = useNetworkStatus();
  const age = Date.now() - lastSync;

  // Thresholds
  const FRESH = 5 * 60 * 1000;        // 5 minutes
  const STALE = 60 * 60 * 1000;       // 1 hour
  const VERY_STALE = 24 * 60 * 60 * 1000; // 1 day

  const getStatus = () => {
    if (age < FRESH) return { color: 'green', label: 'Fresh' };
    if (age < STALE) return { color: 'yellow', label: 'Recent' };
    if (age < VERY_STALE) return { color: 'orange', label: 'May be outdated' };
    return { color: 'red', label: 'Outdated' };
  };

  const status = getStatus();

  return (
    <div className="flex items-center gap-2 text-xs text-navy-500">
      {!isOnline && (
        <span className="flex items-center gap-1">
          <CloudOffIcon className="w-3 h-3" />
          Offline
        </span>
      )}
      <span className="flex items-center gap-1">
        <span className={`w-2 h-2 rounded-full bg-${status.color}-500`} />
        Last synced {formatRelativeTime(lastSync)}
      </span>
      {age > STALE && isOnline && (
        <button
          onClick={() => window.location.reload()}
          className="text-primary-500 hover:text-primary-600"
        >
          Refresh
        </button>
      )}
    </div>
  );
}
```

### Trip Detail Freshness Warning

```typescript
// Show on trip detail page when data might be stale

export function TripDetailPage() {
  const { trip, lastSync } = useCachedTrip(tripId);
  const { isOnline } = useNetworkStatus();

  const isStale = Date.now() - lastSync > 60 * 60 * 1000; // 1 hour

  return (
    <div>
      {!isOnline && isStale && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500
                        p-4 mb-4">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                Viewing cached data
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                This trip was last synced {formatRelativeTime(lastSync)}.
                Some information may have changed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ... rest of trip detail */}
    </div>
  );
}
```

---

## Database Migration Strategy

### Version Management

```typescript
// src/lib/offlineDb.ts

const DB_NAME = 'travel-life-offline';
const DB_VERSION = 2; // Increment for schema changes

export async function getDb(): Promise<IDBPDatabase<TravelLifeDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<TravelLifeDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      console.log(`Upgrading IndexedDB from v${oldVersion} to v${newVersion}`);

      // Version 1 → 2 migration
      if (oldVersion < 2) {
        // Add new stores
        if (!db.objectStoreNames.contains('entityLinks')) {
          const store = db.createObjectStore('entityLinks', { keyPath: 'id' });
          store.createIndex('by-trip', 'tripId');
          store.createIndex('by-source', 'data.sourceId');
          store.createIndex('by-target', 'data.targetId');
        }

        // Add new indexes to existing stores
        if (db.objectStoreNames.contains('trips')) {
          const tripStore = transaction.objectStore('trips');
          if (!tripStore.indexNames.contains('by-downloaded')) {
            tripStore.createIndex('by-downloaded', 'downloadedForOffline');
          }
        }
      }

      // Version 2 → 3 migration (future)
      if (oldVersion < 3) {
        // ... future migrations
      }
    },

    blocked() {
      // Another tab has the database open with an older version
      console.warn('Database upgrade blocked. Please close other tabs.');
    },

    blocking() {
      // This tab is blocking another tab from upgrading
      console.warn('This tab is blocking a database upgrade.');
      dbInstance?.close();
      dbInstance = null;
    },

    terminated() {
      // Browser terminated the database connection unexpectedly
      console.error('Database connection terminated unexpectedly.');
      dbInstance = null;
    }
  });

  return dbInstance;
}
```

### Migration Utilities

```typescript
// src/lib/dbMigration.ts

export async function runDataMigrations(): Promise<void> {
  const db = await getDb();

  // Check current data version
  const metadata = await db.get('metadata', 'dataVersion');
  const currentVersion = metadata?.value as number || 0;

  // Run migrations in order
  if (currentVersion < 1) {
    await migrateV0ToV1(db);
    await db.put('metadata', { key: 'dataVersion', value: 1 });
  }

  if (currentVersion < 2) {
    await migrateV1ToV2(db);
    await db.put('metadata', { key: 'dataVersion', value: 2 });
  }
}

async function migrateV0ToV1(db: IDBPDatabase<TravelLifeDB>): Promise<void> {
  // Example: Normalize all stored data to new format
  const trips = await db.getAll('trips');
  for (const trip of trips) {
    // Add new required fields with defaults
    if (trip.downloadedForOffline === undefined) {
      trip.downloadedForOffline = false;
      await db.put('trips', trip);
    }
  }
}

async function migrateV1ToV2(db: IDBPDatabase<TravelLifeDB>): Promise<void> {
  // Future migration logic
}
```

---

## Storage Management

### Storage Usage Dashboard

```typescript
// src/components/pwa/StorageManagement.tsx

export function StorageManagement() {
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [breakdown, setBreakdown] = useState<StorageBreakdown | null>(null);

  useEffect(() => {
    loadStorageInfo();
  }, []);

  const loadStorageInfo = async () => {
    const estimate = await navigator.storage.estimate();
    const detailed = await getDetailedStorageBreakdown();

    setUsage({
      used: estimate.usage || 0,
      quota: estimate.quota || 0,
      percentUsed: ((estimate.usage || 0) / (estimate.quota || 1)) * 100
    });
    setBreakdown(detailed);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-lg font-semibold mb-3">Storage Usage</h3>

        {/* Overall usage bar */}
        <div className="h-4 bg-navy-200 dark:bg-navy-600 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              usage.percentUsed > 90 ? 'bg-red-500' :
              usage.percentUsed > 70 ? 'bg-amber-500' : 'bg-green-500'
            }`}
            style={{ width: `${usage.percentUsed}%` }}
          />
        </div>

        <div className="flex justify-between text-sm text-navy-500 mt-1">
          <span>{formatBytes(usage.used)} used</span>
          <span>{formatBytes(usage.quota)} available</span>
        </div>
      </div>

      {/* Breakdown by category */}
      <div>
        <h4 className="font-medium mb-2">Storage Breakdown</h4>
        <div className="space-y-2">
          {breakdown && (
            <>
              <StorageRow label="Trip Data" size={breakdown.tripData} icon={<MapIcon />} />
              <StorageRow label="Photo Thumbnails" size={breakdown.thumbnails} icon={<PhotoIcon />} />
              <StorageRow label="Full Photos" size={breakdown.fullPhotos} icon={<PhotoIcon />} />
              <StorageRow label="Map Tiles" size={breakdown.mapTiles} icon={<GlobeIcon />} />
              <StorageRow label="Search Index" size={breakdown.searchIndex} icon={<SearchIcon />} />
            </>
          )}
        </div>
      </div>

      {/* Clear cache options */}
      <div className="border-t border-navy-200 dark:border-navy-600 pt-4">
        <h4 className="font-medium mb-3">Manage Storage</h4>
        <div className="space-y-2">
          <button
            onClick={() => clearCache('thumbnails')}
            className="btn-secondary w-full justify-between"
          >
            <span>Clear Thumbnail Cache</span>
            <span className="text-navy-500">{formatBytes(breakdown?.thumbnails || 0)}</span>
          </button>
          <button
            onClick={() => clearCache('fullPhotos')}
            className="btn-secondary w-full justify-between"
          >
            <span>Clear Full Photo Cache</span>
            <span className="text-navy-500">{formatBytes(breakdown?.fullPhotos || 0)}</span>
          </button>
          <button
            onClick={() => clearCache('mapTiles')}
            className="btn-secondary w-full justify-between"
          >
            <span>Clear Map Tile Cache</span>
            <span className="text-navy-500">{formatBytes(breakdown?.mapTiles || 0)}</span>
          </button>
          <button
            onClick={clearAllOfflineData}
            className="btn-danger w-full"
          >
            Clear All Offline Data
          </button>
        </div>
      </div>

      {/* Storage warnings */}
      {usage.percentUsed > 80 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200
                        dark:border-amber-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                Storage Almost Full
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Consider clearing some cached data to free up space.
                Old thumbnails and map tiles are safe to remove.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Automatic Cleanup

```typescript
// src/services/storageCleanup.service.ts

export class StorageCleanupService {
  private readonly WARNING_THRESHOLD = 0.8;  // 80%
  private readonly CRITICAL_THRESHOLD = 0.95; // 95%

  async checkAndCleanup(): Promise<void> {
    const estimate = await navigator.storage.estimate();
    const percentUsed = (estimate.usage || 0) / (estimate.quota || 1);

    if (percentUsed > this.CRITICAL_THRESHOLD) {
      await this.aggressiveCleanup();
    } else if (percentUsed > this.WARNING_THRESHOLD) {
      await this.gentleCleanup();
    }
  }

  private async gentleCleanup(): Promise<void> {
    // Remove old map tiles (> 30 days)
    // Remove thumbnails for trips not downloaded for offline
    // Clear search index for old trips
  }

  private async aggressiveCleanup(): Promise<void> {
    // Remove all full photos
    // Remove map tiles
    // Keep only explicitly downloaded trips
    // Warn user
  }
}
```

---

## Technical Specifications

### Browser Support

| Browser | Min Version | Notes |
|---------|-------------|-------|
| Chrome | 67+ | Full support |
| Firefox | 67+ | Full support |
| Safari | 14+ | Limited background sync |
| Edge | 79+ | Full support |
| iOS Safari | 14.5+ | Add to Home Screen only |

### Storage Quotas

| Storage Type | Chrome | Firefox | Safari |
|--------------|--------|---------|--------|
| IndexedDB | 60% of disk | 50% of disk | 1GB |
| Cache API | 60% of disk | 50% of disk | 50MB |
| localStorage | 10MB | 10MB | 5MB |

### Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| First Contentful Paint | < 1.5s | Lighthouse |
| Time to Interactive | < 3s | Lighthouse |
| Offline page load | < 500ms | Chrome DevTools |
| Sync queue processing | < 30s for 50 items | Manual testing |

---

## Offline Feature Scope

### Fully Offline Capable

| Feature | Read | Create | Edit | Delete | Notes |
|---------|------|--------|------|--------|-------|
| View trips | ✅ | - | - | - | Downloaded trips only |
| Trip details | ✅ | - | ✅ | - | Edit title, dates, notes |
| Locations | ✅ | ✅ | ✅ | ✅ | Full CRUD offline |
| Activities | ✅ | ✅ | ✅ | ✅ | Full CRUD offline |
| Transportation | ✅ | ✅ | ✅ | ✅ | Full CRUD offline |
| Lodging | ✅ | ✅ | ✅ | ✅ | Full CRUD offline |
| Journal entries | ✅ | ✅ | ✅ | ✅ | Full CRUD offline |
| Checklists | ✅ | ✅ | ✅ | ✅ | Full CRUD offline |
| Checklist items | ✅ | ✅ | ✅ | ✅ | Toggle completion offline |
| Entity links | ✅ | ✅ | - | ✅ | Link photos to locations |
| View photos | ✅ | - | - | - | Cached thumbnails/full |
| View albums | ✅ | - | - | - | Cached album data |
| View timeline | ✅ | - | - | - | Full timeline view |
| Search | ✅ | - | - | - | Local search index |
| Tags (view) | ✅ | - | - | - | View assigned tags |
| Companions (view) | ✅ | - | - | - | View trip companions |

### Requires Network

| Feature | Reason |
|---------|--------|
| Login/Register | Security - requires server validation |
| Trip creation | Complex workflow, server-generated IDs |
| Photo upload | File size, server storage |
| Geocoding search | External Nominatim API |
| Immich browsing | External service connection |
| Collaboration | Real-time multi-user sync |
| Backup/Restore | Large data transfer |
| Tag management | User-global, affects multiple trips |
| Companion management | User-global, affects multiple trips |
| Weather fetch | External OpenWeatherMap API |
| Flight tracking update | External AviationStack API |

### Degraded Experience

| Feature | Offline Behavior |
|---------|------------------|
| Maps | Cached tiles only, no search, no new geocoding |
| Weather | Last cached data, shows "last updated" timestamp |
| Flight tracking | Last known status, shows "last checked" timestamp |
| Photo lightbox | Thumbnails only unless explicitly cached |
| Trip health check | Works with cached data, no travel time recalculation |
| Global search | Local index only, may miss recent server changes |
| Statistics dashboard | Cached data only |

---

## Data Synchronization Strategy

### Sync Priority

1. **Critical**: Trip metadata, authentication state
2. **High**: Locations, transportation, lodging (itinerary)
3. **Medium**: Activities, journal entries
4. **Low**: Photos (metadata only), preferences

### Sync Triggers

| Trigger | Action |
|---------|--------|
| App launch (online) | Background sync check |
| Network restored | Immediate sync attempt |
| Manual sync button | User-initiated sync |
| Before navigation away | Flush pending queue |
| Every 5 minutes (online) | Background sync |

### Conflict Scenarios

| Scenario | Resolution |
|----------|------------|
| Same field edited | Last-write-wins with notification |
| Entity deleted on server | Remove local, notify user |
| Entity deleted locally | Re-fetch if server has updates |
| New entity on both | Keep both with conflict flag |

---

## Photo Caching Strategy

### Automatic Caching

- **Thumbnails**: Always cache (50KB each, max 500)
- **Recently viewed**: Cache last 20 full photos
- **Trip cover photos**: Always cache

### User-Selective Caching

- "Download for offline" button per album
- Storage usage indicator
- Clear cache option in settings

### Cache Management

```typescript
interface PhotoCacheConfig {
  maxThumbnails: 500;          // ~25MB
  maxFullPhotos: 20;           // ~60MB
  maxTotalSize: 100 * 1024 * 1024; // 100MB
  thumbnailMaxAge: 30 * 24 * 60 * 60; // 30 days
  fullPhotoMaxAge: 7 * 24 * 60 * 60;  // 7 days
}
```

---

## Offline Trip Creation

### The Challenge

Creating a new trip offline is complex because:
1. Server generates auto-increment IDs
2. Trip creation triggers default checklist population
3. New trips need to appear in dashboard immediately
4. Sync must handle the temporary ID replacement

### Solution: Limited Offline Trip Creation

Support basic trip creation offline with clear limitations:

```typescript
// src/services/offlineTrip.service.ts

import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../lib/offlineDb';

interface OfflineTripCreate {
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  timezone?: string;
  status: 'DREAM' | 'PLANNING';
}

export class OfflineTripService {
  async createTripOffline(data: OfflineTripCreate, userId: string): Promise<string> {
    const db = await getDb();
    const localId = `offline-${uuidv4()}`;

    // Create minimal trip record
    const offlineTrip = {
      id: localId,
      data: {
        ...data,
        id: localId,
        userId,
        status: data.status || 'DREAM',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Mark as offline-created for special handling
        _offlineCreated: true,
        _pendingSync: true
      },
      lastSync: 0, // Never synced
      version: 1
    };

    await db.put('trips', offlineTrip);

    // Queue for sync
    await db.add('syncQueue', {
      entityType: 'TRIP',
      operation: 'CREATE',
      localId,
      data: data,
      timestamp: Date.now(),
      retryCount: 0
    });

    return localId;
  }

  // Handle sync response - update local ID to server ID
  async handleTripCreatedOnServer(localId: string, serverTrip: Trip): Promise<void> {
    const db = await getDb();
    const tx = db.transaction(['trips', 'idMappings'], 'readwrite');

    // Store ID mapping
    await tx.objectStore('idMappings').put({
      localId,
      serverId: String(serverTrip.id),
      entityType: 'TRIP',
      createdAt: Date.now()
    });

    // Delete old record with local ID
    await tx.objectStore('trips').delete(localId);

    // Store new record with server ID
    await tx.objectStore('trips').put({
      id: String(serverTrip.id),
      data: serverTrip,
      lastSync: Date.now(),
      version: 1
    });

    await tx.done;
  }
}

export const offlineTripService = new OfflineTripService();
```

### Offline Trip Creation UI

```typescript
// src/components/trips/CreateTripForm.tsx (additions)

const { isOnline } = useNetworkStatus();

// Show warning for offline creation
{!isOnline && (
  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200
                  dark:border-amber-700 rounded-lg p-4 mb-4">
    <div className="flex items-start gap-3">
      <WifiOff className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
      <div>
        <h4 className="font-medium text-amber-800 dark:text-amber-200">
          Creating Trip Offline
        </h4>
        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
          Your trip will be saved locally and synced when you're back online.
          Some features (checklists, collaborators) will be available after sync.
        </p>
      </div>
    </div>
  </div>
)}

// Limit status options offline (no COMPLETED)
const availableStatuses = isOnline
  ? ['DREAM', 'PLANNING', 'PLANNED', 'IN_PROGRESS', 'COMPLETED']
  : ['DREAM', 'PLANNING']; // Limited offline

// Handle offline submit
const handleSubmit = async (data: TripFormData) => {
  if (!isOnline) {
    const localId = await offlineTripService.createTripOffline(data, userId);
    toast.success('Trip saved offline. Will sync when online.');
    navigate(`/trips/${localId}`);
    return;
  }
  // ... normal online submit
};
```

### Limitations for Offline-Created Trips

| Feature | Available Offline | Notes |
|---------|-------------------|-------|
| Basic details | ✅ | Title, dates, description, timezone |
| Status | ⚠️ Limited | Only DREAM or PLANNING |
| Add locations | ✅ | After trip creation |
| Add activities | ✅ | After trip creation |
| Add transportation | ✅ | After trip creation |
| Add lodging | ✅ | After trip creation |
| Add journal | ✅ | After trip creation |
| Upload photos | ❌ | Requires network |
| Auto-checklist | ❌ | Created after sync |
| Collaborators | ❌ | Requires network |
| Tags | ❌ | User-global, requires sync |

---

## Immich Photo Caching

### The Challenge

Immich photos are served from an external server and have different caching requirements:
1. Photos may be large (RAW exports, high-resolution)
2. Immich server may be on local network only
3. Authentication required (API key)
4. Different URL patterns than local photos

### Caching Strategy for Immich

```typescript
// src/services/immichCache.service.ts

interface ImmichCacheConfig {
  maxPhotos: 100;               // Max Immich photos to cache
  maxSize: 200 * 1024 * 1024;   // 200MB for Immich content
  preferredQuality: 'thumbnail' | 'preview' | 'original';
}

export class ImmichCacheService {
  private config: ImmichCacheConfig = {
    maxPhotos: 100,
    maxSize: 200 * 1024 * 1024,
    preferredQuality: 'preview' // Balance quality/size
  };

  // Cache Immich photo for offline use
  async cacheImmichPhoto(
    assetId: string,
    quality: 'thumbnail' | 'preview' | 'original' = 'preview'
  ): Promise<void> {
    const db = await getDb();

    // Check if already cached
    const existing = await db.get('immichCache', assetId);
    if (existing && existing.quality === quality) {
      return; // Already cached at this quality
    }

    // Fetch from Immich server while online
    const imageBlob = await this.fetchImmichImage(assetId, quality);

    // Store in IndexedDB
    await db.put('immichCache', {
      id: assetId,
      quality,
      blob: imageBlob,
      size: imageBlob.size,
      cachedAt: Date.now(),
      lastAccessed: Date.now()
    });

    // Enforce storage limits
    await this.enforceStorageLimits();
  }

  // Get cached Immich photo
  async getCachedImmichPhoto(assetId: string): Promise<Blob | null> {
    const db = await getDb();
    const cached = await db.get('immichCache', assetId);

    if (cached) {
      // Update last accessed time
      cached.lastAccessed = Date.now();
      await db.put('immichCache', cached);
      return cached.blob;
    }

    return null;
  }

  // Check if Immich photo is cached
  async isImmichPhotoCached(assetId: string): Promise<boolean> {
    const db = await getDb();
    const cached = await db.get('immichCache', assetId);
    return cached !== null;
  }

  // Fetch from Immich server
  private async fetchImmichImage(
    assetId: string,
    quality: 'thumbnail' | 'preview' | 'original'
  ): Promise<Blob> {
    const endpoint = quality === 'original'
      ? `/api/immich/assets/${assetId}/original`
      : `/api/immich/assets/${assetId}/${quality}`;

    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`Failed to fetch Immich image: ${response.status}`);
    }
    return response.blob();
  }

  // LRU eviction when storage is full
  private async enforceStorageLimits(): Promise<void> {
    const db = await getDb();
    const allCached = await db.getAll('immichCache');

    // Calculate total size
    const totalSize = allCached.reduce((sum, item) => sum + item.size, 0);

    if (totalSize > this.config.maxSize || allCached.length > this.config.maxPhotos) {
      // Sort by last accessed (oldest first)
      allCached.sort((a, b) => a.lastAccessed - b.lastAccessed);

      let currentSize = totalSize;
      let currentCount = allCached.length;

      for (const item of allCached) {
        if (currentSize <= this.config.maxSize * 0.8 &&
            currentCount <= this.config.maxPhotos * 0.8) {
          break; // Under limits
        }

        await db.delete('immichCache', item.id);
        currentSize -= item.size;
        currentCount--;
      }
    }
  }
}

export const immichCacheService = new ImmichCacheService();
```

### IndexedDB Store for Immich Cache

Add to the IndexedDB upgrade handler:

```typescript
// In openDB upgrade handler
if (!db.objectStoreNames.contains('immichCache')) {
  const immichStore = db.createObjectStore('immichCache', { keyPath: 'id' });
  immichStore.createIndex('by-cached-at', 'cachedAt');
  immichStore.createIndex('by-last-accessed', 'lastAccessed');
}
```

### Immich Offline Component Integration

```typescript
// src/components/photos/ImmichPhoto.tsx

export function ImmichPhoto({ assetId, alt, className }: ImmichPhotoProps) {
  const { isOnline } = useNetworkStatus();
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);

  useEffect(() => {
    loadImage();
  }, [assetId, isOnline]);

  const loadImage = async () => {
    // Check cache first
    const cached = await immichCacheService.getCachedImmichPhoto(assetId);
    if (cached) {
      setImageSrc(URL.createObjectURL(cached));
      setIsCached(true);
      return;
    }

    // If offline and not cached, show placeholder
    if (!isOnline) {
      setImageSrc(null);
      return;
    }

    // Online: fetch and optionally cache
    setImageSrc(`/api/immich/assets/${assetId}/preview`);
    setIsCached(false);
  };

  if (!imageSrc) {
    return (
      <div className={`bg-navy-100 dark:bg-navy-700 flex items-center
                       justify-center ${className}`}>
        <div className="text-center p-4">
          <ImageOff className="w-8 h-8 text-navy-400 mx-auto mb-2" />
          <p className="text-xs text-navy-500">Not cached for offline</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <img src={imageSrc} alt={alt} className={className} />
      {isCached && (
        <div className="absolute bottom-2 right-2 bg-black/50 rounded px-2 py-1">
          <Download className="w-3 h-3 text-white inline mr-1" />
          <span className="text-xs text-white">Cached</span>
        </div>
      )}
    </div>
  );
}
```

---

## Video File Handling

### The Challenge

Videos present unique challenges for offline caching:
1. Much larger file sizes (10-500MB per video)
2. Streaming requirements
3. Different codecs and formats
4. Significant storage impact

### Video Caching Strategy

```typescript
// src/services/videoCache.service.ts

interface VideoCacheConfig {
  maxVideos: 5;                    // Very limited due to size
  maxSize: 500 * 1024 * 1024;      // 500MB total for videos
  maxSingleVideoSize: 100 * 1024 * 1024; // 100MB per video max
  preferStreamingWhenOnline: true;
}

export class VideoCacheService {
  private config: VideoCacheConfig = {
    maxVideos: 5,
    maxSize: 500 * 1024 * 1024,
    maxSingleVideoSize: 100 * 1024 * 1024,
    preferStreamingWhenOnline: true
  };

  // Check if video can be cached (size check)
  async canCacheVideo(videoId: string): Promise<{ canCache: boolean; reason?: string }> {
    // Get video metadata
    const metadata = await this.getVideoMetadata(videoId);

    if (metadata.size > this.config.maxSingleVideoSize) {
      return {
        canCache: false,
        reason: `Video is too large (${formatBytes(metadata.size)}). Maximum cacheable size is ${formatBytes(this.config.maxSingleVideoSize)}.`
      };
    }

    // Check available storage
    const currentUsage = await this.getCurrentUsage();
    if (currentUsage + metadata.size > this.config.maxSize) {
      return {
        canCache: false,
        reason: `Not enough storage. Need ${formatBytes(metadata.size)}, only ${formatBytes(this.config.maxSize - currentUsage)} available.`
      };
    }

    return { canCache: true };
  }

  // Cache video for offline
  async cacheVideo(
    videoId: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const { canCache, reason } = await this.canCacheVideo(videoId);
    if (!canCache) {
      throw new Error(reason);
    }

    const db = await getDb();

    // Fetch video with progress tracking
    const response = await fetch(`/api/photos/${videoId}/video`);
    const reader = response.body?.getReader();
    const contentLength = parseInt(response.headers.get('content-length') || '0');

    const chunks: Uint8Array[] = [];
    let receivedLength = 0;

    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;

      chunks.push(value);
      receivedLength += value.length;
      onProgress?.(receivedLength / contentLength);
    }

    const blob = new Blob(chunks, { type: response.headers.get('content-type') || 'video/mp4' });

    await db.put('videoCache', {
      id: videoId,
      blob,
      size: blob.size,
      mimeType: blob.type,
      cachedAt: Date.now(),
      lastAccessed: Date.now()
    });
  }

  // Get cached video for playback
  async getCachedVideo(videoId: string): Promise<string | null> {
    const db = await getDb();
    const cached = await db.get('videoCache', videoId);

    if (cached) {
      cached.lastAccessed = Date.now();
      await db.put('videoCache', cached);
      return URL.createObjectURL(cached.blob);
    }

    return null;
  }

  private async getCurrentUsage(): Promise<number> {
    const db = await getDb();
    const allVideos = await db.getAll('videoCache');
    return allVideos.reduce((sum, v) => sum + v.size, 0);
  }

  private async getVideoMetadata(videoId: string): Promise<{ size: number }> {
    const response = await fetch(`/api/photos/${videoId}`, { method: 'HEAD' });
    const size = parseInt(response.headers.get('content-length') || '0');
    return { size };
  }
}

export const videoCacheService = new VideoCacheService();
```

### Video Player with Offline Support

```typescript
// src/components/photos/VideoPlayer.tsx

export function VideoPlayer({ photoId, className }: VideoPlayerProps) {
  const { isOnline } = useNetworkStatus();
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [cacheStatus, setCacheStatus] = useState<'idle' | 'caching' | 'cached' | 'error'>('idle');
  const [cacheProgress, setCacheProgress] = useState(0);

  useEffect(() => {
    loadVideo();
    return () => {
      // Clean up object URL
      if (videoSrc?.startsWith('blob:')) {
        URL.revokeObjectURL(videoSrc);
      }
    };
  }, [photoId, isOnline]);

  const loadVideo = async () => {
    // Check cache first
    const cached = await videoCacheService.getCachedVideo(photoId);
    if (cached) {
      setVideoSrc(cached);
      setIsCached(true);
      setCacheStatus('cached');
      return;
    }

    // If offline and not cached, can't play
    if (!isOnline) {
      setVideoSrc(null);
      return;
    }

    // Online: stream directly
    setVideoSrc(`/api/photos/${photoId}/video`);
    setIsCached(false);
  };

  const handleCacheForOffline = async () => {
    setCacheStatus('caching');
    try {
      await videoCacheService.cacheVideo(photoId, setCacheProgress);
      setCacheStatus('cached');
      setIsCached(true);
    } catch (error) {
      setCacheStatus('error');
      toast.error(error instanceof Error ? error.message : 'Failed to cache video');
    }
  };

  if (!videoSrc && !isOnline) {
    return (
      <div className={`bg-navy-100 dark:bg-navy-700 flex items-center
                       justify-center ${className}`}>
        <div className="text-center p-6">
          <Film className="w-12 h-12 text-navy-400 mx-auto mb-3" />
          <p className="text-navy-600 dark:text-navy-300 mb-2">
            Video not available offline
          </p>
          <p className="text-sm text-navy-500">
            Connect to the internet to watch this video
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <video
        src={videoSrc || undefined}
        className={className}
        controls
        playsInline
      />

      {/* Cache for offline button */}
      {isOnline && !isCached && (
        <button
          onClick={handleCacheForOffline}
          disabled={cacheStatus === 'caching'}
          className="absolute bottom-4 right-4 bg-black/70 hover:bg-black/80
                     text-white px-3 py-2 rounded-lg flex items-center gap-2
                     transition-colors disabled:opacity-50"
        >
          {cacheStatus === 'caching' ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent
                              rounded-full animate-spin" />
              <span>{Math.round(cacheProgress * 100)}%</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Save for offline</span>
            </>
          )}
        </button>
      )}

      {/* Cached indicator */}
      {isCached && (
        <div className="absolute bottom-4 right-4 bg-green-600/80 text-white
                        px-3 py-1 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm">Cached</span>
        </div>
      )}
    </div>
  );
}
```

### IndexedDB Store for Video Cache

Add to the IndexedDB upgrade handler:

```typescript
// In openDB upgrade handler
if (!db.objectStoreNames.contains('videoCache')) {
  const videoStore = db.createObjectStore('videoCache', { keyPath: 'id' });
  videoStore.createIndex('by-cached-at', 'cachedAt');
  videoStore.createIndex('by-size', 'size');
}
```

---

## Migration from Existing localStorage

### The Challenge

The app currently uses `localStorage` for:
1. Auto-save drafts (via `useAutoSaveDraft` hook)
2. Theme preferences
3. Some UI state

When PWA is implemented, we need to:
1. Migrate existing drafts to IndexedDB
2. Maintain backwards compatibility during transition
3. Clean up old localStorage data

### Migration Strategy

```typescript
// src/lib/localStorageMigration.ts

interface MigrationResult {
  draftsFound: number;
  draftsMigrated: number;
  errors: string[];
}

export async function migrateFromLocalStorage(): Promise<MigrationResult> {
  const result: MigrationResult = {
    draftsFound: 0,
    draftsMigrated: 0,
    errors: []
  };

  // Check if migration already completed
  const migrationComplete = localStorage.getItem('pwa-migration-complete');
  if (migrationComplete === 'true') {
    return result;
  }

  const db = await getDb();

  // Find all draft keys in localStorage
  const draftKeys = Object.keys(localStorage).filter(key =>
    key.startsWith('draft-') ||
    key.startsWith('trip-form-') ||
    key.startsWith('location-form-') ||
    key.startsWith('activity-form-')
  );

  result.draftsFound = draftKeys.length;

  for (const key of draftKeys) {
    try {
      const value = localStorage.getItem(key);
      if (!value) continue;

      const parsed = JSON.parse(value);

      // Store in IndexedDB
      await db.put('localDrafts', {
        key,
        data: parsed,
        migratedAt: Date.now(),
        originalTimestamp: parsed.savedAt || Date.now()
      });

      result.draftsMigrated++;
    } catch (error) {
      result.errors.push(`Failed to migrate ${key}: ${error}`);
    }
  }

  // Clean up localStorage after successful migration
  if (result.errors.length === 0) {
    for (const key of draftKeys) {
      localStorage.removeItem(key);
    }
    localStorage.setItem('pwa-migration-complete', 'true');
  }

  return result;
}

// Call on app startup
export async function initializePWAMigration(): Promise<void> {
  const result = await migrateFromLocalStorage();

  if (result.draftsFound > 0) {
    console.log(`PWA Migration: Found ${result.draftsFound} drafts, migrated ${result.draftsMigrated}`);

    if (result.errors.length > 0) {
      console.warn('Migration errors:', result.errors);
    }
  }
}
```

### Updated useAutoSaveDraft Hook

```typescript
// src/hooks/useAutoSaveDraft.ts (updated for IndexedDB)

import { getDb } from '../lib/offlineDb';

interface DraftRecord {
  key: string;
  data: unknown;
  savedAt: number;
  expiresAt: number;
}

export function useAutoSaveDraft<T>({
  key,
  data,
  interval = 5000,
  expirationHours = 24
}: AutoSaveDraftOptions<T>) {
  const [draftExists, setDraftExists] = useState(false);
  const [restoredDraft, setRestoredDraft] = useState<T | null>(null);

  // Check for existing draft on mount
  useEffect(() => {
    checkForDraft();
  }, [key]);

  // Auto-save at interval
  useEffect(() => {
    if (!data) return;

    const timer = setInterval(() => {
      saveDraft(data);
    }, interval);

    return () => clearInterval(timer);
  }, [data, interval, key]);

  const checkForDraft = async () => {
    try {
      const db = await getDb();
      const draft = await db.get('localDrafts', key);

      if (draft && draft.expiresAt > Date.now()) {
        setDraftExists(true);
        setRestoredDraft(draft.data as T);
      } else if (draft) {
        // Expired, clean up
        await db.delete('localDrafts', key);
      }
    } catch (error) {
      // Fallback to localStorage for backwards compatibility
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.expiresAt > Date.now()) {
            setDraftExists(true);
            setRestoredDraft(parsed.data as T);
          } else {
            localStorage.removeItem(key);
          }
        } catch {
          // Invalid JSON, remove it
          localStorage.removeItem(key);
        }
      }
    }
  };

  const saveDraft = async (draftData: T) => {
    const expiresAt = Date.now() + (expirationHours * 60 * 60 * 1000);

    try {
      const db = await getDb();
      await db.put('localDrafts', {
        key,
        data: draftData,
        savedAt: Date.now(),
        expiresAt
      });
    } catch (error) {
      // Fallback to localStorage if IndexedDB fails
      localStorage.setItem(key, JSON.stringify({
        data: draftData,
        savedAt: Date.now(),
        expiresAt
      }));
    }
  };

  const restoreDraft = (): T | null => {
    setDraftExists(false);
    return restoredDraft;
  };

  const clearDraft = async () => {
    setDraftExists(false);
    setRestoredDraft(null);

    try {
      const db = await getDb();
      await db.delete('localDrafts', key);
    } catch {
      // Fallback
      localStorage.removeItem(key);
    }
  };

  return {
    draftExists,
    restoreDraft,
    clearDraft,
    saveDraft
  };
}
```

### IndexedDB Store for Drafts

Add to the IndexedDB upgrade handler:

```typescript
// In openDB upgrade handler
if (!db.objectStoreNames.contains('localDrafts')) {
  const draftStore = db.createObjectStore('localDrafts', { keyPath: 'key' });
  draftStore.createIndex('by-expires', 'expiresAt');
}
```

### Migration UI Component

```typescript
// src/components/pwa/MigrationNotice.tsx

export function MigrationNotice() {
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    checkMigration();
  }, []);

  const checkMigration = async () => {
    const result = await migrateFromLocalStorage();
    if (result.draftsFound > 0) {
      setMigrationResult(result);
    }
  };

  if (!migrationResult || isDismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 bg-white dark:bg-navy-800 rounded-lg
                    shadow-lg p-4 max-w-sm border border-navy-200 dark:border-navy-600">
      <div className="flex items-start gap-3">
        <div className="bg-primary-100 dark:bg-primary-900/30 rounded-full p-2">
          <RefreshCw className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-navy-900 dark:text-white">
            Data Migrated
          </h4>
          <p className="text-sm text-navy-600 dark:text-navy-300 mt-1">
            {migrationResult.draftsMigrated} saved draft{migrationResult.draftsMigrated !== 1 ? 's' : ''} migrated
            to the new offline storage system.
          </p>
          {migrationResult.errors.length > 0 && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
              {migrationResult.errors.length} item{migrationResult.errors.length !== 1 ? 's' : ''} could not be migrated.
            </p>
          )}
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          className="text-navy-400 hover:text-navy-600 dark:hover:text-navy-200"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
```

---

## Edge Cases & Error Handling

### QuotaExceededError Handling

Storage can fill up during offline downloads. Handle gracefully:

```typescript
// src/services/offlineDownload.service.ts

async downloadTripForOffline(
  tripId: string,
  options: DownloadOptions,
  onProgress: (progress: DownloadProgress) => void
): Promise<DownloadResult> {
  const db = await getDb();
  const downloadedItems: string[] = []; // Track for rollback

  try {
    // ... download logic ...

    for (const photo of photos) {
      try {
        await this.cachePhoto(photo, options.photoQuality);
        downloadedItems.push(`photo:${photo.id}`);
      } catch (error) {
        if (error.name === 'QuotaExceededError') {
          // Rollback partial download
          await this.rollbackDownload(tripId, downloadedItems);

          return {
            success: false,
            error: 'storage-full',
            message: 'Not enough storage space. Try clearing some cached data.',
            downloadedCount: downloadedItems.length,
            failedAt: photo.id
          };
        }
        throw error;
      }
    }

    return { success: true, downloadedCount: downloadedItems.length };

  } catch (error) {
    // Rollback on any unexpected error
    await this.rollbackDownload(tripId, downloadedItems);
    throw error;
  }
}

async rollbackDownload(tripId: string, items: string[]): Promise<void> {
  const db = await getDb();
  const cache = await caches.open('photo-cache');

  for (const item of items) {
    const [type, id] = item.split(':');
    try {
      if (type === 'photo') {
        await db.delete('photos', id);
        // Also clear from Cache API
        await cache.delete(`/uploads/photos/${id}`);
        await cache.delete(`/uploads/thumbnails/${id}`);
      }
      // Handle other types...
    } catch (e) {
      console.warn(`Failed to rollback ${item}:`, e);
    }
  }

  // Reset trip download status
  const trip = await db.get('trips', tripId);
  if (trip) {
    await db.put('trips', { ...trip, downloadedForOffline: false });
  }
}
```

### Token Refresh During Long Sync

Proactively refresh tokens before starting sync and handle mid-sync expiry:

```typescript
// src/services/syncManager.ts

async syncAll(): Promise<SyncResult> {
  if (this.isSyncing) return { status: 'already-syncing' };
  if (!navigator.onLine) return { status: 'offline' };

  this.isSyncing = true;

  try {
    // 1. Check token expiry before starting
    const tokenExpiry = authStore.getState().tokenExpiry;
    const fiveMinutes = 5 * 60 * 1000;

    if (tokenExpiry && tokenExpiry - Date.now() < fiveMinutes) {
      // Token expires soon, refresh first
      try {
        await authService.refreshToken();
      } catch (error) {
        return { status: 'auth-error', error: 'Token refresh failed' };
      }
    }

    // 2. Refresh CSRF token
    await axios.get('/api/auth/csrf-token');

    // 3. Process sync queue with periodic token checks
    const pending = await offlineService.getPendingChanges();
    let processedCount = 0;

    for (const change of pending) {
      // Every 10 items, check if we need to refresh
      if (processedCount > 0 && processedCount % 10 === 0) {
        const currentExpiry = authStore.getState().tokenExpiry;
        if (currentExpiry && currentExpiry - Date.now() < fiveMinutes) {
          await authService.refreshToken();
        }
      }

      await this.processChange(change);
      processedCount++;
    }

    return { status: 'complete', synced: processedCount };

  } finally {
    this.isSyncing = false;
  }
}
```

### Network Flapping Protection

Debounce network status changes to prevent multiple simultaneous syncs:

```typescript
// src/hooks/useNetworkStatus.ts

import { useState, useEffect, useRef } from 'react';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isStableOnline, setIsStableOnline] = useState(navigator.onLine);
  const debounceTimerRef = useRef<number | null>(null);
  const DEBOUNCE_MS = 3000; // Wait 3 seconds before considering stable

  useEffect(() => {
    const handleStatusChange = () => {
      const online = navigator.onLine;
      setIsOnline(online);

      // Clear any pending debounce
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Only update stable status after debounce period
      debounceTimerRef.current = window.setTimeout(() => {
        setIsStableOnline(online);

        if (online) {
          // Additional verification: try to reach the server
          fetch('/api/health', { method: 'HEAD' })
            .then(() => {
              window.dispatchEvent(new CustomEvent('app:stable-online'));
            })
            .catch(() => {
              setIsStableOnline(false);
            });
        }
      }, DEBOUNCE_MS);
    };

    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);

    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    isOnline,           // Immediate browser status
    isStableOnline,     // Debounced, verified status
  };
}
```

### Multiple Browser Tabs

Use BroadcastChannel to coordinate between tabs:

```typescript
// src/lib/tabSync.ts

const CHANNEL_NAME = 'travel-life-sync';
let channel: BroadcastChannel | null = null;

export function initTabSync() {
  if (!('BroadcastChannel' in window)) return;

  channel = new BroadcastChannel(CHANNEL_NAME);

  channel.onmessage = (event) => {
    const { type, data } = event.data;

    switch (type) {
      case 'sync-started':
        // Another tab started sync, disable our sync button
        window.dispatchEvent(new CustomEvent('sync:external-start'));
        break;

      case 'sync-complete':
        // Refresh our queries to get updated data
        queryClient.invalidateQueries();
        window.dispatchEvent(new CustomEvent('sync:external-complete'));
        break;

      case 'entity-updated':
        // Invalidate specific query
        queryClient.invalidateQueries({ queryKey: [data.entityType, data.entityId] });
        break;

      case 'logout':
        // Another tab logged out, we should too
        authStore.getState().logout();
        break;
    }
  };
}

export function broadcastSyncStart() {
  channel?.postMessage({ type: 'sync-started' });
}

export function broadcastSyncComplete() {
  channel?.postMessage({ type: 'sync-complete' });
}

export function broadcastEntityUpdate(entityType: string, entityId: string) {
  channel?.postMessage({ type: 'entity-updated', data: { entityType, entityId } });
}

export function broadcastLogout() {
  channel?.postMessage({ type: 'logout' });
}
```

### Clock Skew Detection

Detect and warn about client/server time differences:

```typescript
// src/lib/clockSkew.ts

let clockSkewMs = 0;
let skewChecked = false;

export async function checkClockSkew(): Promise<void> {
  if (skewChecked) return;

  try {
    const clientTime = Date.now();
    const response = await fetch('/api/health');
    const serverTimeHeader = response.headers.get('Date');

    if (serverTimeHeader) {
      const serverTime = new Date(serverTimeHeader).getTime();
      clockSkewMs = serverTime - clientTime;
      skewChecked = true;

      // Warn if skew is more than 5 minutes
      if (Math.abs(clockSkewMs) > 5 * 60 * 1000) {
        console.warn(`Clock skew detected: ${clockSkewMs}ms`);
        // Could show user warning
      }
    }
  } catch (error) {
    console.warn('Failed to check clock skew:', error);
  }
}

export function getServerAdjustedTime(): number {
  return Date.now() + clockSkewMs;
}

export function getClockSkew(): number {
  return clockSkewMs;
}
```

### PWA Update with Pending Changes

Check for pending sync items before allowing update:

```typescript
// src/components/pwa/UpdatePrompt.tsx

import { useRegisterSW } from 'virtual:pwa-register/react';
import { offlineService } from '../../services/offline.service';

export function UpdatePrompt() {
  const [pendingChanges, setPendingChanges] = useState(0);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW();

  useEffect(() => {
    if (needRefresh) {
      // Check for pending changes before showing update prompt
      offlineService.getPendingChanges().then(changes => {
        setPendingChanges(changes.length);
      });
    }
  }, [needRefresh]);

  const handleUpdate = async () => {
    if (pendingChanges > 0) {
      // Warn user about pending changes
      const confirmed = window.confirm(
        `You have ${pendingChanges} pending changes that haven't been synced. ` +
        `Updating now will preserve these changes, but it's recommended to sync first. ` +
        `Update anyway?`
      );
      if (!confirmed) return;
    }

    updateServiceWorker(true);
  };

  if (!needRefresh) return null;

  return (
    <div className="update-prompt">
      <h3>Update Available</h3>
      {pendingChanges > 0 && (
        <p className="text-amber-600">
          ⚠️ {pendingChanges} changes pending sync
        </p>
      )}
      <button onClick={handleUpdate}>Update Now</button>
      <button onClick={() => setNeedRefresh(false)}>Later</button>
    </div>
  );
}
```

---

## Testing Strategy

### Unit Tests

**Required test coverage:**

- IndexedDB operations (all 22 stores)
- ID type conversion (Int ↔ String)
- Conflict resolution logic (all scenarios)
- Sync queue management
- Network status detection and debouncing
- Offline session encryption/decryption
- Clock skew adjustment
- QuotaExceededError rollback

```typescript
// Example: ID type handling tests
describe('ID type handling', () => {
  it('converts server integer ID to string for IndexedDB', () => {
    const serverId = 12345;
    const dbKey = String(serverId);
    expect(dbKey).toBe('12345');
    expect(typeof dbKey).toBe('string');
  });

  it('handles local UUID format', () => {
    const localId = generateLocalId();
    expect(localId).toMatch(/^local_[0-9a-f-]+$/);
    expect(isLocalId(localId)).toBe(true);
    expect(isLocalId('12345')).toBe(false);
  });

  it('compares IDs correctly regardless of type', () => {
    expect(String(123) === String('123')).toBe(true);
  });
});
```

### Integration Tests

- Service worker registration
- Cache strategy verification
- Offline/online transitions
- Background sync
- Tab coordination via BroadcastChannel
- Token refresh during sync

### E2E Tests (Playwright)

```typescript
// e2e/offline-workflow.spec.ts

test('complete offline workflow', async ({ page, context }) => {
  // 1. Login and navigate to trip
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');

  // 2. Download trip for offline
  await page.click('[data-testid="trip-card-1"]');
  await page.click('[data-testid="download-offline"]');
  await page.waitForSelector('[data-testid="offline-complete"]');

  // 3. Go offline
  await context.setOffline(true);

  // 4. Verify offline indicator
  await expect(page.locator('[data-testid="offline-banner"]')).toBeVisible();

  // 5. Create activity offline
  await page.click('[data-testid="add-activity"]');
  await page.fill('[name="name"]', 'Offline Activity');
  await page.click('button[type="submit"]');

  // 6. Verify activity appears
  await expect(page.locator('text=Offline Activity')).toBeVisible();

  // 7. Go back online
  await context.setOffline(false);

  // 8. Wait for sync
  await page.waitForSelector('[data-testid="sync-complete"]', { timeout: 30000 });

  // 9. Refresh and verify activity persisted
  await page.reload();
  await expect(page.locator('text=Offline Activity')).toBeVisible();
});
```

### iOS-Specific Tests

- Test on real iOS device (not just simulator)
- Verify 7-day cache warning appears
- Test Add to Home Screen flow
- Verify storage limits are respected

### Performance Benchmarks

| Scenario | Target | Measurement |
|----------|--------|-------------|
| Initial IndexedDB setup | < 500ms | `console.time` |
| Load trip from cache | < 100ms | Lighthouse |
| Sync 50 items | < 30s | E2E test |
| Search 1000 cached items | < 200ms | Unit test |

### Manual Testing

| Scenario | Test Steps |
|----------|------------|
| Install PWA | Chrome > Install > Verify home screen icon |
| Offline browsing | DevTools > Network > Offline > Navigate |
| Offline editing | Disable network > Create activity > Re-enable > Verify sync |
| Update flow | Deploy new version > Verify update prompt |
| Conflict | Edit on two devices > Sync > Verify resolution |
| Storage full | Fill storage > Try download > Verify error handling |
| Token expiry | Wait 15+ minutes offline > Sync > Verify token refresh |
| Multiple tabs | Open two tabs > Edit in both > Verify coordination |

### Lighthouse Audits

Run Lighthouse PWA audit after each phase:

```bash
npx lighthouse http://localhost:3000 --only-categories=pwa
```

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Storage quota exceeded | Data loss | QuotaExceededError handling with rollback |
| Sync conflicts | Data inconsistency | Auto-resolve + manual UI + notification |
| Service worker bugs | App unusable | Update prompt, skip waiting, gradual rollout |
| iOS limitations | Reduced functionality | Document limitations, 7-day warning, persistent storage request |
| Large photo cache | Storage issues | User-controlled, size limits, automatic cleanup |
| Auth token expiry | Offline unusable | 30-day offline sessions, proactive refresh |
| Clock skew | Wrong conflict resolution | Server-adjusted timestamps, skew detection |
| Network flapping | Multiple syncs | Debounced network status, server ping verification |
| Multiple tabs | Data races | BroadcastChannel coordination |
| ID type mismatch | Sync failures | Consistent String conversion throughout |

---

## Future Enhancements

### Phase 5+ (Future)

- **Push notifications**: Flight updates, trip reminders
- **Background fetch**: Pre-cache upcoming trip data
- **Share target**: Share photos directly to Travel Life
- **Shortcuts**: Quick actions from home screen icon
- **Periodic sync**: Keep data fresh in background
- **Badging**: Show pending sync count on icon

---

## File Structure

```text
frontend/
├── public/
│   ├── icons/
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   ├── icon-512-maskable.png
│   │   └── apple-touch-icon.png
│   ├── screenshots/
│   │   ├── dashboard.png
│   │   └── trip-mobile.png
│   └── offline.html
├── src/
│   ├── components/
│   │   └── pwa/
│   │       ├── InstallPrompt.tsx
│   │       ├── UpdatePrompt.tsx
│   │       ├── OfflineBanner.tsx
│   │       ├── SyncStatus.tsx
│   │       ├── ConflictResolutionModal.tsx
│   │       ├── OfflineDownloadModal.tsx
│   │       ├── IOSInstallInstructions.tsx
│   │       ├── IOSStorageWarning.tsx
│   │       ├── DataFreshnessIndicator.tsx
│   │       └── StorageManagement.tsx
│   ├── hooks/
│   │   └── useNetworkStatus.ts
│   ├── lib/
│   │   ├── offlineDb.ts
│   │   ├── offlineId.ts
│   │   ├── queryPersister.ts
│   │   ├── conflictResolver.ts
│   │   ├── dbMigration.ts
│   │   └── storage.ts
│   └── services/
│       ├── offline.service.ts
│       ├── offlineAuth.service.ts
│       ├── offlineDownload.service.ts
│       ├── syncManager.ts
│       ├── searchIndex.service.ts
│       ├── mapCache.service.ts
│       └── storageCleanup.service.ts
├── vite.config.ts (PWA config)
└── sw.ts (custom service worker extensions)

backend/
├── src/
│   └── routes/
│       └── auth.routes.ts (add /offline-session endpoint)
```

---

## Summary

This PWA implementation will transform Travel Life into a reliable offline-capable application, essential for travelers who frequently encounter connectivity challenges. The phased approach allows for incremental delivery while maintaining stability.

### Revised Timeline

**Total Estimated Effort**: 5-6 weeks (revised from 3-4 weeks based on expanded scope)

| Phase | Focus | Duration | Key Deliverables |
|-------|-------|----------|------------------|
| 1 | Foundation | 1 week | Manifest, icons, install/update prompts, basic SW |
| 2 | Offline Data Layer | 1.5 weeks | IndexedDB schema (all 21 entities), offline service, ID generation |
| 3 | Service Worker & Caching | 1 week | Workbox caching, offline page, photo/map tile caching |
| 4 | Sync & Conflict Resolution | 1.5 weeks | Background sync, conflict UI, data freshness indicators |
| 5 | Polish & Platform-Specific | 1 week | iOS handling, storage management, offline search, download UI |

### Key Dependencies

**NPM Packages**:

- `vite-plugin-pwa` - PWA plugin for Vite
- `workbox-window` - Service worker registration
- `idb` - IndexedDB wrapper
- `uuid` - Offline ID generation

**Backend Changes**:

- New endpoint: `POST /api/auth/offline-session` for extended offline auth

### New Components Summary

| Component | Purpose |
|-----------|---------|
| `InstallPrompt` | Custom PWA install prompt |
| `UpdatePrompt` | Service worker update notification |
| `OfflineBanner` | Network status indicator |
| `SyncStatus` | Pending changes indicator |
| `ConflictResolutionModal` | Manual conflict resolution UI |
| `OfflineDownloadModal` | Trip download progress |
| `IOSInstallInstructions` | Safari-specific install guide |
| `IOSStorageWarning` | iOS cache eviction warning |
| `DataFreshnessIndicator` | Last synced timestamp |
| `StorageManagement` | Storage usage and cleanup |

### Success Metrics

| Metric | Target |
|--------|--------|
| Lighthouse PWA score | 100 |
| Offline trip load time | < 500ms |
| Install prompt acceptance | > 20% |
| Sync conflict rate | < 1% |
| Offline-capable pages | 90%+ |
| iOS user satisfaction | > 80% (despite limitations) |

### Risk Summary

| Risk | Severity | Mitigation |
|------|----------|------------|
| iOS 7-day cache eviction | High | User warnings, periodic open reminders |
| Storage quota exceeded | Medium | Automatic cleanup, user controls |
| Sync conflicts | Medium | Auto-resolve + manual UI |
| Offline auth expiry | Medium | 30-day offline session, clear messaging |
| Service worker bugs | High | Gradual rollout, update prompt |

---

## Appendix: Entity Type Coverage

All 21 database entities are covered in the IndexedDB schema:

| Category | Entities |
|----------|----------|
| Core Trip | Trip, Location, Activity, Transportation, Lodging, JournalEntry |
| Photos | Photo, PhotoAlbum |
| Relationships | EntityLink, TripTagAssignment, TripCompanion |
| User Data | TripTag, TravelCompanion, LocationCategory |
| Checklists | Checklist, ChecklistItem |
| External Data | WeatherData, FlightTracking |
| Validation | DismissedValidationIssue |
| Offline-Only | OfflineSession, SyncQueue, SyncConflicts, SearchIndex, IdMappings |

---

## Changelog

- **2026-01-31**: Initial plan created
- **2026-01-31**: Expanded with comprehensive review findings:
  - Added all 21 entity types to IndexedDB schema
  - Added Offline Authentication section
  - Added Offline Trip Preparation ("Download for Offline") feature
  - Added iOS/Safari limitations and mitigations
  - Added Offline Search with local indexing
  - Added Map Pre-Caching for trip areas
  - Added Offline ID Generation strategy (UUID + mapping)
  - Expanded Conflict Resolution UI with detailed modal design
  - Added Data Freshness Indicators
  - Added Database Migration Strategy
  - Added Storage Management UI and automatic cleanup
  - Updated Offline Feature Scope to include all entity types
  - Revised timeline from 3-4 weeks to 5-6 weeks
- **2026-01-31**: Addressed critical issues from second review:
  - Added Critical Implementation Notes section (ID type handling, dependencies, security)
  - Added offline session encryption using Web Crypto API
  - Added CSRF token refresh during sync operations
  - Replaced incomplete IndexedDB upgrade handler with complete 22-store version
  - Added comprehensive Edge Cases & Error Handling section:
    - QuotaExceededError handling with rollback
    - Token refresh during long sync operations
    - Network flapping protection with debouncing
    - Multiple browser tab coordination via BroadcastChannel
    - Clock skew detection between client/server
    - PWA update handling with pending changes
  - Expanded Testing Strategy with specific test examples and E2E tests
- **2026-01-31**: Added remaining feature sections:
  - Added Offline Trip Creation section (limited support with UUID IDs)
  - Added Immich Photo Caching section with LRU eviction
  - Added Video File Handling section with size limits and streaming
  - Added Migration from Existing localStorage section
  - Added localDrafts, immichCache, and videoCache IndexedDB stores
  - Updated useAutoSaveDraft hook for IndexedDB with localStorage fallback
