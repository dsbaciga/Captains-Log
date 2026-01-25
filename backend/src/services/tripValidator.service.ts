import prisma from '../config/database';
import travelTimeService from './travelTime.service';
import { TripWithRelations } from '../types/prisma-helpers';
import { AppError } from '../utils/errors';

// =============================================================================
// TYPES
// =============================================================================

export type ValidationIssueCategory = 'SCHEDULE' | 'ACCOMMODATIONS' | 'TRANSPORTATION' | 'COMPLETENESS';
export type ValidationStatus = 'okay' | 'potential_issues';

export interface ValidationIssue {
  id: string; // Unique identifier for this specific issue instance (issueType:issueKey)
  category: ValidationIssueCategory;
  type: string;
  message: string;
  affectedItems?: (string | number)[];
  suggestion?: string;
  isDismissed: boolean;
  quickAction?: {
    type: 'add_lodging' | 'add_transportation' | 'view_conflict' | 'edit_activity';
    label: string;
    data?: Record<string, unknown>;
  };
}

export interface ValidationResult {
  tripId: number;
  status: ValidationStatus;
  issuesByCategory: Record<ValidationIssueCategory, ValidationIssue[]>;
  totalIssues: number;
  activeIssues: number; // Issues not dismissed
  dismissedIssues: number;
}

interface ActivityWithLocation {
  id: number;
  name: string;
  startTime: Date | null;
  endTime: Date | null;
  location: {
    id: number;
    latitude: unknown;
    longitude: unknown;
  } | null;
}

// =============================================================================
// VALIDATION CONTEXT
// =============================================================================

type TripStatus = 'Dream' | 'Planning' | 'Planned' | 'In Progress' | 'Completed' | 'Cancelled';

interface ValidationContext {
  checkSchedule: boolean;
  checkAccommodations: boolean;
  checkTransportation: boolean;
  checkCompleteness: boolean;
}

function getValidationContext(tripStatus: string): ValidationContext {
  const status = tripStatus as TripStatus;

  switch (status) {
    case 'Dream':
      // Minimal validation - just check for invalid dates if dates exist
      return {
        checkSchedule: true, // Only invalid dates
        checkAccommodations: false,
        checkTransportation: false,
        checkCompleteness: false,
      };
    case 'Planning':
      // Basic structure validation
      return {
        checkSchedule: true,
        checkAccommodations: false, // Don't require lodging yet
        checkTransportation: false,
        checkCompleteness: false,
      };
    case 'Planned':
    case 'In Progress':
    case 'Completed':
      // Full validation
      return {
        checkSchedule: true,
        checkAccommodations: true,
        checkTransportation: true,
        checkCompleteness: true,
      };
    case 'Cancelled':
      // No validation needed for cancelled trips
      return {
        checkSchedule: false,
        checkAccommodations: false,
        checkTransportation: false,
        checkCompleteness: false,
      };
    default:
      // Default to full validation
      return {
        checkSchedule: true,
        checkAccommodations: true,
        checkTransportation: true,
        checkCompleteness: true,
      };
  }
}

// =============================================================================
// SERVICE
// =============================================================================

class TripValidatorService {
  /**
   * Generate a unique issue ID from type and key
   */
  private generateIssueId(type: string, key: string): string {
    return `${type}:${key}`;
  }

