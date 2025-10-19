export const TripStatus = {
  DREAM: 'Dream',
  PLANNING: 'Planning',
  PLANNED: 'Planned',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
} as const;

export const PrivacyLevel = {
  PRIVATE: 'Private',
  SHARED: 'Shared',
  PUBLIC: 'Public',
} as const;

export type TripStatusType = typeof TripStatus[keyof typeof TripStatus];
export type PrivacyLevelType = typeof PrivacyLevel[keyof typeof PrivacyLevel];

export type Trip = {
  id: number;
  userId: number;
  title: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  timezone: string | null;
  status: TripStatusType;
  privacyLevel: PrivacyLevelType;
  addToPlacesVisited: boolean;
  coverPhotoId: number | null;
  bannerPhotoId: number | null;
  createdAt: string;
  updatedAt: string;
  coverPhoto?: {
    id: number;
    localPath: string | null;
    thumbnailPath: string | null;
    source: string;
    immichAssetId: string | null;
  } | null;
};

export type CreateTripInput = {
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  timezone?: string;
  status?: TripStatusType;
  privacyLevel?: PrivacyLevelType;
  addToPlacesVisited?: boolean;
};

export type UpdateTripInput = Partial<CreateTripInput>;

export type TripListResponse = {
  trips: Trip[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
