export interface ChecklistItem {
  id: number;
  checklistId: number;
  name: string;
  description: string | null;
  isChecked: boolean;
  isDefault: boolean;
  sortOrder: number;
  metadata: Record<string, unknown> | null;
  checkedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Checklist {
  id: number;
  userId: number;
  tripId: number | null;
  name: string;
  description: string | null;
  type: 'custom' | 'airports' | 'countries' | 'cities' | 'us_states' | 'souvenirs';
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  items: ChecklistItem[];
  stats?: {
    total: number;
    checked: number;
    percentage: number;
  };
}

export interface CreateChecklistDTO {
  name: string;
  description?: string | null;
  type: 'custom' | 'airports' | 'countries' | 'cities' | 'us_states' | 'souvenirs';
  tripId?: number | null;
  isDefault?: boolean;
  sortOrder?: number;
  items?: Array<{
    name: string;
    description?: string | null;
    isDefault?: boolean;
    sortOrder?: number;
    metadata?: Record<string, unknown> | null;
  }>;
}

export interface UpdateChecklistDTO {
  name?: string | null;
  description?: string | null;
  type?: 'custom' | 'airports' | 'countries' | 'cities' | 'us_states' | 'souvenirs' | null;
  tripId?: number | null;
  sortOrder?: number | null;
}

export interface UpdateChecklistItemDTO {
  name?: string | null;
  description?: string | null;
  isChecked?: boolean | null;
  sortOrder?: number | null;
  metadata?: Record<string, unknown> | null;
}

export interface AddChecklistItemDTO {
  name: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
}

export type ChecklistType = 'airports' | 'countries' | 'cities' | 'us_states';

export interface DefaultChecklistStatus {
  type: ChecklistType;
  name: string;
  description: string;
  exists: boolean;
}

export interface SelectiveChecklistOperationDTO {
  types: ChecklistType[];
}

/**
 * Metadata structure for airport checklist items.
 * Stored in the ChecklistItem.metadata JSON field. The `code` field is what
 * the "sync from trips" auto-check matches against, so it must always be set.
 *
 * Declared as a type alias (not an interface) so it remains assignable to the
 * `Record<string, unknown>` shape expected by AddChecklistItemDTO.metadata.
 */
export type AirportMetadata = {
  /** 3-letter IATA code, e.g. "JFK" */
  code: string;
  /** ICAO code, e.g. "KJFK" */
  icao?: string;
  /** City served by the airport */
  city: string;
  /** Country the airport is in */
  country: string;
  /** Latitude — from OpenStreetMap when confirmed, otherwise the airport dataset */
  latitude?: number;
  /** Longitude — from OpenStreetMap when confirmed, otherwise the airport dataset */
  longitude?: number;
  /** Canonical OpenStreetMap address, when a nearby match was found */
  address?: string;
};

/**
 * Metadata structure for souvenir checklist items.
 * Stored in the ChecklistItem.metadata JSON field.
 */
export interface SouvenirMetadata {
  /** Who the souvenir is for (e.g., "Mom", "Friend John") */
  forWhom: string;
  /** Estimated/budgeted price */
  estimatedPrice?: number;
  /** Actual price paid */
  actualPrice?: number;
  /** Currency code (e.g., "USD", "EUR", "JPY") */
  currency: string;
  /** Whether the souvenir has been purchased */
  purchased: boolean;
}
