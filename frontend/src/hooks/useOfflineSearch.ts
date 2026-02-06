/**
 * useOfflineSearch Hook
 *
 * Provides a unified search interface that automatically switches between
 * online (API) and offline (IndexedDB) search based on network status.
 *
 * Features:
 * - Automatic online/offline detection
 * - Debounced search to prevent excessive queries
 * - Search result caching
 * - Loading and error states
 * - Configurable search options
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import offlineSearchService, { type SearchOptions } from '../services/offlineSearch.service';
import searchService, { type SearchResult as OnlineSearchResult } from '../services/search.service';
import {
  type SearchResultItem,
  type GroupedSearchResults,
} from '../lib/searchIndex';

// ============================================
// TYPES
// ============================================

/**
 * Unified search result that works for both online and offline modes.
 */
export interface UnifiedSearchResult {
  /** Unique identifier for the result */
  id: string;
  /** Type of entity */
  type: 'trip' | 'location' | 'photo' | 'journal' | 'activity' | 'transportation' | 'lodging';
  /** Display title */
  title: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** URL to navigate to */
  url: string;
  /** Optional thumbnail URL */
  thumbnail?: string;
  /** Optional date string */
  date?: string;
  /** Relevance score (for offline results) */
  score?: number;
  /** Whether this result came from offline search */
  isOfflineResult: boolean;
}

/**
 * State returned by the useOfflineSearch hook.
 */
export interface UseOfflineSearchState {
  /** Current search results */
  results: UnifiedSearchResult[];
  /** Grouped results by entity type */
  groupedResults: GroupedSearchResults | null;
  /** Whether search is in progress */
  isSearching: boolean;
  /** Whether currently using offline search */
  isOfflineMode: boolean;
  /** Error message if search failed */
  error: string | null;
  /** Current search query */
  query: string;
  /** Timestamp of last search */
  lastSearchTime: number | null;
  /** Timestamp when offline index was last updated */
  lastIndexed: number | null;
}

/**
 * Actions returned by the useOfflineSearch hook.
 */
export interface UseOfflineSearchActions {
  /** Perform a search */
  search: (query: string) => Promise<void>;
  /** Clear search results */
  clearResults: () => void;
  /** Rebuild the offline search index */
  rebuildIndex: () => Promise<void>;
  /** Check if offline index needs rebuilding */
  checkIndexHealth: () => Promise<boolean>;
}

/**
 * Options for the useOfflineSearch hook.
 */
export interface UseOfflineSearchOptions {
  /** Debounce delay in milliseconds (default: 300) */
  debounceMs?: number;
  /** Search options for offline search */
  searchOptions?: SearchOptions;
  /** Minimum query length to trigger search (default: 2) */
  minQueryLength?: number;
  /** Whether to prefer offline search even when online (default: false) */
  preferOffline?: boolean;
}

// ============================================
// DEFAULT OPTIONS
// ============================================

