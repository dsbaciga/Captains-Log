import { z } from 'zod';

export const globalSearchQuerySchema = z.object({
    q: z.string().min(1),
    type: z.enum(['all', 'trip', 'location', 'photo', 'journal']).default('all'),
    limit: z.string().optional().default('20'),
});

export type GlobalSearchQuery = z.infer<typeof globalSearchQuerySchema>;

export interface SearchResult {
    id: number;
    type: 'trip' | 'location' | 'photo' | 'journal';
    title: string;
    subtitle?: string;
    url: string;
    thumbnail?: string;
    date?: string;
}

export interface GlobalSearchResponse {
    results: SearchResult[];
    total: number;
}

