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

// User search result for travel partner selection
export interface UserSearchResult {
  id: number;
  username: string;
  email: string;
  avatarUrl: string | null;
}

// Travel partner settings
export interface TravelPartnerSettings {
  travelPartnerId: number | null;
  defaultPartnerPermission: 'view' | 'edit' | 'admin';
  travelPartner: UserSearchResult | null;
}

export interface UpdateTravelPartnerInput {
  travelPartnerId?: number | null;
  defaultPartnerPermission?: 'view' | 'edit' | 'admin';
}
