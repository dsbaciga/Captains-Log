export interface Tag {
  id: number;
  name: string;
  color?: string;
  textColor?: string;
  userId: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    // Backend returns the tag-assignment count (tag.service.ts `_count: { assignments }`)
    assignments: number;
  };
}

export interface TripTag {
  id: number;
  name: string;
  color?: string;
  textColor?: string;
}

export interface CreateTagInput {
  name: string;
  color?: string;
  textColor?: string;
}

export interface UpdateTagInput {
  name?: string;
  color?: string;
  textColor?: string;
}
