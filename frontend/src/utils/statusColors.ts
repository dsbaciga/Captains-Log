import { TripStatus } from '../types/trip';

/**
 * Color mappings for trip statuses
 * Each status has a background and text color class
 */
export const tripStatusColors: Record<TripStatus, string> = {
  [TripStatus.DREAM]: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  [TripStatus.PLANNING]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  [TripStatus.PLANNED]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  [TripStatus.IN_PROGRESS]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  [TripStatus.COMPLETED]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  [TripStatus.CANCELLED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

/**
 * Get the color classes for a trip status
 * @param status - The trip status
 * @returns Tailwind CSS classes for background and text color
 */
export function getTripStatusColor(status: string): string {
  return tripStatusColors[status as TripStatus] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
}

/**
 * Status badge component styling - combines status color with badge styling
 */
export function getTripStatusBadgeClasses(status: string): string {
  return `px-2 py-1 text-xs font-medium rounded-lg ${getTripStatusColor(status)}`;
}

/**
 * Generic status colors for other entities (companions, checklists, etc.)
 */
export const genericStatusColors = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-300',
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  error: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
} as const;

export type GenericStatus = keyof typeof genericStatusColors;

export function getGenericStatusColor(status: GenericStatus): string {
  return genericStatusColors[status];
}

