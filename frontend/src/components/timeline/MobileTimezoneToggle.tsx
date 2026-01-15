import { getTimezoneAbbr } from './utils';
import type { MobileTimezoneToggleProps } from './types';

export default function MobileTimezoneToggle({
  activeTimezone,
  tripTimezone,
  userTimezone,
  onToggle,
}: MobileTimezoneToggleProps) {
  if (!tripTimezone || !userTimezone || tripTimezone === userTimezone) {
    return null;
  }

  return (
    <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1 text-sm">
      <button
        type="button"
        onClick={() => onToggle('trip')}
        className={`flex-1 px-3 py-1.5 rounded-md font-medium transition-colors ${
          activeTimezone === 'trip'
            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
        }`}
      >
        Trip ({getTimezoneAbbr(tripTimezone)})
      </button>
      <button
        type="button"
        onClick={() => onToggle('user')}
        className={`flex-1 px-3 py-1.5 rounded-md font-medium transition-colors ${
          activeTimezone === 'user'
            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
        }`}
      >
        Home ({getTimezoneAbbr(userTimezone)})
      </button>
    </div>
  );
}
