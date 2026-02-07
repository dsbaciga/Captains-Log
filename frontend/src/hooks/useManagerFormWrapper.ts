import { useCallback } from 'react';

interface ManagerFormControls {
  showForm: boolean;
  toggleForm: () => void;
  closeForm: () => void;
}

/**
 * Creates a boolean setter-style wrapper around useManagerCRUD's form controls.
 *
 * Multiple Manager components duplicate this exact pattern to bridge
 * useManagerCRUD's imperative form controls (toggleForm/closeForm) with
 * useFormReset's `setShowForm(show: boolean)` interface.
 *
 * Pattern eliminated (duplicated in ActivityManager, LodgingManager,
 * TransportationManager, JournalManager):
 *
 * ```typescript
 * const setShowForm = useCallback((show: boolean) => {
 *   if (show) {
 *     if (!manager.showForm) manager.toggleForm();
 *   } else {
 *     manager.closeForm();
 *   }
 * }, [manager]);
 * ```
 *
 * @param manager - Object with showForm state, toggleForm, and closeForm from useManagerCRUD
 * @returns A stable `setShowForm(show: boolean)` callback
 *
 * @example
 * ```typescript
 * const manager = useManagerCRUD(service, tripId, options);
 * const setShowForm = useManagerFormWrapper(manager);
 *
 * // Pass to useFormReset
 * const { resetForm, openCreateForm } = useFormReset({
 *   initialState,
 *   setFormData,
 *   setEditingId: manager.setEditingId,
 *   setShowForm,
 * });
 * ```
 */
export function useManagerFormWrapper(manager: ManagerFormControls): (show: boolean) => void {
  const { showForm, toggleForm, closeForm } = manager;
  return useCallback((show: boolean) => {
    if (show) {
      if (!showForm) toggleForm();
    } else {
      closeForm();
    }
  }, [showForm, toggleForm, closeForm]);
}

export default useManagerFormWrapper;
