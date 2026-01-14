import { useState } from 'react';
import LinkPanel from './LinkPanel';
import type { EntityType, EntityLinkSummary } from '../types/entityLink';

interface LinkButtonProps {
  tripId: number;
  entityType: EntityType;
  entityId: number;
  linkSummary?: EntityLinkSummary;
  onUpdate?: () => void;
  className?: string;
  size?: 'sm' | 'md';
}

export default function LinkButton({
  tripId,
  entityType,
  entityId,
  linkSummary,
  onUpdate,
  className = '',
  size = 'md',
}: LinkButtonProps) {
  const [showPanel, setShowPanel] = useState(false);

  const totalLinks = linkSummary?.totalLinks ?? 0;
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const badgeSize = size === 'sm' ? 'w-3.5 h-3.5 text-[10px]' : 'w-4 h-4 text-xs';

  return (
    <>
      <button
        onClick={() => setShowPanel(true)}
        type="button"
        className={`relative p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${className}`}
        aria-label={`${totalLinks} linked ${totalLinks === 1 ? 'item' : 'items'}`}
        title={totalLinks > 0 ? `${totalLinks} linked items` : 'Link to other items'}
      >
        {/* Link icon */}
        <svg
          className={iconSize}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          />
        </svg>
        {/* Badge with link count */}
        {totalLinks > 0 && (
          <span
            className={`absolute -top-1 -right-1 bg-blue-600 text-white rounded-full flex items-center justify-center font-medium ${badgeSize}`}
          >
            {totalLinks > 99 ? '99+' : totalLinks}
          </span>
        )}
      </button>

      {/* Link Panel Modal */}
      {showPanel && (
        <LinkPanel
          tripId={tripId}
          entityType={entityType}
          entityId={entityId}
          onClose={() => setShowPanel(false)}
          onUpdate={onUpdate}
        />
      )}
    </>
  );
}
