import { useState, useCallback, useRef } from 'react';

/**
 * Hook for managing bulk selection state and operations.
 * Provides selection mode toggling, individual item selection with shift-click
 * range selection, select all/deselect all, and selection state management.
 *
 * @template T - Entity type with an `id` field
 *
 * @example
 * ```tsx
 * const {
 *   selectionMode,
 *   selectedIds,
 *   toggleSelectionMode,
 *   toggleItemSelection,
 *   selectAll,
 *   deselectAll,
 *   isSelected,
 *   selectedCount,
 * } = useBulkSelection<Activity>();
 *
 * // Enable selection mode
 * <button onClick={toggleSelectionMode}>Select</button>
 *
 * // Render items with selection
 * {items.map((item, index) => (
 *   <div
 *     onClick={(e) => selectionMode && toggleItemSelection(item.id, index, e.shiftKey)}
 *     className={isSelected(item.id) ? 'selected' : ''}
 *   >
 *     {item.name}
 *   </div>
 * ))}
 *
 * // Action bar
 * {selectionMode && selectedCount > 0 && (
 *   <BulkActionBar
 *     selectedCount={selectedCount}
 *     onSelectAll={() => selectAll(items)}
 *     onDeselectAll={deselectAll}
 *     onExit={exitSelectionMode}
 *   />
 * )}
 * ```
 */
export function useBulkSelection<T extends { id: number }>() {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const lastSelectedIndex = useRef<number | null>(null);
  const itemsRef = useRef<T[]>([]);

  /**
   * Enable selection mode
   */
  const enterSelectionMode = useCallback(() => {
    setSelectionMode(true);
  }, []);

  /**
   * Disable selection mode and clear all selections
   */
  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
    lastSelectedIndex.current = null;
  }, []);

  /**
   * Toggle selection mode on/off
   */
  const toggleSelectionMode = useCallback(() => {
    if (selectionMode) {
      exitSelectionMode();
    } else {
      enterSelectionMode();
    }
  }, [selectionMode, enterSelectionMode, exitSelectionMode]);

  /**
   * Toggle selection of a single item, with optional shift-click range selection
   * @param itemId - ID of the item to toggle
   * @param index - Index of the item in the list (for range selection)
   * @param shiftKey - Whether shift key is held (enables range selection)
   * @param items - Current items array (needed for range selection)
   */
  const toggleItemSelection = useCallback((
    itemId: number,
    index: number,
    shiftKey: boolean = false,
    items?: T[]
  ) => {
    // Store items for range selection
    if (items) {
      itemsRef.current = items;
    }

    if (shiftKey && lastSelectedIndex.current !== null && itemsRef.current.length > 0) {
      // Range selection
      const newSelection = new Set(selectedIds);
      const start = Math.min(lastSelectedIndex.current, index);
      const end = Math.max(lastSelectedIndex.current, index);

      for (let i = start; i <= end; i++) {
        if (itemsRef.current[i]) {
          newSelection.add(itemsRef.current[i].id);
        }
      }

      setSelectedIds(newSelection);
      lastSelectedIndex.current = index;
    } else {
      // Single toggle
      const newSelection = new Set(selectedIds);
      if (newSelection.has(itemId)) {
        newSelection.delete(itemId);
      } else {
        newSelection.add(itemId);
      }
      setSelectedIds(newSelection);
      lastSelectedIndex.current = index;
    }
  }, [selectedIds]);

  /**
   * Select all items
   * @param items - Array of items to select
   */
  const selectAll = useCallback((items: T[]) => {
    itemsRef.current = items;
    const allIds = new Set(items.map(item => item.id));
    setSelectedIds(allIds);
  }, []);

  /**
   * Deselect all items
   */
  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
    lastSelectedIndex.current = null;
  }, []);

  /**
   * Check if an item is selected
   * @param itemId - ID of the item to check
   */
  const isSelected = useCallback((itemId: number) => {
    return selectedIds.has(itemId);
  }, [selectedIds]);

  /**
   * Get array of selected IDs
   */
  const getSelectedIds = useCallback(() => {
    return Array.from(selectedIds);
  }, [selectedIds]);

  /**
   * Get selected items from a list
   * @param items - Full list of items
   */
  const getSelectedItems = useCallback((items: T[]) => {
    return items.filter(item => selectedIds.has(item.id));
  }, [selectedIds]);

  return {
    // State
    selectionMode,
    selectedIds,
    selectedCount: selectedIds.size,

    // Mode controls
    enterSelectionMode,
    exitSelectionMode,
    toggleSelectionMode,

    // Selection operations
    toggleItemSelection,
    selectAll,
    deselectAll,
    isSelected,

    // Getters
    getSelectedIds,
    getSelectedItems,

    // Setters (for advanced use cases)
    setSelectedIds,
  };
}

export default useBulkSelection;
