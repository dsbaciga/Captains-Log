import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ActivityManager from '../ActivityManager';
import { activityService } from '../../services/activity.service';

// Mock the activity service
vi.mock('../../services/activity.service', () => ({
  activityService: {
    getActivitiesByTrip: vi.fn(),
    createActivity: vi.fn(),
    updateActivity: vi.fn(),
    deleteActivity: vi.fn(),
  },
}));

describe('ActivityManager', () => {
  const tripId = 1;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock successful response
    vi.mocked(activityService.getActivitiesByTrip).mockResolvedValue([]);
  });

  it('should not cause infinite loop on mount', async () => {
    const getActivitiesSpy = vi.mocked(activityService.getActivitiesByTrip);

    render(
      <BrowserRouter>
        <ActivityManager tripId={tripId} locations={[]} />
      </BrowserRouter>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(getActivitiesSpy).toHaveBeenCalledTimes(1);
    });

    // Wait a bit longer to ensure no additional calls
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should still only be called once
    expect(getActivitiesSpy).toHaveBeenCalledTimes(1);
  });

  it('should not reload when switching to tab and back', async () => {
    const getActivitiesSpy = vi.mocked(activityService.getActivitiesByTrip);

    const { rerender } = render(
      <BrowserRouter>
        <ActivityManager tripId={tripId} locations={[]} />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(getActivitiesSpy).toHaveBeenCalledTimes(1);
    });

    // Simulate tab switch by unmounting and remounting
    rerender(
      <BrowserRouter>
        <div>Other Tab</div>
      </BrowserRouter>
    );

    rerender(
      <BrowserRouter>
        <ActivityManager tripId={tripId} locations={[]} />
      </BrowserRouter>
    );

    // Should reload when coming back to tab
    await waitFor(() => {
      expect(getActivitiesSpy).toHaveBeenCalledTimes(2);
    });

    // Wait to ensure no infinite loop
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(getActivitiesSpy).toHaveBeenCalledTimes(2);
  });
});
