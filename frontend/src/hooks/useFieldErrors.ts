import { useState, useCallback } from 'react';

type ValidatorFn = (value: string) => string | null;

interface FieldConfig {
  validate: ValidatorFn;
}

type FieldConfigs<T extends string> = Partial<Record<T, FieldConfig>>;

interface FieldErrorsResult<T extends string> {
  /** Current error messages per field (null = no error) */
  errors: Record<T, string | null>;
  /** Whether a field has been interacted with (touched) */
  touched: Record<T, boolean>;
  /** Call on input onBlur to validate that field */
  handleBlur: (field: T, value: string) => void;
  /** Validate all fields at once; returns true if all pass */
  validateAll: (values: Record<T, string>) => boolean;
  /** Reset all errors and touched state */
  resetErrors: () => void;
  /** Returns className additions for an input — adds red border when error */
  inputErrorClass: (field: T) => string;
}

const emptyRecord = <T extends string>(fields: T[]): Record<T, null> =>
  Object.fromEntries(fields.map((f) => [f, null])) as Record<T, null>;

const falseRecord = <T extends string>(fields: T[]): Record<T, boolean> =>
  Object.fromEntries(fields.map((f) => [f, false])) as Record<T, boolean>;

/**
 * Lightweight field-level validation hook.
 *
 * Usage:
 * ```tsx
 * const { errors, handleBlur, validateAll, inputErrorClass } = useFieldErrors({
 *   name: { validate: (v) => v.trim() ? null : 'Name is required' },
 *   email: { validate: (v) => v.includes('@') ? null : 'Invalid email' },
 * });
 *
 * <input onBlur={(e) => handleBlur('name', e.target.value)} className={`input ${inputErrorClass('name')}`} />
 * {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
 * ```
 */
export function useFieldErrors<T extends string>(
  configs: FieldConfigs<T>
): FieldErrorsResult<T> {
  const fields = Object.keys(configs) as T[];

  const [errors, setErrors] = useState<Record<T, string | null>>(
    emptyRecord(fields) as Record<T, string | null>
  );
  const [touched, setTouched] = useState<Record<T, boolean>>(
    falseRecord(fields)
  );

  const handleBlur = useCallback(
    (field: T, value: string) => {
      const config = configs[field];
      if (!config) return;

      const error = config.validate(value);
      setTouched((prev) => ({ ...prev, [field]: true }));
      setErrors((prev) => ({ ...prev, [field]: error }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const validateAll = useCallback(
    (values: Record<T, string>): boolean => {
      const newErrors = { ...errors };
      const newTouched = { ...touched };
      let allValid = true;

      for (const field of fields) {
        const config = configs[field];
        if (!config) continue;
        const error = config.validate(values[field] ?? '');
        newErrors[field] = error;
        newTouched[field] = true;
        if (error) allValid = false;
      }

      setErrors(newErrors);
      setTouched(newTouched);
      return allValid;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const resetErrors = useCallback(() => {
    setErrors(emptyRecord(fields) as Record<T, string | null>);
    setTouched(falseRecord(fields));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inputErrorClass = useCallback(
    (field: T): string => {
      if (touched[field] && errors[field]) {
        return 'border-red-500 dark:border-red-400 focus:ring-red-500 dark:focus:ring-red-400';
      }
      return '';
    },
    [errors, touched]
  );

  return { errors, touched, handleBlur, validateAll, resetErrors, inputErrorClass };
}
