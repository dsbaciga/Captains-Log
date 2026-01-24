import prisma from '../config/database';
import travelTimeService from './travelTime.service';
import { TripWithRelations } from '../types/prisma-helpers';
import { Activity, Location, Lodging } from '@prisma/client';

export interface ValidationIssue {
  severity: 'critical' | 'warning' | 'info';
  type: string;
  message: string;
  affectedItems?: (string | number)[];
  suggestion?: string;
}

/** Activity with location attached for travel time analysis */
interface ActivityWithLocation extends Activity {
  location: Location | null;
}

export interface ValidationResult {
  tripId: number;
  isValid: boolean;
  issues: ValidationIssue[];
  score: number; // 0-100 health score
}

class TripValidatorService {
  async validateTrip(tripId: number): Promise<ValidationResult> {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        activities: true,
        lodging: true,
        transportation: true,
        locations: true,
        journalEntries: true,
      },
    });

    if (!trip) {
      throw new Error('Trip not found');
    }

    const issues: ValidationIssue[] = [];

    // Run all validation checks
    issues.push(...this.checkMissingLodging(trip));
    issues.push(...this.checkMissingTransportation(trip));
    issues.push(...this.checkTimelineConflicts(trip));
    issues.push(...this.checkInvalidDates(trip));
    issues.push(...await this.checkMissingInformation(trip));
    issues.push(...this.checkEmptyDays(trip));
    issues.push(...await this.checkTravelTimeAlerts(trip));

    // Calculate health score
    const score = this.calculateHealthScore(issues);
    const isValid = issues.filter(i => i.severity === 'critical').length === 0;

    return {
      tripId,
      isValid,
      issues,
      score,
    };
  }

  private checkMissingLodging(trip: TripWithRelations): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!trip.startDate || !trip.endDate) {
      return issues;
    }

    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const tripDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    // Get all days covered by lodging
    const lodgingDays = new Set<string>();
    trip.lodging.forEach((lodging: Lodging) => {
      if (lodging.checkInDate && lodging.checkOutDate) {
        const checkIn = new Date(lodging.checkInDate);
        const checkOut = new Date(lodging.checkOutDate);
        let current = new Date(checkIn);
        while (current < checkOut) {
          lodgingDays.add(current.toDateString());
          current.setDate(current.getDate() + 1);
        }
      }
    });

    // Check for missing lodging days
    const missingDays: string[] = [];
    let current = new Date(start);
    for (let i = 0; i < tripDays; i++) {
      if (!lodgingDays.has(current.toDateString())) {
        missingDays.push(current.toDateString());
      }
      current.setDate(current.getDate() + 1);
    }

    if (missingDays.length > 0) {
      issues.push({
        severity: 'warning',
        type: 'missing_lodging',
        message: `${missingDays.length} day(s) without lodging`,
        affectedItems: missingDays,
        suggestion: 'Add lodging for all days in your trip',
      });
    }

    return issues;
  }

  private checkMissingTransportation(trip: TripWithRelations): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // If trip has multiple locations but no transportation
    if (trip.locations.length > 1 && trip.transportation.length === 0) {
      issues.push({
        severity: 'warning',
        type: 'missing_transportation',
        message: 'Multiple locations but no transportation recorded',
        suggestion: 'Add transportation details between locations',
      });
    }

    return issues;
  }

  private checkTimelineConflicts(trip: TripWithRelations): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check for overlapping activities
    const timedActivities = trip.activities
      .filter((a) => a.startTime && a.endTime && !a.allDay)
      .sort((a, b) => new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime());

    for (let i = 0; i < timedActivities.length - 1; i++) {
      const current = timedActivities[i];
      const next = timedActivities[i + 1];

      if (new Date(current.endTime) > new Date(next.startTime)) {
        issues.push({
          severity: 'warning',
          type: 'timeline_conflict',
          message: `Activities "${current.name}" and "${next.name}" overlap`,
          affectedItems: [current.id, next.id],
          suggestion: 'Adjust activity times to prevent overlap',
        });
      }
    }

    return issues;
  }

  private checkInvalidDates(trip: TripWithRelations): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!trip.startDate || !trip.endDate) {
      return issues;
    }

    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);

    // Check activities outside trip dates
    trip.activities.forEach((activity) => {
      if (activity.startTime) {
        const activityDate = new Date(activity.startTime);
        if (activityDate < start || activityDate > end) {
          issues.push({
            severity: 'critical',
            type: 'invalid_date',
            message: `Activity "${activity.name}" is outside trip dates`,
            affectedItems: [activity.id],
            suggestion: 'Move activity within trip dates or adjust trip dates',
          });
        }
      }
    });

    return issues;
  }

  private async checkMissingInformation(trip: TripWithRelations): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    // Activities without locations (now checked via EntityLink system)
    const activityIds = trip.activities.map((a) => a.id);
    const activityLocationLinks = await prisma.entityLink.findMany({
      where: {
        tripId: trip.id,
        sourceType: 'ACTIVITY',
        sourceId: { in: activityIds },
        targetType: 'LOCATION',
      },
      select: { sourceId: true },
    });
    const activitiesWithLocation = new Set(activityLocationLinks.map(l => l.sourceId));
    const activitiesWithoutLocation = trip.activities.filter((a) => !activitiesWithLocation.has(a.id));
    if (activitiesWithoutLocation.length > 0) {
      issues.push({
        severity: 'info',
        type: 'missing_info',
        message: `${activitiesWithoutLocation.length} activities without location`,
        suggestion: 'Add location information to activities',
      });
    }

    // Activities without times
    const activitiesWithoutTime = trip.activities.filter((a) => !a.startTime && !a.allDay);
    if (activitiesWithoutTime.length > 0) {
      issues.push({
        severity: 'info',
        type: 'missing_info',
        message: `${activitiesWithoutTime.length} activities without time`,
        suggestion: 'Add start time or mark as all-day',
      });
    }

    return issues;
  }

  private checkEmptyDays(trip: TripWithRelations): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!trip.startDate || !trip.endDate) {
      return issues;
    }

    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);

    // Get all days with activities
    const daysWithActivities = new Set<string>();
    trip.activities.forEach((activity) => {
      if (activity.startTime) {
        const activityDate = new Date(activity.startTime);
        daysWithActivities.add(activityDate.toDateString());
      }
    });

    // Count empty days
    let emptyDays = 0;
    let current = new Date(start);
    while (current <= end) {
      if (!daysWithActivities.has(current.toDateString())) {
        emptyDays++;
      }
      current.setDate(current.getDate() + 1);
    }

    if (emptyDays > 0) {
      issues.push({
        severity: 'info',
        type: 'empty_days',
        message: `${emptyDays} day(s) without planned activities`,
        suggestion: 'Consider adding activities for free days',
      });
    }

    return issues;
  }

  private calculateHealthScore(issues: ValidationIssue[]): number {
    let score = 100;

    issues.forEach((issue) => {
      switch (issue.severity) {
        case 'critical':
          score -= 20;
          break;
        case 'warning':
          score -= 10;
          break;
        case 'info':
          score -= 5;
          break;
      }
    });

    return Math.max(0, score);
  }

  private async checkTravelTimeAlerts(trip: TripWithRelations): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    // Get activities with times, sorted by time
    const activitiesWithTimes = trip.activities
      .filter((a) => a.startTime && a.endTime)
      .sort((a, b) => new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime());

    if (activitiesWithTimes.length < 2) {
      return issues; // Need at least 2 activities for travel time analysis
    }

    // Get location links for these activities (via EntityLink system)
    const activityIds = activitiesWithTimes.map((a) => a.id);
    const locationLinks = await prisma.entityLink.findMany({
      where: {
        tripId: trip.id,
        sourceType: 'ACTIVITY',
        sourceId: { in: activityIds },
        targetType: 'LOCATION',
      },
    });

    // Build a map of activity ID -> location ID
    const activityLocationMap = new Map<number, number>();
    locationLinks.forEach(link => {
      activityLocationMap.set(link.sourceId, link.targetId);
    });

    // Filter to only activities that have linked locations
    const activitiesWithLocationIds = activitiesWithTimes.filter((a) => activityLocationMap.has(a.id));

    if (activitiesWithLocationIds.length < 2) {
      return issues; // Need at least 2 activities with locations for travel time analysis
    }

    // Fetch the location details
    const locationIds = [...new Set(activitiesWithLocationIds.map((a) => activityLocationMap.get(a.id)))];
    const locations = await prisma.location.findMany({
      where: { id: { in: locationIds as number[] } },
    });
    const locationMap = new Map(locations.map(l => [l.id, l]));

    // Construct activities with location data attached (for travelTime.service)
    const activitiesWithFullLocation: ActivityWithLocation[] = activitiesWithLocationIds
      .map((a) => ({
        ...a,
        location: locationMap.get(activityLocationMap.get(a.id)!) || null,
      }))
      .filter((a): a is ActivityWithLocation => a.location !== null);

    if (activitiesWithFullLocation.length < 2) {
      return issues;
    }

    // Analyze travel time between consecutive activities
    const alerts = travelTimeService.analyzeActivityTransitions(activitiesWithFullLocation);

    // Convert alerts to validation issues
    alerts.forEach((alert) => {
      issues.push({
        severity: alert.severity,
        type: 'travel_time',
        message: alert.message,
        affectedItems: [alert.fromActivity, alert.toActivity],
        suggestion:
          alert.type === 'impossible'
            ? `Allow ${alert.requiredMinutes} minutes for travel or adjust activity times`
            : `Consider adding ${30 - alert.bufferMinutes} more minutes buffer`,
      });
    });

    return issues;
  }
}

export default new TripValidatorService();
