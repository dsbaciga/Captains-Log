import { forwardRef } from 'react';
import type { DayGroup, TimelineItem } from './types';
import type { Activity } from '../../types/activity';
import type { Transportation } from '../../types/transportation';
import type { Lodging } from '../../types/lodging';
import PrintMiniMap, { PrintRouteMap } from './PrintMiniMap';

interface UnscheduledData {
  activities: Activity[];
  transportation: Transportation[];
  lodging: Lodging[];
}

interface PrintableItineraryProps {
  tripTitle: string;
  tripStartDate?: string;
  tripEndDate?: string;
  tripTimezone?: string;
  dayGroups: DayGroup[];
  unscheduled: UnscheduledData;
  showMaps?: boolean;
}

// Format time from ISO string or Date
const formatTime = (dateTime: Date | string | null | undefined, timezone?: string): string => {
  if (!dateTime) return '';
  const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
  if (isNaN(date.getTime())) return '';

  try {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: timezone,
    });
  } catch {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
};

// Format date for headers
const formatDateHeader = (dateKey: string): string => {
  try {
    const date = new Date(dateKey);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateKey;
  }
};

// Format currency
const formatCost = (cost: number | null | undefined, currency: string | null | undefined): string => {
  if (cost === null || cost === undefined) return '';
  const curr = currency || 'USD';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
    }).format(cost);
  } catch {
    return `${curr} ${cost.toFixed(2)}`;
  }
};

// Get transportation type display name
const getTransportTypeName = (type: string): string => {
  const names: Record<string, string> = {
    flight: 'Flight',
    train: 'Train',
    bus: 'Bus',
    car: 'Car',
    ferry: 'Ferry',
    bicycle: 'Bicycle',
    walk: 'Walking',
    other: 'Other',
  };
  return names[type] || type;
};

// Get lodging type display name
const getLodgingTypeName = (type: string): string => {
  const names: Record<string, string> = {
    hotel: 'Hotel',
    hostel: 'Hostel',
    airbnb: 'Airbnb',
    vacation_rental: 'Vacation Rental',
    camping: 'Camping',
    resort: 'Resort',
    motel: 'Motel',
    bed_and_breakfast: 'B&B',
    apartment: 'Apartment',
    friends_family: 'Friends/Family',
    other: 'Other',
  };
  return names[type] || type;
};

// Render a single activity item
const ActivityItem = ({ item, timezone, showMaps }: { item: TimelineItem; timezone?: string; showMaps?: boolean }) => {
  const activity = item.data as Activity;
  const startTime = formatTime(item.dateTime, timezone);
  const endTime = item.endDateTime ? formatTime(item.endDateTime, timezone) : '';
  const timeRange = item.isAllDay ? 'All Day' : (endTime ? `${startTime} - ${endTime}` : startTime);

  // Get coordinates from item or activity location
  const hasCoords = item.locationCoords?.latitude && item.locationCoords?.longitude;

  return (
    <div className="print-item">
      <div className="print-item-header">
        <span className="print-item-type">Activity</span>
        {timeRange && <span className="print-item-time">{timeRange}</span>}
      </div>
      <div className="print-item-title">{item.title}</div>
      {activity.category && <div className="print-item-detail">Category: {activity.category}</div>}
      {item.location && (
        <div className="print-item-detail">
          Location: {item.location}
        </div>
      )}
      {activity.bookingReference && (
        <div className="print-item-detail">Booking Ref: {activity.bookingReference}</div>
      )}
      {activity.cost && (
        <div className="print-item-detail">Cost: {formatCost(activity.cost, activity.currency)}</div>
      )}
      {activity.notes && <div className="print-item-notes">Notes: {activity.notes}</div>}
      {activity.description && <div className="print-item-description">{activity.description}</div>}
      {showMaps && hasCoords && (
        <div className="print-item-map">
          <PrintMiniMap
            latitude={item.locationCoords!.latitude}
            longitude={item.locationCoords!.longitude}
            label={item.title}
          />
        </div>
      )}
    </div>
  );
};

