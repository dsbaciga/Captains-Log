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
};

export default activityService;
