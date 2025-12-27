export interface Companion {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  relationship?: string | null;
  isMyself?: boolean;
  avatarUrl?: string | null;
  userId: number;
  createdAt: string;
  _count?: {
    tripAssignments: number;
  };
}

export interface CreateCompanionInput {
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  relationship?: string;
}

export interface UpdateCompanionInput {
  name?: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  relationship?: string | null;
}
