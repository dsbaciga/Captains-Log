import axios from '../lib/axios';

export interface CalendarTokenInfo {
  token: string | null;
  /** Server-relative feed path, e.g. /api/calendar/<token>.ics */
  feedPath: string | null;
}

class CalendarFeedService {
  /** Get the current calendar feed token (token/feedPath are null when disabled) */
  async getToken(): Promise<CalendarTokenInfo> {
    const response = await axios.get<CalendarTokenInfo>('/users/me/calendar-token');
    return response.data;
  }

  /** Generate a new feed token, rotating (invalidating) any existing one */
  async rotateToken(): Promise<CalendarTokenInfo> {
    const response = await axios.post<CalendarTokenInfo>('/users/me/calendar-token');
    return response.data;
  }

  /** Revoke the feed token, disabling the feed URL */
  async revokeToken(): Promise<void> {
    await axios.delete('/users/me/calendar-token');
  }
}

export default new CalendarFeedService();
