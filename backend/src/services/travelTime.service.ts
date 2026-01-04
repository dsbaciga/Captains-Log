// Simple travel time estimation service using Haversine distance formula

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface TravelAlert {
  type: 'impossible' | 'tight' | 'comfortable';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  fromActivity: string;
  toActivity: string;
  requiredMinutes: number;
  availableMinutes: number;
  bufferMinutes: number;
}

class TravelTimeService {
  // Calculate distance between two points using Haversine formula
  private calculateDistance(point1: Coordinates, point2: Coordinates): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(point2.latitude - point1.latitude);
    const dLon = this.toRadians(point2.longitude - point1.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.latitude)) *
        Math.cos(this.toRadians(point2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance; // in kilometers
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Estimate travel time based on distance and mode
  estimateTravelTime(
    origin: Coordinates,
    destination: Coordinates,
    transportType?: string
  ): number {
    const distance = this.calculateDistance(origin, destination);

    // Average speeds in km/h based on transport type
    let speed: number;
    switch (transportType?.toLowerCase()) {
      case 'flight':
        // Flight speed ~800 km/h + 3 hours airport time
        return (distance / 800) * 60 + 180; // minutes
      case 'train':
        speed = 100; // km/h
        break;
      case 'car':
      case 'bus':
        speed = 60; // km/h
        break;
      case 'bicycle':
        speed = 15; // km/h
        break;
      case 'walk':
        speed = 5; // km/h
        break;
      default:
        speed = 50; // default assumption
    }

    const timeInHours = distance / speed;
    const timeInMinutes = timeInHours * 60;

    // Add 20% buffer for real-world conditions
    return Math.ceil(timeInMinutes * 1.2);
  }

  // Analyze consecutive activities for travel time feasibility
  analyzeActivityTransitions(activities: any[]): TravelAlert[] {
    const alerts: TravelAlert[] = [];

    for (let i = 0; i < activities.length - 1; i++) {
      const current = activities[i];
      const next = activities[i + 1];

      // Skip if either activity doesn't have time or location
      if (!current.endTime || !next.startTime || !current.location || !next.location) {
        continue;
      }

      // Skip if locations don't have coordinates
      if (
        !current.location.latitude ||
        !current.location.longitude ||
        !next.location.latitude ||
        !next.location.longitude
      ) {
        continue;
      }

      const origin = {
        latitude: Number(current.location.latitude),
        longitude: Number(current.location.longitude),
      };

      const destination = {
        latitude: Number(next.location.latitude),
        longitude: Number(next.location.longitude),
      };

      // Estimate required travel time
      const requiredMinutes = this.estimateTravelTime(origin, destination);

      // Calculate available time between activities
      const currentEnd = new Date(current.endTime);
      const nextStart = new Date(next.startTime);
      const availableMinutes = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60);

      const bufferMinutes = availableMinutes - requiredMinutes;

      // Generate alerts based on buffer time
      if (bufferMinutes < 0) {
        alerts.push({
          type: 'impossible',
          severity: 'critical',
          message: `Impossible connection: Need ${requiredMinutes} minutes but only have ${Math.round(availableMinutes)} minutes`,
          fromActivity: current.name,
          toActivity: next.name,
          requiredMinutes: Math.round(requiredMinutes),
          availableMinutes: Math.round(availableMinutes),
          bufferMinutes: Math.round(bufferMinutes),
        });
      } else if (bufferMinutes < 30) {
        alerts.push({
          type: 'tight',
          severity: 'warning',
          message: `Tight connection: Only ${Math.round(bufferMinutes)} minutes buffer`,
          fromActivity: current.name,
          toActivity: next.name,
          requiredMinutes: Math.round(requiredMinutes),
          availableMinutes: Math.round(availableMinutes),
          bufferMinutes: Math.round(bufferMinutes),
        });
      }
    }

    return alerts;
  }
}

export default new TravelTimeService();
