import type { TimelineItemType } from './types';

interface TimelineFiltersProps {
  visibleTypes: Set<TimelineItemType>;
  onToggleType: (type: TimelineItemType) => void;
  viewMode: 'standard' | 'compact';
  onToggleViewMode: (mode: 'standard' | 'compact') => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

const TYPE_CONFIG: Record<TimelineItemType, { label: string; color: string; bgColor: string }> = {
  activity: {
    label: 'Activities',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  transportation: {
    label: 'Transport',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  lodging: {
    label: 'Lodging',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  journal: {
    label: 'Journal',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
};

export default function TimelineFilters({
  visibleTypes,
  onToggleType,
  viewMode,
  onToggleViewMode,
  onExpandAll,
  onCollapseAll,
}: TimelineFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      {/* Type filters */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(TYPE_CONFIG) as TimelineItemType[]).map((type) => {
          const config = TYPE_CONFIG[type];
          const isActive = visibleTypes.has(type);

          return (
            <button
              key={type}
              type="button"
              onClick={() => onToggleType(type)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                isActive
                  ? `${config.bgColor} ${config.color}`
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {config.label}
            </button>
          );
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* View controls */}
      <div className="flex items-center gap-2">
        {/* Expand/Collapse buttons */}
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <button
            type="button"
            onClick={onExpandAll}
            className="px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Expand all days"
          >
            Expand
          </button>
          <div className="w-px bg-gray-200 dark:bg-gray-700" />
          <button
            type="button"
            onClick={onCollapseAll}
            className="px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Collapse all days"
          >
            Collapse
          </button>
        </div>

        {/* View mode toggle */}
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <button
            type="button"
            onClick={() => onToggleViewMode('standard')}
            className={`px-2.5 py-1.5 text-xs transition-colors ${
              viewMode === 'standard'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            title="Standard view"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <div className="w-px bg-gray-200 dark:bg-gray-700" />
          <button
            type="button"
            onClick={() => onToggleViewMode('compact')}
            className={`px-2.5 py-1.5 text-xs transition-colors ${
              viewMode === 'compact'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            title="Compact view"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
