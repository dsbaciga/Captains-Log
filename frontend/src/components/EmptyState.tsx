interface EmptyStateProps {
  icon?: string;
  message: string;
  subMessage?: string;
}

/**
 * Reusable empty state component for when no items exist
 */
export default function EmptyState({ icon, message, subMessage }: EmptyStateProps) {
  return (
    <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
      {icon && <div className="text-6xl mb-4">{icon}</div>}
      <p className="text-gray-500 dark:text-gray-400 mb-2">
        {message}
      </p>
      {subMessage && (
        <p className="text-sm text-gray-400">
          {subMessage}
        </p>
      )}
    </div>
  );
}
