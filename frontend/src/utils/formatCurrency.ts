/**
 * Shared, guarded currency formatter.
 *
 * `Intl.NumberFormat` throws a `RangeError` for any currency code it does not
 * recognise, and backend validation on `currency` is only `z.string().length(3)`
 * — three characters of anything. An unguarded constructor in a render path
 * therefore takes the whole view down, so every call site must go through here.
 *
 * Locale is deliberately the viewer's (`undefined`), not a hardcoded `'en-US'`,
 * so amounts group and place the symbol the way the reader expects.
 */
export function formatCurrency(
  amount: number | null | undefined,
  currency?: string | null
): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '';

  const code = currency || 'USD';

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Unknown/invalid currency code — show the code alongside a plain number
    // rather than losing the amount entirely.
    return `${code} ${amount.toFixed(2)}`;
  }
}

export default formatCurrency;
