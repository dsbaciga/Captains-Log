import type { Activity } from '../../types/activity';
import type { Transportation } from '../../types/transportation';
import type { Lodging } from '../../types/lodging';
import type { JournalEntry } from '../../types/journalEntry';
import type { WeatherDisplay } from '../../types/weather';
import type { EntityLinkSummary } from '../../types/entityLink';

// Re-export Activity type for use in other timeline components
export type { Activity };

// Activity with linked location info for unscheduled activities display
export interface UnscheduledActivityWithLocation extends Activity {
  linkedLocations?: { id: number; name: string }[];
}

export type TimelineItemType = 'activity' | 'transportation' | 'lodging' | 'journal';

export type TransportationType =
  | 'flight'
  | 'train'
  | 'bus'
  | 'car'
  | 'ferry'
  | 'bicycle'
  | 'walk'
  | 'other';

export interface MultiDayInfo {
  originalId: number;
  nightNumber: number;
  totalNights: number;
}

export interface ConnectionInfo {
  legNumber: number;
  totalLegs: number;
  isFirst: boolean;
  isLast: boolean;
  groupId: string;
}

export interface TimelineItem {
  id: number;
  type: TimelineItemType;
  dateTime: Date;
  endDateTime?: Date;
  title: string;
  subtitle?: string;
  description?: string;
  location?: string;
  locationCoords?: { latitude: number; longitude: number };
  cost?: number;
  currency?: string;
  isAllDay?: boolean;
  showCheckInTime?: boolean;
  showCheckOutTime?: boolean;
  startTimezone?: string;
  endTimezone?: string;
  transportationType?: TransportationType;
  vehicleNumber?: string;
  confirmationNumber?: string;
  durationMinutes?: number;
  distanceKm?: number;
  fromCoords?: { latitude: number; longitude: number };
  toCoords?: { latitude: number; longitude: number };
  connectionGroupId?: string;
  multiDayInfo?: MultiDayInfo;
  data: Activity | Transportation | Lodging | JournalEntry;
}

export interface DayStats {
  activities: number;
  transportation: number;
  lodging: number;
  journal: number;
  totalPhotosLinked: number;
}

export interface DayGroup {
  dateKey: string;
  dayNumber: number | null;
  items: TimelineItem[];
  weather?: WeatherDisplay;
  stats: DayStats;
  unscheduledActivities?: UnscheduledActivityWithLocation[];
}

// Props interfaces for components
export interface TimelineEventCardProps {
  item: TimelineItem;
  tripId: number;
  tripTimezone?: string;
  userTimezone?: string;
  showDualTime: boolean;
  mobileActiveTimezone?: 'trip' | 'user';
  linkSummary?: EntityLinkSummary;
  viewMode: 'standard' | 'compact';
  connectionInfo?: ConnectionInfo;
  showConnectionLine?: boolean;
  onEdit: (item: TimelineItem) => void;
  onDelete: (item: TimelineItem) => void;
  onLinkUpdate: () => void;
}

export interface DayHeaderProps {
  date: string;
  dayNumber: number | null;
  tripTimezone?: string;
  userTimezone?: string;
  weather?: WeatherDisplay;
  stats: DayStats;
  eventCount: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export interface PhotoPreviewPopoverProps {
  tripId: number;
  entityType: 'ACTIVITY' | 'TRANSPORTATION' | 'LODGING' | 'JOURNAL_ENTRY';
  entityId: number;
  photoCount: number;
  onViewAll: () => void;
}

export interface MobileTimezoneToggleProps {
  activeTimezone: 'trip' | 'user';
  tripTimezone?: string;
  userTimezone?: string;
  onToggle: (tz: 'trip' | 'user') => void;
}
