/**
 * Shared tag color utilities for consistent tag styling across components.
 */

export const DEFAULT_TAG_COLORS = [
  "#3B82F6", // blue
  "#10B981", // green
  "#F59E0B", // yellow
  "#EF4444", // red
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#F97316", // orange
  "#06B6D4", // cyan
];

/** Default background color for tags without a color set */
export const DEFAULT_TAG_COLOR = DEFAULT_TAG_COLORS[0];

/** Default text color for tags */
export const DEFAULT_TEXT_COLOR = "#FFFFFF";

/** Get a random color from the tag color palette */
export const getRandomTagColor = () =>
  DEFAULT_TAG_COLORS[Math.floor(Math.random() * DEFAULT_TAG_COLORS.length)];
