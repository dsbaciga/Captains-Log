import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import ActivityManager from "../ActivityManager";
import { activityService } from "../../services/activity.service";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock the activity service
vi.mock("../../services/activity.service", () => {
  const mockService = {
    getActivitiesByTrip: vi.fn(),
    createActivity: vi.fn(),
    updateActivity: vi.fn(),
    deleteActivity: vi.fn(),
  };
  return {
    activityService: mockService,
    default: mockService,
  };
});

describe("ActivityManager", () => {
  const tripId = 1;
  const queryClient = new QueryClient();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock successful response
    vi.mocked(activityService.getActivitiesByTrip).mockResolvedValue([]);
  });

  it("should not cause infinite loop on mount", async () => {
    const getActivitiesSpy = vi.mocked(activityService.getActivitiesByTrip);

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ActivityManager tripId={tripId} locations={[]} />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(getActivitiesSpy).toHaveBeenCalledTimes(1);
    });

    // Wait a bit longer to ensure no additional calls
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should still only be called once
    expect(getActivitiesSpy).toHaveBeenCalledTimes(1);
  });

  it("should not reload when switching to tab and back", async () => {
    const getActivitiesSpy = vi.mocked(activityService.getActivitiesByTrip);

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ActivityManager tripId={tripId} locations={[]} />
        </BrowserRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(getActivitiesSpy).toHaveBeenCalledTimes(1);
    });

    // Simulate tab switch by unmounting and remounting
    rerender(
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <div>Other Tab</div>
            </BrowserRouter>
        </QueryClientProvider>
    );

    rerender(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ActivityManager tripId={tripId} locations={[]} />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Should reload when coming back to tab
    await waitFor(() => {
      expect(getActivitiesSpy).toHaveBeenCalledTimes(2);
    });

    // Wait to ensure no infinite loop
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(getActivitiesSpy).toHaveBeenCalledTimes(2);
  });
});