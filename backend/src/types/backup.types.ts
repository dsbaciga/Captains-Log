import { z } from 'zod';

// Backup file format version
// v1.1.0 - Added travelDocuments and tripLanguages
// v1.2.0 - Added tripTypes and tripSeries
export const BACKUP_VERSION = '1.2.0';

// =============================================================================
// Shared/Reusable Schemas
// =============================================================================

// Activity category schema (user-defined activity categories)
const ActivityCategorySchema = z.object({
  name: z.string(),
  emoji: z.string().optional(),
});

// Tag schema (trip tags with colors)
const BackupTagSchema = z.object({
  name: z.string(),
  color: z.string().nullable().optional(),
  textColor: z.string().nullable().optional(),
});

// Companion schema (travel companions)
const BackupCompanionSchema = z.object({
  name: z.string(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  relationship: z.string().nullable().optional(),
  isMyself: z.boolean().optional(),
  avatarUrl: z.string().nullable().optional(),
  dietaryPreferences: z.array(z.string()).optional(),
});

// Location category schema
const BackupLocationCategorySchema = z.object({
  name: z.string(),
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  isDefault: z.boolean().optional(),
});

// Flexible date type that accepts both Date objects and ISO strings
// (Dates from Prisma during backup creation, strings during restore)
const FlexibleDateSchema = z.union([z.string(), z.date()]).nullable().optional();

// Flexible JSON type that accepts Prisma's JsonValue and plain objects
const FlexibleJsonSchema = z.union([
  z.record(z.unknown()),
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.unknown()),
  z.null(),
]).nullable().optional();

// Checklist item schema
const BackupChecklistItemSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  isChecked: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  sortOrder: z.number().optional(),
  metadata: FlexibleJsonSchema,
  checkedAt: FlexibleDateSchema,
});

// Checklist schema (global checklists)
const BackupChecklistSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  type: z.string(),
  isDefault: z.boolean().optional(),
  sortOrder: z.number().optional(),
  items: z.array(BackupChecklistItemSchema).optional(),
});

// Travel document types
const DOCUMENT_TYPES = ['PASSPORT', 'VISA', 'ID_CARD', 'GLOBAL_ENTRY', 'VACCINATION'] as const;

// Travel document schema
const BackupTravelDocumentSchema = z.object({
  type: z.enum(DOCUMENT_TYPES),
  issuingCountry: z.string(),
  documentNumber: z.string().nullable().optional(), // Masked in backups
  issueDate: FlexibleDateSchema, // ISO date string or Date object
  expiryDate: FlexibleDateSchema, // ISO date string or Date object
  name: z.string(),
  notes: z.string().nullable().optional(),
  isPrimary: z.boolean().optional(),
  alertDaysBefore: z.number().optional(),
});

// =============================================================================
// Trip-related Schemas
// =============================================================================

