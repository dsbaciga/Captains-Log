import axios from '../lib/axios';
import type {
  Activity,
  CreateActivityInput,
  UpdateActivityInput,
} from '../types/activity';

export const activityService = {
  async createActivity(data: CreateActivityInput): Promise<Activity> {
    const response = await axios.post('/activities', data);
    return response.data;
  },

  async getActivitiesByTrip(tripId: number): Promise<Activity[]> {
    const response = await axios.get(`/activities/trip/${tripId}`);
    return response.data;
  },

  async getActivityById(activityId: number): Promise<Activity> {
    const response = await axios.get(`/activities/${activityId}`);
    return response.data;
  },

  async updateActivity(
    activityId: number,
    data: UpdateActivityInput
  ): Promise<Activity> {
    const response = await axios.put(`/activities/${activityId}`, data);
    return response.data;
  },

  async deleteActivity(activityId: number): Promise<void> {
    await axios.delete(`/activities/${activityId}`);
  },

  async bulkDeleteActivities(tripId: number, ids: number[]): Promise<{ success: boolean; deletedCount: number }> {
    const response = await axios.delete(`/activities/trip/${tripId}/bulk`, { data: { ids } });
    return response.data;
  },

  async bulkUpdateActivities(
    tripId: number,
    ids: number[],
    updates: { category?: string; notes?: string; timezone?: string }
  ): Promise<{ success: boolean; updatedCount: number }> {
    const response = await axios.patch(`/activities/trip/${tripId}/bulk`, { ids, updates });
    return response.data;
  },
};

export default activityService;
