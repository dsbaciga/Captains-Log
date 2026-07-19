/**
 * Types for the Memories feature ("On This Day" + "Year in Review").
 * Read-only aggregations over existing trip/photo/journal/location data.
 */

export interface MemoryTrip {
  id: number;
  title: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
  tripTypeEmoji: string | null;
  coverPhoto: MemoryPhotoRef | null;
}

export interface MemoryPhotoRef {
  id: number;
  source: string;
  thumbnailPath: string | null;
  localPath: string | null;
}

export interface MemoryPhoto extends MemoryPhotoRef {
  tripId: number;
  tripTitle: string;
  caption: string | null;
  takenAt: string | null;
}

export interface MemoryJournalEntry {
  id: number;
  tripId: number;
  tripTitle: string;
  title: string | null;
  date: string | null;
  excerpt: string;
}

export interface OnThisDayYear {
  year: number;
  trips: MemoryTrip[];
  photos: MemoryPhoto[];
  journalEntries: MemoryJournalEntry[];
}

export interface YearInReviewTag {
  id: number;
  name: string;
  color: string | null;
  textColor: string | null;
  tripCount: number;
}

export interface YearInReview {
  year: number;
  /** Years (descending) that have at least one dated trip, for the year selector. */
  availableYears: number[];
  tripCount: number;
  daysTraveled: number;
  countries: string[];
  cities: string[];
  totalDistanceKm: number;
  flightCount: number;
  photoCount: number;
  journalEntryCount: number;
  topTags: YearInReviewTag[];
  /** Trip-day counts per calendar month (index 0 = January). */
  monthlyTripDays: number[];
  trips: MemoryTrip[];
  /** Up to ~12 photos spread across the year. */
  highlightPhotos: MemoryPhoto[];
}