// Base location schema without children (to avoid circular reference type inference issue)
const BackupLocationBaseSchema = z.object({
  id: z.number().optional(), // For EntityLink mapping
  tripId: z.number().optional(),
  parentId: z.number().nullable().optional(),
  name: z.string(),
  address: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  categoryId: z.number().nullable().optional(),
  visitDatetime: z.string().nullable().optional(), // ISO datetime
  visitDurationMinutes: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  category: z.object({
    name: z.string(),
    icon: z.string().nullable().optional(),
    color: z.string().nullable().optional(),
    isDefault: z.boolean().optional(),
  }).nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

// Type for backup location (with optional children)
type BackupLocation = z.infer<typeof BackupLocationBaseSchema> & {
  children?: BackupLocation[];
};

// Location schema within a trip (with recursive children)
const BackupLocationSchema: z.ZodType<BackupLocation> = BackupLocationBaseSchema.extend({
  children: z.lazy(() => z.array(BackupLocationSchema)).optional(),
});

// Flexible coordinate type (accepts Decimal from Prisma or number)
// Prisma Decimal has a toNumber() method, regular numbers work directly
const FlexibleCoordinateSchema = z.preprocess(
  (val) => {
    if (val === null || val === undefined) return val;
    if (typeof val === 'number') return val;
    // Prisma Decimal has toNumber() method
    if (typeof val === 'object' && val !== null && 'toNumber' in val && typeof (val as Record<string, unknown>).toNumber === 'function') {
      return (val as { toNumber(): number }).toNumber();
    }
    // Try parsing string representation
    if (typeof val === 'string') {
      const num = parseFloat(val);
      return isNaN(num) ? val : num;
    }
    return val;
  },
  z.number().nullable().optional()
);

// Photo schema within a trip
const BackupPhotoSchema = z.object({
  id: z.number().optional(), // For EntityLink and album mapping
  source: z.string().optional(), // 'local' or 'immich'
  immichAssetId: z.string().nullable().optional(),
  localPath: z.string().nullable().optional(),
  thumbnailPath: z.string().nullable().optional(),
  caption: z.string().nullable().optional(),
  latitude: FlexibleCoordinateSchema,
  longitude: FlexibleCoordinateSchema,
  takenAt: FlexibleDateSchema, // ISO datetime or Date object
});

// Activity schema within a trip
const BackupActivitySchema = z.object({
  id: z.number().optional(), // For EntityLink mapping
  parentId: z.number().nullable().optional(),
  name: z.string(),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  allDay: z.boolean().optional(),
  startTime: z.string().nullable().optional(), // ISO datetime
  endTime: z.string().nullable().optional(), // ISO datetime
  timezone: z.string().nullable().optional(),
  cost: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  bookingUrl: z.string().nullable().optional(),
  bookingReference: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  manualOrder: z.number().nullable().optional(),
});

// Flight tracking schema
const BackupFlightTrackingSchema = z.object({
  flightNumber: z.string().nullable().optional(),
  airlineCode: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  gate: z.string().nullable().optional(),
  terminal: z.string().nullable().optional(),
  baggageClaim: z.string().nullable().optional(),
}).nullable().optional();

// Transportation schema within a trip
const BackupTransportationSchema = z.object({
  id: z.number().optional(), // For EntityLink mapping
  type: z.string(),
  startLocationId: z.number().nullable().optional(),
  startLocationText: z.string().nullable().optional(),
  endLocationId: z.number().nullable().optional(),
  endLocationText: z.string().nullable().optional(),
  scheduledStart: z.string().nullable().optional(), // ISO datetime
  scheduledEnd: z.string().nullable().optional(), // ISO datetime
  startTimezone: z.string().nullable().optional(),
  endTimezone: z.string().nullable().optional(),
  actualStart: z.string().nullable().optional(), // ISO datetime
  actualEnd: z.string().nullable().optional(), // ISO datetime
  company: z.string().nullable().optional(),
  referenceNumber: z.string().nullable().optional(),
  seatNumber: z.string().nullable().optional(),
  bookingReference: z.string().nullable().optional(),
  bookingUrl: z.string().nullable().optional(),
  cost: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  status: z.string().optional(),
  delayMinutes: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  connectionGroupId: z.string().nullable().optional(),
  isAutoGenerated: z.boolean().optional(),
  calculatedDistance: z.number().nullable().optional(),
  calculatedDuration: z.number().nullable().optional(),
  distanceSource: z.string().nullable().optional(),
  flightTracking: BackupFlightTrackingSchema,
});

// Lodging schema within a trip
const BackupLodgingSchema = z.object({
  id: z.number().optional(), // For EntityLink mapping
  type: z.string(),
  name: z.string(),
  address: z.string().nullable().optional(),
  checkInDate: z.string(), // ISO datetime
  checkOutDate: z.string(), // ISO datetime
  timezone: z.string().nullable().optional(),
  confirmationNumber: z.string().nullable().optional(),
  bookingUrl: z.string().nullable().optional(),
  cost: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// Journal entry schema within a trip
const BackupJournalEntrySchema = z.object({
  date: z.string().nullable().optional(), // ISO date
  title: z.string().nullable().optional(),
  content: z.string(),
  entryType: z.string(),
  mood: z.string().nullable().optional(),
  weatherNotes: z.string().nullable().optional(),
});

// Photo album assignment schema
const BackupPhotoAlbumPhotoSchema = z.object({
  photoId: z.number(),
  sortOrder: z.number().optional(),
});

// Photo album schema within a trip
const BackupPhotoAlbumSchema = z.object({
  id: z.number().optional(), // For EntityLink mapping
  name: z.string(),
  description: z.string().nullable().optional(),
  coverPhotoId: z.number().nullable().optional(),
  photos: z.array(BackupPhotoAlbumPhotoSchema).optional(),
});

// Weather data schema within a trip
const BackupWeatherDataSchema = z.object({
  locationId: z.number().nullable().optional(),
  date: z.string(), // ISO date
  temperatureHigh: z.number().nullable().optional(),
  temperatureLow: z.number().nullable().optional(),
  conditions: z.string().nullable().optional(),
  precipitation: z.number().nullable().optional(),
  humidity: z.number().nullable().optional(),
  windSpeed: z.number().nullable().optional(),
});

// Entity link types
const ENTITY_TYPES = ['PHOTO', 'LOCATION', 'ACTIVITY', 'LODGING', 'TRANSPORTATION', 'JOURNAL_ENTRY', 'PHOTO_ALBUM'] as const;
const LINK_RELATIONSHIPS = ['RELATED', 'TAKEN_AT', 'OCCURRED_AT', 'PART_OF', 'DOCUMENTS', 'FEATURED_IN'] as const;

// Entity link schema within a trip
const BackupEntityLinkSchema = z.object({
  sourceType: z.enum(ENTITY_TYPES),
  sourceId: z.number(),
  targetType: z.enum(ENTITY_TYPES),
  targetId: z.number(),
  relationship: z.enum(LINK_RELATIONSHIPS).optional(),
  sortOrder: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// Trip language schema
const BackupTripLanguageSchema = z.object({
  languageCode: z.string(),
  language: z.string(),
});

// Trip checklist schema (trip-specific checklists with items)
const BackupTripChecklistSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  type: z.string(),
  isDefault: z.boolean().optional(),
  sortOrder: z.number().optional(),
  items: z.array(BackupChecklistItemSchema).optional(),
});

// Complete trip schema
const BackupTripSchema = z.object({
  // Trip basic info
  title: z.string(),
  description: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(), // ISO date
  endDate: z.string().nullable().optional(), // ISO date
  timezone: z.string().nullable().optional(),
  status: z.string(),
  privacyLevel: z.string(),
  coverPhotoId: z.number().nullable().optional(),
  bannerPhotoId: z.number().nullable().optional(),
  addToPlacesVisited: z.boolean().optional(),
  // Trip type (added in v1.2.0)
  tripType: z.string().nullable().optional(),
  tripTypeEmoji: z.string().nullable().optional(),
  // Series assignment (added in v1.2.0)
  seriesId: z.number().nullable().optional(),
  seriesOrder: z.number().nullable().optional(),

  // Related entities
  locations: z.array(BackupLocationSchema).optional(),
  photos: z.array(BackupPhotoSchema).optional(),
  activities: z.array(BackupActivitySchema).optional(),
  transportation: z.array(BackupTransportationSchema).optional(),
  lodging: z.array(BackupLodgingSchema).optional(),
  journalEntries: z.array(BackupJournalEntrySchema).optional(),
  photoAlbums: z.array(BackupPhotoAlbumSchema).optional(),
  weatherData: z.array(BackupWeatherDataSchema).optional(),

  // Many-to-many relationships (stored as names for portability)
  tags: z.array(z.string()).optional(),
  companions: z.array(z.string()).optional(),

  // Trip-specific checklists
  checklists: z.array(BackupTripChecklistSchema).optional(),

  // Entity links
  entityLinks: z.array(BackupEntityLinkSchema).optional(),

  // Trip languages (added in v1.1.0)
  tripLanguages: z.array(BackupTripLanguageSchema).optional(),
});

// =============================================================================
// Main Backup Data Schema
// =============================================================================

// Backup data structure schema
export const BackupDataSchema = z.object({
  version: z.string(),
  exportDate: z.string(), // ISO 8601 date string
  user: z.object({
    username: z.string(),
    email: z.string(),
    timezone: z.string().nullable(),
    activityCategories: z.array(ActivityCategorySchema),
    tripTypes: z.array(z.object({
      name: z.string(),
      emoji: z.string().optional(),
    })).optional(),
    immichApiUrl: z.string().nullable(),
    immichApiKey: z.string().nullable(),
    weatherApiKey: z.string().nullable(),
    aviationstackApiKey: z.string().nullable().optional(),
    openrouteserviceApiKey: z.string().nullable().optional(),
  }),
  tags: z.array(BackupTagSchema),
  companions: z.array(BackupCompanionSchema),
  locationCategories: z.array(BackupLocationCategorySchema),
  checklists: z.array(BackupChecklistSchema),
  // Travel documents (added in v1.1.0)
  travelDocuments: z.array(BackupTravelDocumentSchema).optional(),
  // Trip series (added in v1.2.0)
  tripSeries: z.array(z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable().optional(),
  })).optional(),
  trips: z.array(BackupTripSchema),
});

export type BackupData = z.infer<typeof BackupDataSchema>;

// Export individual schema types for use in services
export type BackupPhoto = z.infer<typeof BackupPhotoSchema>;
export type BackupTag = z.infer<typeof BackupTagSchema>;
export type BackupCompanion = z.infer<typeof BackupCompanionSchema>;
export type BackupLocationCategory = z.infer<typeof BackupLocationCategorySchema>;
export type BackupChecklist = z.infer<typeof BackupChecklistSchema>;
export type BackupChecklistItem = z.infer<typeof BackupChecklistItemSchema>;
export type BackupTravelDocument = z.infer<typeof BackupTravelDocumentSchema>;
export type BackupTrip = z.infer<typeof BackupTripSchema>;
export type BackupActivity = z.infer<typeof BackupActivitySchema>;
export type BackupTransportation = z.infer<typeof BackupTransportationSchema>;
export type BackupLodging = z.infer<typeof BackupLodgingSchema>;
export type BackupJournalEntry = z.infer<typeof BackupJournalEntrySchema>;
export type BackupPhotoAlbum = z.infer<typeof BackupPhotoAlbumSchema>;
export type BackupWeatherData = z.infer<typeof BackupWeatherDataSchema>;
export type BackupEntityLink = z.infer<typeof BackupEntityLinkSchema>;
export type BackupTripLanguage = z.infer<typeof BackupTripLanguageSchema>;

// Response types
export const BackupInfoResponseSchema = z.object({
  hasBackup: z.boolean(),
  lastBackupDate: z.string().nullable(),
  backupSize: z.number().nullable(),
});

export type BackupInfoResponse = z.infer<typeof BackupInfoResponseSchema>;

// Restore options
export const RestoreOptionsSchema = z.object({
  clearExistingData: z.boolean().default(true),
  importPhotos: z.boolean().default(true),
});

export type RestoreOptions = z.infer<typeof RestoreOptionsSchema>;

// Progress callback type
export type ProgressCallback = (progress: number, message: string) => void;
