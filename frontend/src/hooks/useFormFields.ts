import { useState, useCallback } from 'react';

/**
 * Generic hook for managing form field state
 * Eliminates the need for multiple useState calls
 *
 * @example
 * const { values, setField, resetFields, setAllFields } = useFormFields({
 *   name: '',
 *   email: '',
 *   age: 0
 * });
 *
 * <input value={values.name} onChange={(e) => setField('name', e.target.value)} />
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useFormFields<T extends Record<string, any>>(initialValues: T) {
  const [values, setValues] = useState<T>(initialValues);

  const setField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValues(prev => ({ ...prev, [field]: value }));
  }, []);

  const resetFields = useCallback(() => {
    setValues(initialValues);
  }, [initialValues]);

  const setAllFields = useCallback((newValues: Partial<T>) => {
    setValues(prev => ({ ...prev, ...newValues }));
  }, []);

  return {
    values,
    handleChange: setField,  // Alias for compatibility with components
    setField,
    reset: resetFields,  // Alias for compatibility with components
    resetFields,
    setAllFields,
  };
}
