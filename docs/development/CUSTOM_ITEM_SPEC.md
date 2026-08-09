# CustomItem — Design Spec

A user-defined, catch-all entity attachable to a trip. Types are presentation-only
(label + icon + color); all items share one fixed field set.

## Motivation

Travel Life models the things a trip is *made of* — locations, activities, lodging,
transportation, journals, photos. Anything that does not fit one of those shapes has
nowhere to live. A parking reservation, a rental-agency phone number, a "call the vet on
day 3" reminder, a ferry ticket that is not really transportation: today these get
crammed into an Activity with a misleading category, or into trip notes where they cannot
be scheduled, costed, or linked.

`CustomItem` is the escape hatch. It carries the fields those miscellaneous things
actually need, and it participates in the systems that make an entity real in this
codebase: the timeline, the map, budget totals, entity links, backup/restore, print.

## Decisions

| Question | Decision |
| -------- | -------- |
| Purpose | Catch-all misc item **and** user-defined types |
| Type power | Label + icon + color only — no per-type field schemas |
| Timing | Optional `startTime` / `endTime` / `allDay` / `timezone` (Activity's shape) |
| Place | `locationId` FK to an existing Location — no own coordinates |
| Fields | Cost + currency, rich-text notes, URL + confirmation number, photos, saved links |
| Structure | Flat, sorted by date then name — no `parentId`, no `manualOrder` |
| Naming | `CustomItem` / `CustomItemType`, tab label "Custom" |
| Type registry | Per-user, reusable, seeded with **Reservation, Contact, Reminder, Misc** |
| Reach | Backup/restore, print/export, trip health check, timeline, budget |
| Linking | Bidirectional — inbound and outbound both work (see [Linking](#linking)) |

### Deferred

Trip search (both the server and offline implementations),
`PHOTO_LINKABLE_ENTITY_TYPES`, `parentId` / `manualOrder`, per-type field schemas.

Also deliberately left out, because they were not reach targets and each needs its own
plumbing rather than a one-line union widening:

- **Offline sync** — `SyncEntityType` / `ENTITY_ENDPOINTS` in `syncManager.ts`, plus the
  IndexedDB stores. Custom items are online-only for now.
- **Offline search** — `SearchableEntityType` in `offline.types.ts` (follows the search
  decision above).
- **Dashboard "recent activity" feed** — `ActivityEntityType` in `tripDashboardUtils.ts`.

Search is deferred deliberately: `search.service.ts` currently indexes 5 entity types and
**already skips lodging, transportation, activity, photo-album and saved-link**. Adding
custom items alone would make it the sixth type ignored by a system that ignores five.
The right shape is one change covering all of them, not another special case.

## Schema

```prisma
model CustomItemType {
  id        Int          @id @default(autoincrement())
  userId    Int
  name      String
  icon      String?
  color     String?
  isDefault Boolean      @default(false)
  user      User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  items     CustomItem[]

  @@unique([userId, name])
  @@map("custom_item_types")
}

model CustomItem {
  id                 Int       @id @default(autoincrement())
  tripId             Int
  typeId             Int?
  name               String
  notes              String?   // rich text
  allDay             Boolean   @default(false)
  startTime          DateTime?
  endTime            DateTime?
  timezone           String?
  locationId         Int?
  cost               Decimal?  @db.Decimal(10, 2)
  currency           String?
  exchangeRate       Decimal?  // frozen FX snapshot
  baseAmount         Decimal?
  baseCurrency       String?
  url                String?   @db.Text
  confirmationNumber String?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  trip     Trip            @relation(fields: [tripId], references: [id], onDelete: Cascade)
  type     CustomItemType? @relation(fields: [typeId], references: [id], onDelete: SetNull)
  location Location?       @relation(fields: [locationId], references: [id], onDelete: SetNull)

  @@index([tripId])
  @@index([tripId, startTime])
  @@map("custom_items")
}
```

Column rationale:

- **`typeId` is nullable with `SetNull`**, so deleting a type does not destroy items —
  they fall back to an untyped "Custom" presentation. Matches `Location.categoryId`.
- **`url` is `@db.Text`**, not `VarChar(500)`, following the `SavedLink.url` precedent:
  real booking URLs with query strings exceed 500 characters.
- **The three FX snapshot columns are mandatory** for correct budget totals.
  `baseCurrency` is stored per row so changing the home currency invalidates the snapshot
  rather than silently reinterpreting it. All FX math uses `Prisma.Decimal`, never floats.
- **No `parentId` / `manualOrder`**, per the flat-ordering decision.
- **Timezone** resolution ends at the user's zone, never `|| 'UTC'`. `startTime` is a real
  instant, so bucket it onto a calendar day with `dayKeyInTimezone()` — never by slicing
  the ISO string.

## EntityType fan-out — 22 sites

`docs/architecture/DATABASE_SCHEMA.md` claims adding an `EntityType` value "fans out to
roughly ten call sites." The real number is 22. That doc should be corrected as part of
this work.

The reason this matters more than a normal enum widening:
`entityTypeEnum = z.nativeEnum(EntityType)` in `backend/src/types/entityLink.types.ts` is
auto-derived, so **the API accepts `CUSTOM_ITEM` the moment the enum lands**. Every site
below that is not compiler-enforced becomes a live data-loss path, not merely dead code.

### Compile errors (6) — cannot be forgotten

| File | Identifier |
| ---- | ---------- |
| `backend/src/services/entityLink.service.ts` | `ENTITY_CONFIG` |
| `frontend/src/lib/entityConfig.ts` | `ENTITY_TYPE_CONFIG` |
| `frontend/src/lib/entityConfig.ts` | `ENTITY_TYPE_TO_TAB` |
| `frontend/src/components/EntityDetailModal.tsx` | `ENTITY_TYPE_TO_TAB` — **a second, divergent copy** |
| `frontend/src/components/LinkPanel.tsx` | `emptyGroups()` |
| `frontend/src/components/LinkedEntitiesDisplay.tsx` | `emptyGroups()` |

**Corrected during implementation:** `modelDelegates.ts` `getEntityDelegate` was listed
here, but it switches over `VerifiableEntityType` (a separate lowercase union in
`tripAccess.ts`), *not* the Prisma `EntityType`. Widening the Prisma enum does not touch
it. It belongs with the parallel unions below — and it does have the codebase's only
`never` exhaustiveness guard, so it errors once you add to `VerifiableEntityType`.

### Runtime failures (3)

| File | Behaviour if omitted |
| ---- | -------------------- |
| `backend/src/types/backup.types.ts` | `ENTITY_TYPES`. **The whole restore aborts with a 400** — `backup.controller.ts` uses throwing `.parse()`, and `BackupEntityLinkSchema` validates via `z.enum(ENTITY_TYPES)`. The in-file comment claiming links are "silently dropped" is wrong and should be fixed. |
| `backend/src/services/entityLink.service.ts` | `batchVerifyEntitiesInTrip` — `default:` throws `AppError 400` |
| `frontend/src/components/EntityDetailModal.tsx` | `fetchEntityData` — `default:` throws |

### Silent failures (12) — the dangerous ones

| File | Identifier | Failure |
| ---- | ---------- | ------- |
| `backend/src/services/trip.service.ts` | `getNewId` | **Links dropped when duplicating a trip.** Param typed `string` — zero compiler help |
| `backend/src/services/restore.service.ts` | `getNewEntityId` | **Links dropped on restore.** Also `string`. Already lossy — `JOURNAL_ENTRY` is documented as deliberately absent |
| `frontend/src/types/entityLink.ts` | `EntityType` union | Hand-mirrored from Prisma; drifts silently |
| `frontend/src/types/entityLink.ts` | `VALID_ENTITY_TYPES` | `satisfies` rejects invalid entries but **not missing ones** → `parseEntityKey` returns `null` |
| `frontend/src/lib/entityConfig.ts` | `ENTITY_TYPE_DISPLAY_ORDER` | Type **never renders** — `LinkPanel`, `LinkedEntitiesDisplay`, `LinkButton` all filter over it |
| `frontend/src/lib/entityConfig.ts` | `LINKABLE_ENTITY_TYPES` | Not selectable in `GeneralEntityPickerModal` |
| `backend/src/services/entityLink.service.ts` | `batchGetEntityDetails` | No `default` → UI falls back to `"ID: n"` |
| `backend/src/services/entityLink.service.ts` | `cleanupOrphanedEntityLinks` | `default:` logs a warning and skips |
| `backend/src/services/entityLink.service.ts` | `getDefaultRelationship` | Falls through to `RELATED` — acceptable here |
| `frontend/src/hooks/useEntityFetcher.ts` | switch, no `default` | Picker shows an empty list |
| `frontend/src/components/EntityDetailModal.tsx` | `renderDetails` | Renders "Unknown entity type" |
| `frontend/src/components/EntityPickerModal.tsx` | `PHOTO_LINKABLE_ENTITY_TYPES` | Intentional subset — deferred, see [Linking](#linking) |

### Parallel unions not type-linked to `EntityType`

No compile error, but a user-facing type needs each by hand:

- `backend/src/services/_shared/tripAccess.ts` — `VerifiableEntityType` + `entityConfigs`
- `frontend/src/types/offline.types.ts` — `SearchableEntityType`, `SyncEntityType`
- `frontend/src/services/syncManager.ts` — `ENTITY_ENDPOINTS`
- `frontend/src/components/timeline/utils.ts` — `mapTimelineTypeToEntityType`. **Corrected:
  this one is compile-enforced after all.** It has no `default`, and its return type
  excludes `undefined`, so an unhandled member fails with "function lacks ending return
  statement". A *third* copy of this function also existed inline in
  `TimelineDaySection.tsx`; it was deleted in favour of the shared import.
- `frontend/src/components/BulkActionBar.tsx` — `BulkEntityType`
- `frontend/src/utils/tripDashboardUtils.ts` — `ActivityEntityType`

## Linking

`LinkPanel` is **bidirectional by construction**: it folds `linksFrom` (keyed on
`targetType`) and `linksTo` (keyed on `sourceType`) into the same group set, and
`LinkedEntitiesDisplay` does the same. So "anything → custom item" versus "custom item →
anything" is not a display distinction — only a question of which side you stand on when
creating the link.

Concretely: adding `CUSTOM_ITEM` to `ENTITY_TYPE_DISPLAY_ORDER` and
`LINKABLE_ENTITY_TYPES`, plus giving the custom-item detail view a `LinkPanel`, delivers
all four link directions at once. Photos and saved links need nothing extra — `PHOTO` and
`SAVED_LINK` are already in `LINKABLE_ENTITY_TYPES`, so both are pickable from a custom
item's own panel.

The one genuinely independent switch is `PHOTO_LINKABLE_ENTITY_TYPES`, a deliberate
subset governing the *photo-side* picker. Leaving `CUSTOM_ITEM` out means you attach
photos from the item rather than from the photo — the link and the resulting gallery are
identical either way. Deferred.

## Seeding

An idempotent seeder modelled on `checklist.service.ts`'s
`initializeDefaultChecklists`, which guards on
`count({ userId, isDefault: true }) > 0`. Seeds four types: **Reservation, Contact,
Reminder, Misc**.

Two things this must get right that the existing code does not:

- **Existing users need the types too.** `initializeDefaultChecklists` is only reachable
  from a user-triggered endpoint, so it never had to solve this. Use **lazy init on first
  read** of the type list — one code path covers new and existing users and stays
  idempotent — rather than a backfill migration, which silently misses anyone created
  between deploy and migrate.
- **Never write `userId` non-null together with `isDefault: true`** on the restore path.
  See below.

### Inherited trap in the restore path

The `LocationCategory` precedent for this pattern carries a live bug:
`restore.service.ts` re-creates every backed-up category with `userId` set while
preserving `isDefault: category.isDefault`, and since `updateCategory` / `deleteCategory`
both filter `isDefault: false`, a backup round-trip leaves the user unable to edit or
delete their own categories.

**`CustomItemType`'s restore path must force `isDefault: false`** for any row it creates
as user-owned, or it reproduces the same freeze.

Note also that nothing in the repo ever seeds `LocationCategory` at all, despite
`getCategories` reading `OR: [{ userId }, { isDefault: true }]` — it expects rows nothing
creates. Do not use it as a model for the seeder itself.

## Reach — what each integration costs

### Backup / restore

Add to `backup.types.ts` `ENTITY_TYPES` **and** to `restore.service.ts`
`getNewEntityId`. The first prevents a hard 400 on restore; the second prevents silent
link loss. Neither alone is sufficient. Also add both new tables to the backup payload
schema and to `clearUserData`.

`trip.service.ts` `getNewId` needs the same treatment for trip duplication.

### Print / export — an extra hop

Both print views switch on `TimelineItemType`, **not** `EntityType`:

- `frontend/src/components/timeline/types.ts` — `TimelineItemType`. Extend this **first**.
- `frontend/src/components/timeline/PrintableItinerary.tsx` — `TimelineItemRow` dispatch
  (`default: return null`), plus `UnscheduledData`.
- `frontend/src/components/daily-view/PrintableDayItinerary.tsx` — same shape.

Extending `TimelineItemType` is also what gets custom items onto the timeline at all.

### Trip health check

`backend/src/services/tripValidator.service.ts` `validateTrip`. **Add `customItems` to
the Prisma `include` first** — otherwise every check sees them as absent.

Reuse existing `ValidationIssueCategory` values (`COMPLETENESS` for a cost with no
currency, `SCHEDULE` for a timeline conflict). Adding a **new** category would
additionally touch the compile-enforced `issuesByCategory` and two spots in
`trip.controller.ts` — avoid.

### Budget

Wire the FX snapshot into trip budget totals alongside the existing costed entities.
Unconverted amounts must be excluded from `spent` and reported under
`conversion.unconverted`, matching the documented behaviour for the other four.

## Implementation notes — things found only by building it

Six discoveries that were not in the original analysis:

1. **`crudHelpers.ts` `entityTypeToLinkType`** is a `Partial<Record<…>>`, so a missing
   entry compiles cleanly and then silently **orphans entity links on delete**. Not in
   the 22. `entityTypeDisplayNames` beside it *is* compile-enforced.
2. **`COLOR_MAP` in `entityConfig.ts` is `Record<string, ColorClasses>`**, and
   `getEntityColorClasses` falls back to gray. Naming a colour that isn't in the map is
   not a type error — it just renders gray. An `indigo` entry was added.
3. **`isActivity` in `daily-view/utils.ts` tests `'name' in item && 'allDay' in item`**,
   which `CustomItem` also satisfies. Structural guards over an expanding union are
   order-dependent: `isCustomItem` must be checked first, and `isActivity` now excludes
   it explicitly.
4. **The `?edit=<id>` deep link had no consumer.** `Timeline.handleEdit` and the daily
   view have always navigated to `?tab=…&edit=<id>`, but no manager component read the
   parameter. `CustomItemsManager` is the first; the other tabs still ignore it.
5. **`BulkActionBar` derived its label by capitalising the union member** and appending
   "s", which already rendered "Activitys". A camelCase member would have given
   "CustomItems". Replaced with an explicit label map.
6. **Backup omits FX snapshot columns** for every costed entity (only `cost`/`currency`
   travel), so snapshots are recomputed on restore. `CustomItem` follows that.

## Build order

1. Migration + Prisma models; `npx prisma generate`.
2. Backend service / controller / routes; Zod schemas using `.nullable().optional()` on
   updates. Lazy-init seeder on first type read.
3. Add `CUSTOM_ITEM` to the enum, then **let `build:strict` drive you through the 7
   compile errors** before hand-auditing the 12 silent sites.
4. Backup/restore (`ENTITY_TYPES`, `getNewEntityId`, `clearUserData`) **and**
   `trip.service.ts` `getNewId` — while no real data exists yet.
5. Frontend: `entityLink.ts` union + `VALID_ENTITY_TYPES`, `entityConfig` maps,
   `DISPLAY_ORDER`, `LINKABLE_ENTITY_TYPES`, "Custom" tab, create/edit form, `LinkPanel`.
6. `TimelineItemType` → timeline → both print views → `mapTimelineTypeToEntityType`.
7. FX snapshot into budget totals — `Prisma.Decimal` throughout.
8. Health check: `customItems` into the `validateTrip` include, then the checks.
9. Update `DATABASE_SCHEMA.md`: the new models, the corrected call-site count, and the
   wrong `backup.types.ts` comment.
