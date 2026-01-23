import { useCallback } from 'react';

interface UseFormResetOptions<T> {
  initialState: T;
  setFormData: (data: T) => void;
  setEditingId: (id: number | null) => void;
  setShowForm: (show: boolean) => void;
}

/**
 * Hook to handle common form state reset patterns in Manager components.
 * Reduces boilerplate for opening/closing forms and switching between create/edit modes.
 *
 * @example
 * const { resetForm, openCreateForm, openEditForm } = useFormReset({
 *   initialState: { name: '', color: '#3B82F6' },
 *   setFormData,
 *   setEditingId,
 *   setShowForm
 * });
 *
 * // Close form and reset state
 * <button onClick={resetForm}>Cancel</button>
 *
 * // Open form in create mode
 * <button onClick={openCreateForm}>Add New</button>
 *
 * // Open form in edit mode with existing data
 * <button onClick={() => openEditForm(item.id, item)}>Edit</button>
 */
export function useFormReset<T>({
  initialState,
  setFormData,
  setEditingId,
  setShowForm
}: UseFormResetOptions<T>) {
  const resetForm = useCallback(() => {
    setFormData(initialState);
    setEditingId(null);
    setShowForm(false);
  }, [initialState, setFormData, setEditingId, setShowForm]);

  const openCreateForm = useCallback(() => {
    setFormData(initialState);
    setEditingId(null);
    setShowForm(true);
  }, [initialState, setFormData, setEditingId, setShowForm]);

  const openEditForm = useCallback(
    (id: number, data: T) => {
      setFormData(data);
      setEditingId(id);
      setShowForm(true);
    },
    [setFormData, setEditingId, setShowForm]
  );

  return { resetForm, openCreateForm, openEditForm };
}
