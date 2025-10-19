export interface Companion {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  userId: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    tripAssignments: number;
  };
}

export interface CreateCompanionInput {
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
}

export interface UpdateCompanionInput {
  name?: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
}