const DEFAULT_OPTIONS: Required<UseOfflineSearchOptions> = {
  debounceMs: 300,
  searchOptions: {},
  minQueryLength: 2,
  preferOffline: false,
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Converts online search result to unified format.
 */
function convertOnlineResult(result: OnlineSearchResult): UnifiedSearchResult {
  return {
    id: String(result.id),
    type: result.type,
    title: result.title,
    subtitle: result.subtitle,
    url: result.url,
    thumbnail: result.thumbnail,
    date: result.date,
    isOfflineResult: false,
  };
}

/**
 * Converts offline search result to unified format.
 */
function convertOfflineResult(result: SearchResultItem): UnifiedSearchResult {
  // Map offline entity types to unified types
  const typeMap: Record<string, UnifiedSearchResult['type']> = {
    TRIP: 'trip',
    LOCATION: 'location',
    ACTIVITY: 'activity',
    JOURNAL: 'journal',
    TRANSPORTATION: 'transportation',
    LODGING: 'lodging',
  };

  return {
    id: `${result.entityType}:${result.entityId}`,
    type: typeMap[result.entityType] || 'trip',
    title: result.title,
    subtitle: result.subtitle || result.snippet,
    url: result.url,
    score: result.score,
    isOfflineResult: true,
  };
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

/**
 * Hook for performing searches that automatically switches between
 * online and offline modes based on network status.
 *
 * @param options - Hook configuration options
 * @returns Search state and actions
 *
 * @example
 * ```tsx
 * const {
 *   results,
 *   isSearching,
 *   isOfflineMode,
 *   search,
 *   clearResults
 * } = useOfflineSearch();
 *
 * // Perform search
 * await search('paris hotel');
 *
 * // Display results
 * {results.map(result => (
 *   <div key={result.id}>
 *     {result.title}
 *     {isOfflineMode && <span>Offline result</span>}
 *   </div>
 * ))}
 * ```
 */
export function useOfflineSearch(
  options: UseOfflineSearchOptions = {}
): UseOfflineSearchState & UseOfflineSearchActions {
  const opts = useMemo(() => ({ ...DEFAULT_OPTIONS, ...options }), [options]);

  // Network status
  const { isOnline } = useNetworkStatus();

  // State
  const [results, setResults] = useState<UnifiedSearchResult[]>([]);
  const [groupedResults, setGroupedResults] = useState<GroupedSearchResults | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [lastSearchTime, setLastSearchTime] = useState<number | null>(null);
  const [lastIndexed, setLastIndexed] = useState<number | null>(null);

  // Refs for debouncing
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Determine if we should use offline mode
  const isOfflineMode = !isOnline || opts.preferOffline;

  // Load last indexed time on mount
  useEffect(() => {
    const loadLastIndexed = async () => {
      try {
        const timestamp = await offlineSearchService.getLastRebuild();
        setLastIndexed(timestamp);
      } catch {
        // Ignore errors loading timestamp
      }
    };
    loadLastIndexed();
  }, []);

  /**
   * Performs an online search using the API.
   */
  const performOnlineSearch = useCallback(async (searchQuery: string): Promise<void> => {
    try {
      const response = await searchService.globalSearch(searchQuery);
      const unifiedResults = response.data.results.map(convertOnlineResult);
      setResults(unifiedResults);
      setGroupedResults(null); // Online search doesn't provide grouped results
      setError(null);
    } catch (err) {
      console.error('[useOfflineSearch] Online search failed:', err);

      // Fall back to offline search
      console.log('[useOfflineSearch] Falling back to offline search');
      await performOfflineSearch(searchQuery);
    }
  }, [performOfflineSearch]);

  /**
   * Performs an offline search using IndexedDB.
   */
  const performOfflineSearch = useCallback(async (searchQuery: string): Promise<void> => {
    try {
      const grouped = await offlineSearchService.searchGrouped(searchQuery, opts.searchOptions);
      const flatResults = grouped.groups.flatMap((g) => g.results);
      const unifiedResults = flatResults.map(convertOfflineResult);

      setResults(unifiedResults);
      setGroupedResults(grouped);
      setError(null);
    } catch (err) {
      console.error('[useOfflineSearch] Offline search failed:', err);
      setError('Search failed. Please try again.');
      setResults([]);
      setGroupedResults(null);
    }
  }, [opts.searchOptions]);

  /**
   * Main search function with debouncing.
   */
  const search = useCallback(async (searchQuery: string): Promise<void> => {
    setQuery(searchQuery);

    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Abort previous search
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear results if query is too short
    if (!searchQuery || searchQuery.length < opts.minQueryLength) {
      setResults([]);
      setGroupedResults(null);
      setIsSearching(false);
      setError(null);
      return;
    }

    // Set searching state immediately
    setIsSearching(true);
    setError(null);

    // Debounce the actual search
    debounceTimerRef.current = setTimeout(async () => {
      abortControllerRef.current = new AbortController();

      try {
        if (isOfflineMode) {
          await performOfflineSearch(searchQuery);
        } else {
          await performOnlineSearch(searchQuery);
        }

        setLastSearchTime(Date.now());
      } catch (err) {
        // Only set error if not aborted
        if (err instanceof Error && err.name !== 'AbortError') {
          setError('Search failed. Please try again.');
        }
      } finally {
        setIsSearching(false);
      }
    }, opts.debounceMs);
  }, [isOfflineMode, opts.debounceMs, opts.minQueryLength, performOfflineSearch, performOnlineSearch]);

  /**
   * Clears search results and resets state.
   */
  const clearResults = useCallback((): void => {
    // Cancel any pending search
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setQuery('');
    setResults([]);
    setGroupedResults(null);
    setIsSearching(false);
    setError(null);
  }, []);

  /**
   * Rebuilds the offline search index.
   */
  const rebuildIndex = useCallback(async (): Promise<void> => {
    try {
      await offlineSearchService.rebuildAllIndexes();
      const timestamp = await offlineSearchService.getLastRebuild();
      setLastIndexed(timestamp);
    } catch (err) {
      console.error('[useOfflineSearch] Failed to rebuild index:', err);
      throw err;
    }
  }, []);

  /**
   * Checks if the offline index needs rebuilding.
   */
  const checkIndexHealth = useCallback(async (): Promise<boolean> => {
    try {
      return await offlineSearchService.needsRebuild();
    } catch {
      return true;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    // State
    results,
    groupedResults,
    isSearching,
    isOfflineMode,
    error,
    query,
    lastSearchTime,
    lastIndexed,
    // Actions
    search,
    clearResults,
    rebuildIndex,
    checkIndexHealth,
  };
}

export default useOfflineSearch;
