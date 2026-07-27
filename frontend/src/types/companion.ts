export interface Companion {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  relationship?: string | null;
  isMyself?: boolean;
  avatarUrl?: string | null;
  dietaryPreferences?: string[];
  /** Free-text medical detail printed on the trip's emergency card. */
  medicalNotes?: string | null;
  /** Allergy tags. Same shape as `dietaryPreferences`, but medical rather than chosen. */
  allergies?: string[];
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
  dietaryPreferences?: string[];
  medicalNotes?: string;
  allergies?: string[];
}

export interface UpdateCompanionInput {
  name?: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  relationship?: string | null;
  dietaryPreferences?: string[];
  medicalNotes?: string | null;
  /** Not nullable: the backing column is a non-nullable Json array, so "none" is `[]`. */
  allergies?: string[];
}
