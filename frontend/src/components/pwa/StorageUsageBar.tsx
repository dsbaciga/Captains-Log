import { useState, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import storageManager, {
  type StorageBreakdown,
  type StorageUsage,
  formatBytes,
} from '../../services/storageManager.service';

/**
 * SVG Icons for storage categories
 */
const Icons = {
  HardDrive: ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  ),
  Database: ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  ),
  Image: ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Map: ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  ),
  Video: ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  Folder: ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  Check: ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Warning: ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
};

/**
 * Storage category configuration with colors and icons
 */
const CATEGORY_CONFIG: Record<string, {
  label: string;
  color: string;
  textColor: string;
  icon: (props: { className?: string }) => ReactNode;
}> = {
  trips: {
    label: 'Trips Data',
    color: 'bg-primary-500 dark:bg-primary-400',
    textColor: 'text-primary-600 dark:text-primary-400',
    icon: Icons.Database,
  },
  photoThumbnails: {
    label: 'Photo Thumbnails',
    color: 'bg-accent-500 dark:bg-accent-400',
    textColor: 'text-accent-600 dark:text-accent-400',
    icon: Icons.Image,
  },
  photoFull: {
    label: 'Full Photos',
    color: 'bg-amber-500 dark:bg-amber-400',
    textColor: 'text-amber-600 dark:text-amber-400',
    icon: Icons.Image,
  },
  mapTiles: {
    label: 'Map Tiles',
    color: 'bg-emerald-500 dark:bg-emerald-400',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    icon: Icons.Map,
  },
  immichCache: {
    label: 'Immich Cache',
    color: 'bg-purple-500 dark:bg-purple-400',
    textColor: 'text-purple-600 dark:text-purple-400',
    icon: Icons.Image,
  },
  videoCache: {
    label: 'Video Cache',
    color: 'bg-rose-500 dark:bg-rose-400',
    textColor: 'text-rose-600 dark:text-rose-400',
    icon: Icons.Video,
  },
  other: {
    label: 'Other',
    color: 'bg-navy-400 dark:bg-navy-500',
    textColor: 'text-navy-500 dark:text-navy-400',
    icon: Icons.Folder,
  },
};

type CategoryKey = keyof typeof CATEGORY_CONFIG;

export interface StorageUsageBarProps {
  /** Whether to show detailed legend */
  showLegend?: boolean;
  /** Custom class name */
  className?: string;
  /** Height of the bar */
  barHeight?: 'sm' | 'md' | 'lg';
  /** Callback when storage data is loaded */
  onDataLoaded?: (usage: StorageUsage, breakdown: StorageBreakdown) => void;
}

/**
 * StorageUsageBar displays a visual bar showing storage breakdown by category.
 *
 * Features:
 * - Color-coded segments for each category
 * - Tooltip showing exact values on hover
 * - Warning state when near quota (>80%)
 * - Optional legend with category details
 * - Responsive design
 *
 * @example
 * ```tsx
 * // Basic usage
 * <StorageUsageBar />
 *
 * // With legend and large bar
 * <StorageUsageBar showLegend barHeight="lg" />
 *
 * // With data callback
 * <StorageUsageBar onDataLoaded={(usage, breakdown) => console.log(usage)} />
 * ```
 */
