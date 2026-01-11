/**
 * Utility for persisting user's last-used currency across sessions
 */

const CURRENCY_STORAGE_KEY = 'travel-life-last-currency';

/**
 * Get the last-used currency from localStorage
 * @returns The last currency code, or 'USD' as default
 */
export function getLastUsedCurrency(): string {
  try {
    return localStorage.getItem(CURRENCY_STORAGE_KEY) || 'USD';
  } catch {
    // localStorage might not be available (SSR, privacy mode, etc.)
    return 'USD';
  }
}

/**
 * Save the currency to localStorage for future use
 * @param currency The currency code to save (e.g., 'USD', 'EUR', 'GBP')
 */
export function saveLastUsedCurrency(currency: string): void {
  try {
    if (currency && currency.trim()) {
      localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
    }
  } catch {
    // Silently fail if localStorage is not available
    console.warn('Could not save currency to localStorage');
  }
}
