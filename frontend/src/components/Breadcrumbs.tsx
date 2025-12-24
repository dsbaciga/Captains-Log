/* eslint-disable react-refresh/only-export-components */
import { Link } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Breadcrumb navigation component for showing hierarchical location
 *
 * @example
 * ```tsx
 * <Breadcrumbs
 *   items={[
 *     { label: 'Trips', href: '/trips' },
 *     { label: 'Paris 2024', href: '/trips/123' },
 *     { label: 'Photos' }
 *   ]}
 * />
 * ```
 */
export default function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={`mb-4 ${className}`}
    >
      <ol className="flex items-center flex-wrap gap-1 text-sm font-body">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <svg
                  className="w-4 h-4 mx-2 text-slate/50 dark:text-warm-gray/50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              )}

              {item.href && !isLast ? (
                <Link
                  to={item.href}
                  className="text-primary-600 dark:text-gold hover:text-primary-700 dark:hover:text-accent-400 hover:underline transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className="text-slate dark:text-warm-gray"
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Hook to build breadcrumb items for common patterns
 */
export function useTripBreadcrumbs(
  tripId: number | string,
  tripTitle: string,
  additionalItems: BreadcrumbItem[] = []
): BreadcrumbItem[] {
  return [
    { label: 'Trips', href: '/trips' },
    { label: tripTitle, href: `/trips/${tripId}` },
    ...additionalItems,
  ];
}
