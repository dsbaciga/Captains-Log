import { useThemeStore } from '../store/themeStore';
import { useAuthStore } from '../store/authStore';
import { getMapTileConfig } from '../utils/mapConfig';
import type { MapTileConfig } from '../utils/mapConfig';

/**
 * Hook that returns the appropriate map tile configuration
 * based on the current theme and user's custom map style preference.
 *
 * Returns themed tiles (Stadia Alidade Smooth) if custom styling is enabled,
 * or standard OpenStreetMap tiles if disabled.
 */
export function useMapTiles(): MapTileConfig {
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const user = useAuthStore((s) => s.user);
  // Default to custom style if user setting not loaded yet
  const useCustomStyle = user?.useCustomMapStyle ?? true;

  return getMapTileConfig(isDarkMode, useCustomStyle);
}
