import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Hook to handle URL-based edit navigation for Manager components.
 *
 * This hook eliminates duplicated URL parameter handling across Manager components.
 * It watches for an edit parameter in the URL (e.g., ?edit=123), finds the matching
 * item, triggers the edit callback, and cleans up the URL.
 *
 * Common use case: Navigating from EntityDetailModal to the Manager's edit form
 * by appending ?edit={id} to the URL.
 *
 * @template T - The entity type (must have an id property of type number)
 *
 * @param items - Array of items to search through (typically from useManagerCRUD)
 * @param onEdit - Callback function to handle editing the found item
 * @param options - Configuration options
 * @param options.paramName - URL parameter name to look for (default: 'edit')
 * @param options.loading - Whether items are still loading (prevents premature lookup)
 *
 * @returns Object containing:
 *   - pendingEditId: The ID waiting to be edited (null if none)
 *   - clearPendingEdit: Function to manually clear the pending edit
 *
 * @example
 * ```typescript
 * // Basic usage
 * const manager = useManagerCRUD(service, tripId, { itemName: 'location' });
 *
 * useEditFromUrlParam(manager.items, handleEdit, {
 *   loading: manager.loading,
 * });
 *
 * // With custom parameter name
 * useEditFromUrlParam(manager.items, handleEdit, {
 *   paramName: 'editLocation',
 *   loading: manager.loading,
 * });
 * ```
 */
export function useEditFromUrlParam<T extends { id: number }>(
  items: T[],
  onEdit: (item: T) => void,
  options: {
    paramName?: string;
    loading?: boolean;
  } = {}
): {
  pendingEditId: number | null;
  clearPendingEdit: () => void;
} {
  const { paramName = 'edit', loading = false } = options;

  const [searchParams, setSearchParams] = useSearchParams();
  const [pendingEditId, setPendingEditId] = useState<number | null>(null);

  // Effect 1: Extract edit ID from URL and clear the parameter immediately
  // This prevents the URL from staying dirty if the user navigates away
  useEffect(() => {
    const editId = searchParams.get(paramName);
    if (editId) {
      const itemId = parseInt(editId, 10);
      if (!isNaN(itemId)) {
        // Clear the URL param immediately to keep URL clean
        const newParams = new URLSearchParams(searchParams);
        newParams.delete(paramName);
        setSearchParams(newParams, { replace: true });

        // Set pending edit ID to be processed when items are loaded
        setPendingEditId(itemId);
      }
    }
  }, [searchParams, setSearchParams, paramName]);

  // Effect 2: Process pending edit when items are loaded
  // This handles the case where items aren't loaded yet when the URL param is detected
  useEffect(() => {
    if (pendingEditId !== null && items.length > 0 && !loading) {
      const item = items.find((i) => i.id === pendingEditId);
      if (item) {
        onEdit(item);
      }
      // Clear pending ID regardless of whether item was found
      // (item may have been deleted)
      setPendingEditId(null);
    }
  }, [pendingEditId, items, loading, onEdit]);

  const clearPendingEdit = () => {
    setPendingEditId(null);
  };

  return {
    pendingEditId,
    clearPendingEdit,
  };
}
