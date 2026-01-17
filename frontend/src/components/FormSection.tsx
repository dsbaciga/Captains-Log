import { type ReactNode } from 'react';

interface FormSectionProps {
  title: string;
  icon?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Reusable form section component for visual grouping of related fields
 * Provides consistent styling with title, optional icon, and description
 * Works in both light and dark modes
 */
export default function FormSection({
  title,
  icon,
  description,
  children,
  className = '',
}: FormSectionProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Section Header */}
      <div className="flex items-center gap-2">
        {icon && <span className="text-lg">{icon}</span>}
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          {title}
        </h3>
      </div>

      {/* Optional Description */}
      {description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
          {description}
        </p>
      )}

      {/* Section Content */}
      <div className="space-y-4 pl-0">
        {children}
      </div>
    </div>
  );
}

interface CollapsibleSectionProps {
  title: string;
  icon?: string;
  description?: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: ReactNode;
  badge?: string;
}

/**
 * Collapsible form section for optional/advanced fields
 * Implements progressive disclosure pattern
 */
export function CollapsibleSection({
  title,
  icon,
  description,
  isExpanded,
  onToggle,
  children,
  badge,
}: CollapsibleSectionProps) {
  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
      {/* Toggle Button */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between py-2 px-3 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon && <span>{icon}</span>}
          <span>{isExpanded ? `Hide ${title}` : `Show ${title}`}</span>
          {badge && !isExpanded && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ({badge})
            </span>
          )}
        </div>
        <span className="transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          ▼
        </span>
      </button>

      {/* Optional Description */}
      {description && !isExpanded && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 px-1">
          {description}
        </p>
      )}

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}
