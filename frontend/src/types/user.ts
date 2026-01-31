export interface ActivityCategory {
  name: string;
  emoji: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  avatarUrl: string | null;
  timezone?: string;
  activityCategories: ActivityCategory[];
  dietaryPreferences: string[];
  useCustomMapStyle: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserSettingsInput {
  activityCategories?: ActivityCategory[];
  timezone?: string;
  dietaryPreferences?: string[];
  useCustomMapStyle?: boolean;
}
