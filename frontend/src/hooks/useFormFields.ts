import { useState, useCallback, useRef } from 'react';

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
export function useFormFields<T extends Record<string, unknown>>(initialValues: T) {
  const [values, setValues] = useState<T>(initialValues);
  const initialValuesRef = useRef(initialValues);
  initialValuesRef.current = initialValues;

  const setField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValues(prev => ({ ...prev, [field]: value }));
  }, []);

  const resetFields = useCallback(() => {
    setValues(initialValuesRef.current);
  }, []);

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
