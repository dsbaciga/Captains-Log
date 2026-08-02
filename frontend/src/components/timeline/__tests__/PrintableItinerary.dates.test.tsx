import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PrintableItinerary from '../PrintableItinerary';
import type { DayGroup } from '../types';

/**
 * Day headers and the trip date range are calendar dates (date-only values).
 * They must render as the day they name regardless of the viewer's timezone —
 * parsing a "YYYY-MM-DD" string as UTC midnight and formatting it west of UTC
 * used to pull every date back a day, which made the printed itinerary look
 * broken.
 */
describe('PrintableItinerary date-only rendering', () => {
  const dayGroups: DayGroup[] = [
    {
      dateKey: '2025-06-01',
      dayNumber: 1,
      stats: { activities: 0, transportation: 0, lodging: 0, journal: 0, totalPhotosLinked: 0 },
      items: [],
    },
  ];

  it('renders the day header and trip range on the correct calendar day', () => {
    const { container } = render(
      <PrintableItinerary
        tripTitle="Test Trip"
        tripStartDate="2025-06-01"
        tripEndDate="2025-06-07"
        tripTimezone="America/Los_Angeles"
        dayGroups={dayGroups}
        unscheduled={{ activities: [], transportation: [], lodging: [] }}
      />
    );

    expect(container.querySelector('.print-day-date')?.textContent).toBe(
      'Sunday, June 1, 2025'
    );
    expect(container.querySelector('.print-dates')?.textContent).toBe(
      'June 1, 2025 - June 7, 2025'
    );
  });
});
