import type { Activity } from '../../types/activity';
import type { Transportation } from '../../types/transportation';
import type { Lodging } from '../../types/lodging';
import type { JournalEntry } from '../../types/journalEntry';
import type { Location } from '../../types/location';
import type { CustomItem } from '../../types/customItem';

/** Where a given day falls within a multi-day lodging stay. */
export interface LodgingDayContext {
  isCheckInDay: boolean;
  isCheckOutDay: boolean;
  nightNumber?: number;
  totalNights?: number;
}

/**
 * A single entry on a day's timeline.
 *
 * Discriminated on `type`, so `item.data` narrows automatically inside a check
 * on it — no casts needed. This also makes two invalid states unrepresentable:
 * pairing a `type` with the wrong `data`, and attaching `lodgingContext` to
 * anything other than a lodging item.
 */
export type DayItem =
  | { type: 'activity'; dateTime: Date; data: Activity }
  | { type: 'transportation'; dateTime: Date; data: Transportation }
  | { type: 'lodging'; dateTime: Date; data: Lodging; lodgingContext?: LodgingDayContext }
  | { type: 'journal'; dateTime: Date; data: JournalEntry }
  | { type: 'location'; dateTime: Date; data: Location }
  | { type: 'customItem'; dateTime: Date; data: CustomItem };
