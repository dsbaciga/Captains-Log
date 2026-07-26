/**
 * Building Prisma update payloads from partial input: only fields the caller
 * actually supplied are included, optionally passed through per-field
 * transformers.
 */

/**
 * Enhanced update data builder with conditional field inclusion and transformers
 * Eliminates the pattern: if (data.field !== undefined) updateData.field = data.field
 *
 * This function only includes fields that are explicitly defined (not undefined),
 * allowing partial updates where omitted fields remain unchanged in the database.
 *
 * @template T - The data type (typically a Partial<EntityInput>)
 * @param data - Partial data object with fields to update
 * @param options - Configuration options
 * @param options.emptyStringToNull - Convert empty strings to null (default: true)
 * @param options.transformers - Custom field transformers (e.g., date conversion)
 *
 * @returns Update data object with only defined fields, optionally transformed
 *
 * @example
 * ```typescript
 * // Simple usage (converts empty strings to null)
 * const updateData = buildConditionalUpdateData(data);
 *
 * // With date transformers
 * const updateData = buildConditionalUpdateData(data, {
 *   transformers: {
 *     startDate: tripDateTransformer,
 *     endDate: tripDateTransformer,
 *   }
 * });
 * ```
 */
/**
 * Transformers keyed by field name. `undefined` values are skipped before any transformer
 * runs (an absent field must leave the column unchanged), so a transformer is only ever
 * called with a defined value — `Exclude` encodes that rather than making every
 * transformer re-handle a case it cannot receive.
 */
export type UpdateTransformers<T> = {
  [K in keyof T]?: (value: Exclude<T[K], undefined>) => unknown;
};

/**
 * Result of applying `transformers` to `T`: transformed keys take their transformer's
 * return type, everything else is unchanged. This is what lets callers assign the result
 * straight to a Prisma update input without a cast, even when a transformer changes the
 * runtime type (e.g. a date string becoming a Date).
 */
export type TransformedUpdateData<T, TR> = {
  [K in keyof T]: K extends keyof TR
    ? TR[K] extends (value: never) => infer R
      ? R
      : T[K]
    : T[K];
};

/**
 * `value !== undefined` narrows a generic indexed access to an awkward
 * intersection that TypeScript will not accept where `Exclude<T[K], undefined>`
 * is expected. A type predicate expresses the same check in the exact shape the
 * transformer signature wants, so no assertion is needed at the call.
 */
function isDefined<V>(value: V): value is Exclude<V, undefined> {
  return value !== undefined;
}

export function buildConditionalUpdateData<
  T extends Record<string, unknown>,
  TR extends UpdateTransformers<T> = Record<never, never>,
>(
  data: Partial<T>,
  options: {
    emptyStringToNull?: boolean;
    transformers?: TR;
  } = {}
): Partial<TransformedUpdateData<T, TR>> {
  const { emptyStringToNull = true, transformers } = options;
  const updateData: Record<string, unknown> = {};

  for (const key in data) {
    // Read through a local typed as `T[K] | undefined` rather than
    // `Partial<T>[K]`. The two are identical once `undefined` is excluded, but
    // TypeScript will not prove that for a generic `T`, and the transformer
    // signature is written in terms of `T[K]`.
    const value: T[typeof key] | undefined = data[key];

    // Only include defined values (skip undefined to preserve existing values)
    if (isDefined(value)) {
      // The check above guarantees `value` is defined, which is exactly what
      // UpdateTransformers promises a transformer receives — but TypeScript cannot narrow
      // a generic indexed access, so the call is widened here. Callers still get the
      // precise parameter type from UpdateTransformers.
      // Pinned through a local of the base type: indexing the generic `TR`
      // directly widens the key to `string`, which loses the per-key parameter
      // type the transformer signature is built from.
      const transformerMap: UpdateTransformers<T> | undefined = transformers;
      const transform = transformerMap?.[key];

      // Apply custom transformer if exists
      if (transform) {
        updateData[key] = transform(value);
      }
      // Convert empty strings to null
      else if (emptyStringToNull && value === '') {
        updateData[key] = null;
      }
      // Include as-is
      else {
        updateData[key] = value;
      }
    }
  }

  // The object is built key-by-key from a dynamic loop, which TypeScript cannot relate to
  // the mapped return type. This single assertion is the one place that gap is bridged —
  // it replaces the per-call-site casts (several of them `as any`) that callers previously
  // needed, so mistakes now surface at the call site instead of being silently swallowed.
  return updateData as Partial<TransformedUpdateData<T, TR>>;
}

/**
 * Transformer for trip date fields (common pattern)
 * Converts date strings to UTC Date objects with T00:00:00.000Z
 *
 * @param dateStr - Date string (YYYY-MM-DD) or null
 * @returns Date object in UTC or null
 *
 * @example
 * ```typescript
 * tripDateTransformer("2025-01-15") // Date("2025-01-15T00:00:00.000Z")
 * tripDateTransformer(null) // null
 * ```
 */
export function tripDateTransformer(dateStr: string | null): Date | null {
  return dateStr ? new Date(dateStr + 'T00:00:00.000Z') : null;
}
