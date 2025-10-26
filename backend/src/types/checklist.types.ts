import { z } from 'zod';

// Zod Schemas
export const ChecklistItemSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1).max(500),
  description: z.string().nullable().optional(),
  isChecked: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  sortOrder: z.number().optional(),
  metadata: z.record(z.any()).nullable().optional(),
  checkedAt: z.string().nullable().optional(),
});

export const CreateChecklistSchema = z.object({
  name: z.string().min(1).max(500),
  description: z.string().nullable().optional(),
  type: z.enum(['custom', 'airports', 'countries', 'cities']),
  isDefault: z.boolean().optional(),
  sortOrder: z.number().optional(),
  items: z.array(ChecklistItemSchema).optional(),
});

export const UpdateChecklistSchema = z.object({
  name: z.string().min(1).max(500).nullable().optional(),
  description: z.string().nullable().optional(),
  type: z.enum(['custom', 'airports', 'countries', 'cities']).nullable().optional(),
  sortOrder: z.number().nullable().optional(),
});

export const UpdateChecklistItemSchema = z.object({
  name: z.string().min(1).max(500).nullable().optional(),
  description: z.string().nullable().optional(),
  isChecked: z.boolean().nullable().optional(),
  sortOrder: z.number().nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
});

export const BulkUpdateChecklistItemsSchema = z.object({
  items: z.array(
    z.object({
      id: z.number(),
      isChecked: z.boolean().optional(),
      sortOrder: z.number().optional(),
    })
  ),
});

// TypeScript Types
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;
export type CreateChecklist = z.infer<typeof CreateChecklistSchema>;
export type UpdateChecklist = z.infer<typeof UpdateChecklistSchema>;
export type UpdateChecklistItem = z.infer<typeof UpdateChecklistItemSchema>;
export type BulkUpdateChecklistItems = z.infer<typeof BulkUpdateChecklistItemsSchema>;

export interface ChecklistWithItems {
  id: number;
  userId: number;
  name: string;
  description: string | null;
  type: string;
  isDefault: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: number;
    checklistId: number;
    name: string;
    description: string | null;
    isChecked: boolean;
    isDefault: boolean;
    sortOrder: number;
    metadata: any;
    checkedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  stats?: {
    total: number;
    checked: number;
    percentage: number;
  };
}