export default function StorageUsageBar({
  showLegend = false,
  className = '',
  barHeight = 'md',
  onDataLoaded,
}: StorageUsageBarProps) {
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [breakdown, setBreakdown] = useState<StorageBreakdown | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<CategoryKey | null>(null);
  const [loading, setLoading] = useState(true);

  // Load storage data
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setLoading(true);
      try {
        const [usageData, breakdownData] = await Promise.all([
          storageManager.getStorageUsage(),
          storageManager.getStorageBreakdown(),
        ]);

        if (mounted) {
          setUsage(usageData);
          setBreakdown(breakdownData);
          onDataLoaded?.(usageData, breakdownData);
        }
      } catch (error) {
        console.error('Failed to load storage data:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [onDataLoaded]);

  // Calculate segment widths
  const segments = useMemo(() => {
    if (!breakdown || breakdown.total === 0) return [];

    const categoryOrder: CategoryKey[] = [
      'trips',
      'photoThumbnails',
      'photoFull',
      'mapTiles',
      'immichCache',
      'videoCache',
      'other',
    ];

    return categoryOrder
      .filter((key) => breakdown[key] > 0)
      .map((key) => ({
        key,
        size: breakdown[key],
        percentage: (breakdown[key] / breakdown.total) * 100,
        ...CATEGORY_CONFIG[key],
      }));
  }, [breakdown]);

  // Bar height classes
  const heightClasses = {
    sm: 'h-2',
    md: 'h-4',
    lg: 'h-6',
  };

  // Warning state
  const isWarning = usage && usage.percentUsed > 80;
  const isCritical = usage && usage.percentUsed > 95;

  if (loading) {
    return (
      <div className={`${className}`}>
        <div
          className={`${heightClasses[barHeight]} bg-parchment dark:bg-navy-700 rounded-full overflow-hidden animate-pulse`}
        />
      </div>
    );
  }

  if (!usage || !breakdown) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Overall usage stats */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Icons.HardDrive
            className={`w-4 h-4 ${
              isCritical
                ? 'text-red-500'
                : isWarning
                  ? 'text-amber-500'
                  : 'text-primary-500 dark:text-gold'
            }`}
          />
          <span className="font-medium text-charcoal dark:text-warm-gray">
            {formatBytes(usage.used)} used
          </span>
        </div>
        <span className="text-slate dark:text-warm-gray/70">
          {formatBytes(usage.quota)} available
        </span>
      </div>

      {/* Main progress bar */}
      <div
        className={`
          relative ${heightClasses[barHeight]} rounded-full overflow-hidden
          bg-parchment dark:bg-navy-700
          ${isCritical ? 'ring-2 ring-red-500/50' : ''}
          ${isWarning && !isCritical ? 'ring-2 ring-amber-500/30' : ''}
        `}
        role="progressbar"
        aria-valuenow={usage.percentUsed}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Storage usage: ${Math.round(usage.percentUsed)}% used`}
      >
        {/* Category segments */}
        <div className="absolute inset-0 flex">
          {segments.map((segment) => (
            <div
              key={segment.key}
              className={`
                ${segment.color}
                transition-all duration-300
                ${hoveredCategory === segment.key ? 'opacity-100 brightness-110' : 'opacity-90'}
                ${hoveredCategory && hoveredCategory !== segment.key ? 'opacity-60' : ''}
              `}
              style={{ width: `${segment.percentage}%` }}
              onMouseEnter={() => setHoveredCategory(segment.key)}
              onMouseLeave={() => setHoveredCategory(null)}
              role="presentation"
            />
          ))}
        </div>

        {/* Tooltip for hovered segment */}
        {hoveredCategory && (
          <div
            className="
              absolute -top-10 left-1/2 transform -translate-x-1/2
              px-2 py-1 rounded-lg
              bg-navy-800 dark:bg-navy-900
              text-white text-xs font-medium
              whitespace-nowrap
              shadow-lg
              pointer-events-none
              animate-fade-in
            "
          >
            {CATEGORY_CONFIG[hoveredCategory].label}:{' '}
            {formatBytes(breakdown[hoveredCategory])}
          </div>
        )}
      </div>

      {/* Percentage indicator */}
      <div className="flex justify-between items-center text-xs">
        <span
          className={`font-medium ${
            isCritical
              ? 'text-red-600 dark:text-red-400'
              : isWarning
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-slate dark:text-warm-gray/70'
          }`}
        >
          {Math.round(usage.percentUsed)}% used
        </span>
        {usage.isPersisted && (
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <Icons.Check className="w-3 h-3" />
            Persistent storage
          </span>
        )}
      </div>

      {/* Legend */}
      {showLegend && segments.length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {segments.map((segment) => {
            const Icon = segment.icon;
            return (
              <div
                key={segment.key}
                className={`
                  flex items-center gap-2 p-2 rounded-lg
                  transition-colors duration-200
                  ${
                    hoveredCategory === segment.key
                      ? 'bg-parchment dark:bg-navy-700'
                      : ''
                  }
                `}
                onMouseEnter={() => setHoveredCategory(segment.key)}
                onMouseLeave={() => setHoveredCategory(null)}
              >
                <div
                  className={`
                    flex items-center justify-center w-6 h-6 rounded-md
                    ${segment.color}
                  `}
                >
                  <Icon className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium text-charcoal dark:text-warm-gray truncate">
                    {segment.label}
                  </span>
                  <span className="text-xs text-slate dark:text-warm-gray/70">
                    {formatBytes(segment.size)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Warning messages */}
      {isCritical && (
        <div className="flex items-start gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <Icons.Warning className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 dark:text-red-300">
            Storage is almost full. Clear some data to continue using offline features.
          </p>
        </div>
      )}
      {isWarning && !isCritical && (
        <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <Icons.Warning className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Storage is running low. Consider clearing old cached data.
          </p>
        </div>
      )}
    </div>
  );
}
