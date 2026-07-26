/**
 * Trip permission levels: the vocabulary, its ordering, and validation of
 * untrusted values (database columns, request payloads) into that vocabulary.
 */

/**
 * Permission levels for trip access
 */
export type TripPermissionLevel = 'view' | 'edit' | 'admin';

/**
 * Valid permission level values
 */
const VALID_PERMISSION_LEVELS: readonly TripPermissionLevel[] = ['view', 'edit', 'admin'] as const;

/**
 * Type guard to check if a value is a valid permission level
 */
export function isValidPermissionLevel(value: unknown): value is TripPermissionLevel {
  // `.some` rather than `.includes`: comparing element-by-element needs no cast,
  // whereas `includes` would require asserting the candidate into the union first.
  return typeof value === 'string' && VALID_PERMISSION_LEVELS.some((level) => level === value);
}

/**
 * Validates and returns a safe permission level.
 * If the value is invalid or missing, returns the default permission level.
 *
 * @param value - The permission level value to validate (from database or user input)
 * @param defaultLevel - The default permission level to use if invalid (default: 'edit')
 * @returns A valid TripPermissionLevel
 *
 * @example
 * ```typescript
 * // Returns 'admin' (valid)
 * toSafePermissionLevel('admin')
 *
 * // Returns 'edit' (default for invalid/missing values)
 * toSafePermissionLevel(null)
 * toSafePermissionLevel('invalid')
 * toSafePermissionLevel(undefined)
 *
 * // Returns 'view' (custom default)
 * toSafePermissionLevel(null, 'view')
 * ```
 */
export function toSafePermissionLevel(
  value: string | null | undefined,
  defaultLevel: TripPermissionLevel = 'edit'
): TripPermissionLevel {
  if (isValidPermissionLevel(value)) {
    return value;
  }
  return defaultLevel;
}

/**
 * Permission hierarchy - higher number = more permissions
 */
export const PERMISSION_HIERARCHY: Record<TripPermissionLevel, number> = {
  view: 1,
  edit: 2,
  admin: 3,
};
