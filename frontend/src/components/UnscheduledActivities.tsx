import { useState, useEffect } from 'react';
import type { Activity } from '../types/activity';
import type { Location } from '../types/location';
import type { ActivityCategory } from '../types/user';
import activityService from '../services/activity.service';
import userService from '../services/user.service';
import toast from 'react-hot-toast';

interface UnscheduledActivitiesProps {
  tripId: number;
  locations: Location[];
}

export default function UnscheduledActivities({ tripId, locations }: UnscheduledActivitiesProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityCategories, setActivityCategories] = useState<ActivityCategory[]>([]);

  useEffect(() => {
    loadActivities();
    loadUserCategories();
  }, [tripId]);

  const loadUserCategories = async () => {
    try {
      const user = await userService.getMe();
      setActivityCategories(user.activityCategories || []);
    } catch (error) {
      console.error('Failed to load activity categories');
    }
  };

  const loadActivities = async () => {
    try {
      const data = await activityService.getActivitiesByTrip(tripId);
      // Filter for unscheduled activities (no start time and not all day)
      const unscheduled = data.filter(a => !a.startTime && !a.allDay);
      setActivities(unscheduled);
    } catch (error) {
      toast.error('Failed to load activities');
    }
  };

  const formatDate = (dateTime: string | null) => {
    if (!dateTime) return '';
    return new Date(dateTime).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (activities.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        No unscheduled activities. Unscheduled activities are those with dates but no specific times.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow border-l-4 border-gray-300 dark:border-gray-600"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {activity.name}
                </h3>
                {activity.category && (() => {
                  const categoryObj = activityCategories.find(
                    c => c.name.toLowerCase() === activity.category?.toLowerCase()
                  );
                  return (
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 text-xs rounded-full capitalize">
                      {categoryObj?.emoji} {activity.category}
                    </span>
                  );
                })()}
              </div>

              {activity.location && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  📍 {activity.location.name}
                </p>
              )}

              {/* Show dates if they exist */}
              {(activity.startTime || activity.endTime) && (
                <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  {activity.startTime && (
                    <div>
                      <strong>Start Date:</strong> {formatDate(activity.startTime)}
                    </div>
                  )}
                  {activity.endTime && (
                    <div>
                      <strong>End Date:</strong> {formatDate(activity.endTime)}
                    </div>
                  )}
                </div>
              )}

              {activity.description && (
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  {activity.description}
                </p>
              )}

              <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400 mt-2">
                {activity.cost !== null && (
                  <span>
                    Cost: {activity.currency} {activity.cost.toFixed(2)}
                  </span>
                )}
                {activity.bookingReference && (
                  <span>Ref: {activity.bookingReference}</span>
                )}
              </div>

              {activity.bookingUrl && (
                <div className="mt-2">
                  <a
                    href={activity.bookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    View Booking →
                  </a>
                </div>
              )}

              {activity.notes && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
                  {activity.notes}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