// Render a single transportation item
const TransportationItem = ({ item, timezone, showMaps }: { item: TimelineItem; timezone?: string; showMaps?: boolean }) => {
  const transport = item.data as Transportation;
  const departTime = formatTime(item.dateTime, item.startTimezone || timezone);
  const arriveTime = item.endDateTime ? formatTime(item.endDateTime, item.endTimezone || timezone) : '';

  // Check for route coordinates
  const hasRouteCoords = transport.fromLocation?.latitude && transport.fromLocation?.longitude &&
    transport.toLocation?.latitude && transport.toLocation?.longitude;

  return (
    <div className="print-item">
      <div className="print-item-header">
        <span className="print-item-type">{getTransportTypeName(transport.type)}</span>
        {departTime && <span className="print-item-time">{departTime}{arriveTime && ` - ${arriveTime}`}</span>}
      </div>
      <div className="print-item-title">{item.title}</div>
      {item.subtitle && <div className="print-item-subtitle">{item.subtitle}</div>}
      {transport.fromLocationName && (
        <div className="print-item-detail">
          From: {transport.fromLocationName}
          {transport.fromLocation?.address && ` (${transport.fromLocation.address})`}
        </div>
      )}
      {transport.toLocationName && (
        <div className="print-item-detail">
          To: {transport.toLocationName}
          {transport.toLocation?.address && ` (${transport.toLocation.address})`}
        </div>
      )}
      {transport.carrier && <div className="print-item-detail">Carrier: {transport.carrier}</div>}
      {transport.vehicleNumber && (
        <div className="print-item-detail">
          {transport.type === 'flight' ? 'Flight' : 'Vehicle'} #: {transport.vehicleNumber}
        </div>
      )}
      {transport.confirmationNumber && (
        <div className="print-item-detail">Confirmation: {transport.confirmationNumber}</div>
      )}
      {transport.cost && (
        <div className="print-item-detail">Cost: {formatCost(transport.cost, transport.currency)}</div>
      )}
      {transport.notes && <div className="print-item-notes">Notes: {transport.notes}</div>}
      {showMaps && hasRouteCoords && (
        <div className="print-item-map">
          <PrintRouteMap
            fromLatitude={transport.fromLocation!.latitude!}
            fromLongitude={transport.fromLocation!.longitude!}
            toLatitude={transport.toLocation!.latitude!}
            toLongitude={transport.toLocation!.longitude!}
            fromLabel={transport.fromLocationName || 'Departure'}
            toLabel={transport.toLocationName || 'Arrival'}
          />
        </div>
      )}
    </div>
  );
};

// Render a single lodging item
const LodgingItem = ({ item, timezone }: { item: TimelineItem; timezone?: string; showMaps?: boolean }) => {
  const lodging = item.data as Lodging;
  const isCheckIn = item.showCheckInTime;
  const isCheckOut = item.showCheckOutTime;
  const time = formatTime(item.dateTime, timezone);

  let timeLabel = time;
  if (isCheckIn) timeLabel = `Check-in: ${time || 'TBD'}`;
  else if (isCheckOut) timeLabel = `Check-out: ${time || 'TBD'}`;

  return (
    <div className="print-item">
      <div className="print-item-header">
        <span className="print-item-type">{getLodgingTypeName(lodging.type)}</span>
        {timeLabel && <span className="print-item-time">{timeLabel}</span>}
      </div>
      <div className="print-item-title">{lodging.name}</div>
      {item.multiDayInfo && (
        <div className="print-item-detail">
          Night {item.multiDayInfo.nightNumber} of {item.multiDayInfo.totalNights}
        </div>
      )}
      {lodging.address && (
        <div className="print-item-detail">
          Address: {lodging.address}
        </div>
      )}
      {lodging.confirmationNumber && (
        <div className="print-item-detail">Confirmation: {lodging.confirmationNumber}</div>
      )}
      {lodging.cost && (
        <div className="print-item-detail">Cost: {formatCost(lodging.cost, lodging.currency)}</div>
      )}
      {lodging.notes && <div className="print-item-notes">Notes: {lodging.notes}</div>}
    </div>
  );
};

// Render a single journal item
const JournalItem = ({ item }: { item: TimelineItem }) => {
  return (
    <div className="print-item print-item-journal">
      <div className="print-item-header">
        <span className="print-item-type">Journal Entry</span>
      </div>
      {item.title && <div className="print-item-title">{item.title}</div>}
      {item.description && (
        <div className="print-item-description">{item.description}</div>
      )}
    </div>
  );
};

// Render timeline item based on type
const TimelineItemRow = ({ item, timezone, showMaps }: { item: TimelineItem; timezone?: string; showMaps?: boolean }) => {
  switch (item.type) {
    case 'activity':
      return <ActivityItem item={item} timezone={timezone} showMaps={showMaps} />;
    case 'transportation':
      return <TransportationItem item={item} timezone={timezone} showMaps={showMaps} />;
    case 'lodging':
      return <LodgingItem item={item} timezone={timezone} showMaps={showMaps} />;
    case 'journal':
      return <JournalItem item={item} />;
    default:
      return null;
  }
};

// Unscheduled activity item
const UnscheduledActivityItem = ({ activity }: { activity: Activity }) => (
  <div className="print-item">
    <div className="print-item-header">
      <span className="print-item-type">Activity</span>
    </div>
    <div className="print-item-title">{activity.name}</div>
    {activity.category && <div className="print-item-detail">Category: {activity.category}</div>}
    {activity.bookingReference && (
      <div className="print-item-detail">Booking Ref: {activity.bookingReference}</div>
    )}
    {activity.cost && (
      <div className="print-item-detail">Cost: {formatCost(activity.cost, activity.currency)}</div>
    )}
    {activity.notes && <div className="print-item-notes">Notes: {activity.notes}</div>}
    {activity.description && <div className="print-item-description">{activity.description}</div>}
  </div>
);

