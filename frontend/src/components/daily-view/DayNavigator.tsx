import { useState, useRef, useEffect } from 'react';

interface DayNavigatorProps {
  currentDay: number;
  totalDays: number;
  currentDate: string;
  onDayChange: (dayNumber: number) => void;
  allDates: { dayNumber: number; dateKey: string; displayDate: string }[];
}

export default function DayNavigator({
  currentDay,
  totalDays,
  currentDate,
  onDayChange,
  allDates,
}: DayNavigatorProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const canGoBack = currentDay > 1;
  const canGoForward = currentDay < totalDays;

  const handlePrevious = () => {
    if (canGoBack) {
      onDayChange(currentDay - 1);
    }
  };

  const handleNext = () => {
    if (canGoForward) {
      onDayChange(currentDay + 1);
    }
  };

  const handleDaySelect = (dayNumber: number) => {
    onDayChange(dayNumber);
    setIsDropdownOpen(false);
  };

  return (
    <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3">
      {/* Previous Day Button */}
      <button
        type="button"
        onClick={handlePrevious}
        disabled={!canGoBack}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
          canGoBack
            ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
        }`}
        aria-label="Previous day"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        <span className="hidden sm:inline font-medium">Previous</span>
      </button>

      {/* Day Indicator - Clickable dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              Day {currentDay}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              of {totalDays}
            </span>
            <svg
              className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${
                isDropdownOpen ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {currentDate}
          </span>
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-64 max-h-80 overflow-y-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
            <div className="p-2">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase px-3 py-2">
                Jump to Day
              </div>
              {allDates.map((day) => (
                <button
                  key={day.dayNumber}
                  type="button"
                  onClick={() => handleDaySelect(day.dayNumber)}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                    day.dayNumber === currentDay
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Day {day.dayNumber}</span>
                    {day.dayNumber === currentDay && (
                      <svg
                        className="w-4 h-4 text-blue-600 dark:text-blue-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {day.displayDate}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Next Day Button */}
      <button
        type="button"
        onClick={handleNext}
        disabled={!canGoForward}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
          canGoForward
            ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
        }`}
        aria-label="Next day"
      >
        <span className="hidden sm:inline font-medium">Next</span>
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
    </div>
  );
}