  /**
   * Validate a trip and return categorized issues with dismissal status
   */
  async validateTrip(tripId: number, userId: number): Promise<ValidationResult> {
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, userId },
      include: {
        activities: true,
        lodging: true,
        transportation: true,
        locations: true,
        journalEntries: true,
        dismissedValidationIssues: true,
      },
    });

    if (!trip) {
      throw new AppError('Trip not found', 404);
    }

    const context = getValidationContext(trip.status);
    const dismissedSet = new Set<string>(
      (trip.dismissedValidationIssues as Array<{ issueType: string; issueKey: string }>).map(
        (d) => `${d.issueType}:${d.issueKey}`
      )
    );

    const issues: ValidationIssue[] = [];

    // Run validation checks based on context
    if (context.checkSchedule) {
      issues.push(...this.checkTimelineConflicts(trip, dismissedSet));
      issues.push(...this.checkInvalidDates(trip, dismissedSet));
      issues.push(...await this.checkTravelTimeAlerts(trip, dismissedSet));
    }

    if (context.checkAccommodations) {
      issues.push(...this.checkMissingLodging(trip, dismissedSet));
    }

    if (context.checkTransportation) {
      issues.push(...this.checkMissingTransportation(trip, dismissedSet));
    }

    if (context.checkCompleteness) {
      issues.push(...await this.checkMissingInformation(trip, dismissedSet));
      issues.push(...this.checkEmptyDays(trip, dismissedSet));
    }

    // Group issues by category
    const issuesByCategory: Record<ValidationIssueCategory, ValidationIssue[]> = {
      SCHEDULE: [],
      ACCOMMODATIONS: [],
      TRANSPORTATION: [],
      COMPLETENESS: [],
    };

    issues.forEach(issue => {
      issuesByCategory[issue.category].push(issue);
    });

    const activeIssues = issues.filter(i => !i.isDismissed).length;
    const dismissedIssues = issues.filter(i => i.isDismissed).length;

    return {
      tripId,
      status: activeIssues === 0 ? 'okay' : 'potential_issues',
      issuesByCategory,
      totalIssues: issues.length,
      activeIssues,
      dismissedIssues,
    };
  }

  /**
   * Dismiss a validation issue
   */
  async dismissIssue(
    tripId: number,
    userId: number,
    issueType: string,
    issueKey: string,
    category: ValidationIssueCategory
  ): Promise<void> {
    // Verify trip ownership
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, userId },
    });

    if (!trip) {
      throw new AppError('Trip not found', 404);
    }

    await prisma.dismissedValidationIssue.upsert({
      where: {
        tripId_issueType_issueKey: {
          tripId,
          issueType,
          issueKey,
        },
      },
      create: {
        tripId,
        issueType,
        issueKey,
        category,
      },
      update: {
        dismissedAt: new Date(),
      },
    });
  }

  /**
   * Restore (undismiss) a validation issue
   */
  async restoreIssue(
    tripId: number,
    userId: number,
    issueType: string,
    issueKey: string
  ): Promise<void> {
    // Verify trip ownership
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, userId },
    });

    if (!trip) {
      throw new AppError('Trip not found', 404);
    }

    await prisma.dismissedValidationIssue.deleteMany({
      where: {
        tripId,
        issueType,
        issueKey,
      },
    });
  }

  /**
   * Get quick validation status (for passive indicator)
   */
  async getQuickStatus(tripId: number, userId: number): Promise<{ status: ValidationStatus; activeIssues: number }> {
    const result = await this.validateTrip(tripId, userId);
    return {
      status: result.status,
      activeIssues: result.activeIssues,
    };
  }

  // ===========================================================================
  // SCHEDULE CHECKS
  // ===========================================================================

  private checkTimelineConflicts(trip: TripWithRelations, dismissedSet: Set<string>): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    type ActivityRecord = { id: number; name: string; startTime: Date | null; endTime: Date | null; allDay: boolean };
    // Check for overlapping activities
    const timedActivities = (trip.activities as ActivityRecord[])
      .filter((a: ActivityRecord) => a.startTime && a.endTime && !a.allDay)
      .sort((a: ActivityRecord, b: ActivityRecord) => new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime());

    for (let i = 0; i < timedActivities.length - 1; i++) {
      const current = timedActivities[i];
      const next = timedActivities[i + 1];

      if (new Date(current.endTime!) > new Date(next.startTime!)) {
        // Use sorted IDs for consistent key
        const sortedIds = [current.id, next.id].sort((a, b) => a - b);
        const issueKey = `${sortedIds[0]}:${sortedIds[1]}`;
        const issueId = this.generateIssueId('timeline_conflict', issueKey);

        issues.push({
          id: issueId,
          category: 'SCHEDULE',
          type: 'timeline_conflict',
          message: `"${current.name}" and "${next.name}" overlap`,
          affectedItems: [current.id, next.id],
          suggestion: 'Adjust activity times to prevent overlap',
          isDismissed: dismissedSet.has(issueId),
          quickAction: {
            type: 'view_conflict',
            label: 'View Activities',
            data: { activityIds: [current.id, next.id] },
          },
        });
      }
    }

    return issues;
  }

  private checkInvalidDates(trip: TripWithRelations, dismissedSet: Set<string>): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!trip.startDate || !trip.endDate) {
      return issues;
    }

    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);

    // Check activities outside trip dates
    type ActivityRecord = { id: number; name: string; startTime: Date | null };
    (trip.activities as ActivityRecord[]).forEach((activity: ActivityRecord) => {
      if (activity.startTime) {
        const activityDate = new Date(activity.startTime);
        if (activityDate < start || activityDate > end) {
          const issueKey = `activity:${activity.id}`;
          const issueId = this.generateIssueId('invalid_date', issueKey);

          issues.push({
            id: issueId,
            category: 'SCHEDULE',
            type: 'invalid_date',
            message: `"${activity.name}" is outside trip dates`,
            affectedItems: [activity.id],
            suggestion: 'Move activity within trip dates or adjust trip dates',
            isDismissed: dismissedSet.has(issueId),
            quickAction: {
              type: 'edit_activity',
              label: 'Edit Activity',
              data: { activityId: activity.id },
            },
          });
        }
      }
    });

    return issues;
  }

  // ===========================================================================
  // ACCOMMODATIONS CHECKS
  // ===========================================================================

  private checkMissingLodging(trip: TripWithRelations, dismissedSet: Set<string>): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!trip.startDate || !trip.endDate) {
      return issues;
    }

    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const tripDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    // Get all days covered by lodging
    type LodgingRecord = { checkInDate: Date | null; checkOutDate: Date | null };
    const lodgingDays = new Set<string>();
    (trip.lodging as LodgingRecord[]).forEach((lodging: LodgingRecord) => {
      if (lodging.checkInDate && lodging.checkOutDate) {
        const checkIn = new Date(lodging.checkInDate);
        const checkOut = new Date(lodging.checkOutDate);
        const current = new Date(checkIn);
        while (current < checkOut) {
          lodgingDays.add(current.toISOString().split('T')[0]);
          current.setDate(current.getDate() + 1);
        }
      }
    });

    // Check for missing lodging days
    const missingDays: string[] = [];
    const current = new Date(start);
    for (let i = 0; i < tripDays; i++) {
      const dateKey = current.toISOString().split('T')[0];
      if (!lodgingDays.has(dateKey)) {
        missingDays.push(dateKey);
      }
      current.setDate(current.getDate() + 1);
    }

    // Create individual issues for each missing day (allows selective dismissal)
    missingDays.forEach(date => {
      const issueKey = date;
      const issueId = this.generateIssueId('missing_lodging', issueKey);
      const formattedDate = new Date(date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });

      issues.push({
        id: issueId,
        category: 'ACCOMMODATIONS',
        type: 'missing_lodging',
        message: `No lodging for ${formattedDate}`,
        affectedItems: [date],
        suggestion: 'Add accommodation for this night',
        isDismissed: dismissedSet.has(issueId),
        quickAction: {
          type: 'add_lodging',
          label: 'Add Lodging',
          data: { date },
        },
      });
    });

    return issues;
  }

  // ===========================================================================
  // TRANSPORTATION CHECKS
  // ===========================================================================

  private checkMissingTransportation(trip: TripWithRelations, dismissedSet: Set<string>): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // If trip has multiple locations but no transportation
    if (trip.locations.length > 1 && trip.transportation.length === 0) {
      const issueKey = 'no_transportation';
      const issueId = this.generateIssueId('missing_transportation', issueKey);

      issues.push({
        id: issueId,
        category: 'TRANSPORTATION',
        type: 'missing_transportation',
        message: 'Multiple locations but no transportation recorded',
        suggestion: 'Add transportation details between locations',
        isDismissed: dismissedSet.has(issueId),
        quickAction: {
          type: 'add_transportation',
          label: 'Add Transportation',
        },
      });
    }

    return issues;
  }

  // ===========================================================================
  // COMPLETENESS CHECKS
  // ===========================================================================

  private async checkMissingInformation(trip: TripWithRelations, dismissedSet: Set<string>): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    type ActivityRecord = { id: number; startTime: Date | null; allDay: boolean };
    const activities = trip.activities as ActivityRecord[];

    // Activities without locations (now checked via EntityLink system)
    const activityIds = activities.map((a: ActivityRecord) => a.id);
    if (activityIds.length > 0) {
      const activityLocationLinks = await prisma.entityLink.findMany({
        where: {
          tripId: trip.id,
          sourceType: 'ACTIVITY',
          sourceId: { in: activityIds },
          targetType: 'LOCATION',
        },
        select: { sourceId: true },
      });
      const activitiesWithLocation = new Set(activityLocationLinks.map((l: { sourceId: number }) => l.sourceId));
      const activitiesWithoutLocation = activities.filter((a: ActivityRecord) => !activitiesWithLocation.has(a.id));

      if (activitiesWithoutLocation.length > 0) {
        const issueKey = 'activities_without_location';
        const issueId = this.generateIssueId('missing_location', issueKey);

        issues.push({
          id: issueId,
          category: 'COMPLETENESS',
          type: 'missing_location',
          message: `${activitiesWithoutLocation.length} activit${activitiesWithoutLocation.length === 1 ? 'y' : 'ies'} without location`,
          affectedItems: activitiesWithoutLocation.map((a: ActivityRecord) => a.id),
          suggestion: 'Add location information to activities for better organization',
          isDismissed: dismissedSet.has(issueId),
        });
      }
    }

    // Activities without times
    const activitiesWithoutTime = activities.filter((a: ActivityRecord) => !a.startTime && !a.allDay);
    if (activitiesWithoutTime.length > 0) {
      const issueKey = 'activities_without_time';
      const issueId = this.generateIssueId('missing_time', issueKey);

      issues.push({
        id: issueId,
        category: 'COMPLETENESS',
        type: 'missing_time',
        message: `${activitiesWithoutTime.length} activit${activitiesWithoutTime.length === 1 ? 'y' : 'ies'} without scheduled time`,
        affectedItems: activitiesWithoutTime.map((a: ActivityRecord) => a.id),
        suggestion: 'Add start time or mark as all-day for better timeline visibility',
        isDismissed: dismissedSet.has(issueId),
      });
    }

    return issues;
  }

  private checkEmptyDays(trip: TripWithRelations, dismissedSet: Set<string>): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!trip.startDate || !trip.endDate) {
      return issues;
    }

    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);

    // Get all days with activities
    type ActivityRecord = { startTime: Date | null };
    const daysWithActivities = new Set<string>();
    (trip.activities as ActivityRecord[]).forEach((activity: ActivityRecord) => {
      if (activity.startTime) {
        const activityDate = new Date(activity.startTime);
        daysWithActivities.add(activityDate.toISOString().split('T')[0]);
      }
    });

    // Count empty days
    const emptyDays: string[] = [];
    const current = new Date(start);
    while (current <= end) {
      const dateKey = current.toISOString().split('T')[0];
      if (!daysWithActivities.has(dateKey)) {
        emptyDays.push(dateKey);
      }
      current.setDate(current.getDate() + 1);
    }

    if (emptyDays.length > 0) {
      const issueKey = 'empty_days';
      const issueId = this.generateIssueId('empty_days', issueKey);

      issues.push({
        id: issueId,
        category: 'COMPLETENESS',
        type: 'empty_days',
        message: `${emptyDays.length} day${emptyDays.length === 1 ? '' : 's'} without planned activities`,
        affectedItems: emptyDays,
        suggestion: 'Consider adding activities or marking as rest days',
        isDismissed: dismissedSet.has(issueId),
      });
    }

    return issues;
  }

  // ===========================================================================
  // TRAVEL TIME CHECKS
  // ===========================================================================

  private async checkTravelTimeAlerts(trip: TripWithRelations, dismissedSet: Set<string>): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    type TravelActivityRecord = { id: number; name: string; startTime: Date | null; endTime: Date | null };
    const activities = trip.activities as TravelActivityRecord[];

    // Get activities with times, sorted by time
    const activitiesWithTimes = activities
      .filter((a: TravelActivityRecord) => a.startTime && a.endTime)
      .sort((a: TravelActivityRecord, b: TravelActivityRecord) => new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime());

    if (activitiesWithTimes.length < 2) {
      return issues;
    }

    // Get location links for these activities (via EntityLink system)
    const activityIds = activitiesWithTimes.map((a: TravelActivityRecord) => a.id);
    const locationLinks = await prisma.entityLink.findMany({
      where: {
        tripId: trip.id,
        sourceType: 'ACTIVITY',
        sourceId: { in: activityIds },
        targetType: 'LOCATION',
      },
    });

    // Build a map of activity ID -> location ID
    type LinkRecord = { sourceId: number; targetId: number };
    const activityLocationMap = new Map<number, number>();
    (locationLinks as LinkRecord[]).forEach((link: LinkRecord) => {
      activityLocationMap.set(link.sourceId, link.targetId);
    });

    // Filter to only activities that have linked locations
    const activitiesWithLocationIds = activitiesWithTimes.filter((a: TravelActivityRecord) => activityLocationMap.has(a.id));

    if (activitiesWithLocationIds.length < 2) {
      return issues;
    }

    // Fetch the location details
    const locationIds = [...new Set(activitiesWithLocationIds.map((a: TravelActivityRecord) => activityLocationMap.get(a.id)))];
    const locations = await prisma.location.findMany({
      where: { id: { in: locationIds as number[] } },
    });

    // Create a lookup map for locations
    type LocationData = { id: number; latitude: unknown; longitude: unknown };
    type LocationRecord = { id: number; latitude: unknown; longitude: unknown };
    const locationMap = new Map<number, LocationData>();
    for (const loc of locations as LocationRecord[]) {
      locationMap.set(loc.id, { id: loc.id, latitude: loc.latitude, longitude: loc.longitude });
    }

    // Construct activities with location data attached
    const activitiesWithFullLocation = activitiesWithLocationIds
      .map((a: TravelActivityRecord) => {
        const loc = locationMap.get(activityLocationMap.get(a.id)!);
        return {
          id: a.id,
          name: a.name,
          startTime: a.startTime,
          endTime: a.endTime,
          location: loc || null,
        };
      })
      .filter((a): a is ActivityWithLocation => a.location !== null);

    if (activitiesWithFullLocation.length < 2) {
      return issues;
    }

    // Store activity IDs in order for looking up after analysis
    // This handles the case where multiple activities might have the same name
    const orderedActivityIds = activitiesWithFullLocation.map(a => a.id);

    // Analyze travel time between consecutive activities
    // The service expects activities with name, startTime, endTime, and location
    const activitiesForAnalysis = activitiesWithFullLocation.map(a => ({
      name: a.name,
      startTime: a.startTime,
      endTime: a.endTime,
      location: a.location ? {
        latitude: a.location.latitude as number | string | null,
        longitude: a.location.longitude as number | string | null,
      } : null,
    }));
    const alerts = travelTimeService.analyzeActivityTransitions(activitiesForAnalysis);

    // Convert alerts to validation issues
    // Alerts come back in order - alert[j] is for transition from activity[j] to activity[j+1]
    alerts.forEach((alert, alertIndex) => {
      // Use index-based lookup for reliability (handles duplicate activity names)
      const fromId = orderedActivityIds[alertIndex] || 0;
      const toId = orderedActivityIds[alertIndex + 1] || 0;
      const sortedIds = [fromId, toId].sort((a, b) => a - b);
      const issueKey = `${sortedIds[0]}:${sortedIds[1]}`;
      const issueId = this.generateIssueId('travel_time', issueKey);

      issues.push({
        id: issueId,
        category: 'SCHEDULE',
        type: 'travel_time',
        message: alert.message,
        affectedItems: [fromId, toId],
        suggestion:
          alert.type === 'impossible'
            ? `Allow ${alert.requiredMinutes} minutes for travel or adjust activity times`
            : `Consider adding ${30 - alert.bufferMinutes} more minutes buffer`,
        isDismissed: dismissedSet.has(issueId),
        quickAction: {
          type: 'view_conflict',
          label: 'View Activities',
          data: { activityIds: [fromId, toId] },
        },
      });
    });

    return issues;
  }
}

export default new TripValidatorService();