// Unscheduled transportation item
const UnscheduledTransportationItem = ({ transport }: { transport: Transportation }) => (
  <div className="print-item">
    <div className="print-item-header">
      <span className="print-item-type">{getTransportTypeName(transport.type)}</span>
    </div>
    <div className="print-item-title">
      {transport.fromLocationName || transport.fromLocation?.name || 'TBD'} →{' '}
      {transport.toLocationName || transport.toLocation?.name || 'TBD'}
    </div>
    {transport.carrier && <div className="print-item-detail">Carrier: {transport.carrier}</div>}
    {transport.vehicleNumber && (
      <div className="print-item-detail">
        {transport.type === 'flight' ? 'Flight' : 'Vehicle'} #: {transport.vehicleNumber}
      </div>
    )}
    {transport.confirmationNumber && (
      <div className="print-item-detail">Confirmation: {transport.confirmationNumber}</div>
    )}
    {transport.cost && (
      <div className="print-item-detail">Cost: {formatCost(transport.cost, transport.currency)}</div>
    )}
    {transport.notes && <div className="print-item-notes">Notes: {transport.notes}</div>}
  </div>
);

// Unscheduled lodging item
const UnscheduledLodgingItem = ({ lodging }: { lodging: Lodging }) => (
  <div className="print-item">
    <div className="print-item-header">
      <span className="print-item-type">{getLodgingTypeName(lodging.type)}</span>
    </div>
    <div className="print-item-title">{lodging.name}</div>
    {lodging.address && (
      <div className="print-item-detail">
        Address: {lodging.address}
      </div>
    )}
    {lodging.confirmationNumber && (
      <div className="print-item-detail">Confirmation: {lodging.confirmationNumber}</div>
    )}
    {lodging.cost && (
      <div className="print-item-detail">Cost: {formatCost(lodging.cost, lodging.currency)}</div>
    )}
    {lodging.notes && <div className="print-item-notes">Notes: {lodging.notes}</div>}
  </div>
);

const PrintableItinerary = forwardRef<HTMLDivElement, PrintableItineraryProps>(
  ({ tripTitle, tripStartDate, tripEndDate, tripTimezone, dayGroups, unscheduled, showMaps }, ref) => {
    const formatTripDateRange = () => {
      if (!tripStartDate) return '';
      const start = new Date(tripStartDate);
      const startStr = start.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      if (!tripEndDate) return startStr;
      const end = new Date(tripEndDate);
      const endStr = end.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      return `${startStr} - ${endStr}`;
    };

    const hasUnscheduledItems =
      unscheduled.activities.length > 0 ||
      unscheduled.transportation.length > 0 ||
      unscheduled.lodging.length > 0;

    // Sort items within each day by time
    const sortItemsByTime = (items: TimelineItem[]): TimelineItem[] => {
      return [...items].sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
    };

    return (
      <div ref={ref} className="print-itinerary">
        {/* Header */}
        <div className="print-header">
          <h1 className="print-title">{tripTitle}</h1>
          <p className="print-dates">{formatTripDateRange()}</p>
          {tripTimezone && <p className="print-timezone">All times in {tripTimezone}</p>}
        </div>

        {/* Day by Day Breakdown */}
        {dayGroups.map((dayGroup) => {
          const sortedItems = sortItemsByTime(dayGroup.items);
          const hasItems = sortedItems.length > 0;

          return (
            <div key={dayGroup.dateKey} className="print-day">
              <div className="print-day-header">
                {dayGroup.dayNumber && <span className="print-day-number">Day {dayGroup.dayNumber}</span>}
                <span className="print-day-date">{formatDateHeader(dayGroup.dateKey)}</span>
              </div>

              {hasItems ? (
                <div className="print-day-items">
                  {sortedItems.map((item) => (
                    <TimelineItemRow
                      key={`${item.type}-${item.id}`}
                      item={item}
                      timezone={tripTimezone}
                      showMaps={showMaps}
                    />
                  ))}
                </div>
              ) : (
                <div className="print-day-empty">No scheduled items</div>
              )}
            </div>
          );
        })}

        {/* Unscheduled Section */}
        {hasUnscheduledItems && (
          <div className="print-unscheduled">
            <div className="print-section-header">Unscheduled Items</div>

            {unscheduled.activities.length > 0 && (
              <div className="print-unscheduled-group">
                <div className="print-unscheduled-group-title">Activities</div>
                {unscheduled.activities.map((activity) => (
                  <UnscheduledActivityItem key={activity.id} activity={activity} />
                ))}
              </div>
            )}

            {unscheduled.transportation.length > 0 && (
              <div className="print-unscheduled-group">
                <div className="print-unscheduled-group-title">Transportation</div>
                {unscheduled.transportation.map((transport) => (
                  <UnscheduledTransportationItem key={transport.id} transport={transport} />
                ))}
              </div>
            )}

            {unscheduled.lodging.length > 0 && (
              <div className="print-unscheduled-group">
                <div className="print-unscheduled-group-title">Lodging</div>
                {unscheduled.lodging.map((lodging) => (
                  <UnscheduledLodgingItem key={lodging.id} lodging={lodging} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="print-footer">
          <p>Generated from Travel Life</p>
        </div>
      </div>
    );
  }
);

PrintableItinerary.displayName = 'PrintableItinerary';

export default PrintableItinerary;
