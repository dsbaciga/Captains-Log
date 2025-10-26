export interface ChecklistItem {
  id: number;
  checklistId: number;
  name: string;
  description: string | null;
  isChecked: boolean;
  isDefault: boolean;
  sortOrder: number;
  metadata: any;
  checkedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Checklist {
  id: number;
  userId: number;
  name: string;
  description: string | null;
  type: 'custom' | 'airports' | 'countries' | 'cities' | 'us_states';
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  items: ChecklistItem[];
  stats?: {
    total: number;
    checked: number;
    percentage: number;
  };
}

export interface CreateChecklistDTO {
  name: string;
  description?: string | null;
  type: 'custom' | 'airports' | 'countries' | 'cities' | 'us_states';
  isDefault?: boolean;
  sortOrder?: number;
  items?: Array<{
    name: string;
    description?: string | null;
    isDefault?: boolean;
    sortOrder?: number;
    metadata?: any;
  }>;
}

export interface UpdateChecklistDTO {
  name?: string | null;
  description?: string | null;
  type?: 'custom' | 'airports' | 'countries' | 'cities' | 'us_states' | null;
  sortOrder?: number | null;
}

export interface UpdateChecklistItemDTO {
  name?: string | null;
  description?: string | null;
  isChecked?: boolean | null;
  sortOrder?: number | null;
  metadata?: any;
}

export interface AddChecklistItemDTO {
  name: string;
  description?: string | null;
  metadata?: any;
}
