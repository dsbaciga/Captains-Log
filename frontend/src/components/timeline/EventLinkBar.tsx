import { useState } from 'react';
import PhotoPreviewPopover from './PhotoPreviewPopover';
import EntityLinkTooltip from './EntityLinkTooltip';
import LinkPanel from '../LinkPanel';
import { LinkIcon } from './icons';
import { ENTITY_TYPE_CONFIG, ENTITY_TYPE_DISPLAY_ORDER } from '../../lib/entityConfig';
import type { EventLinkBarProps } from './types';

export default function EventLinkBar({
  tripId,
  entityType,
  entityId,
  linkSummary,
  onUpdate,
  compact = false,
}: EventLinkBarProps) {
  const [showLinkPanel, setShowLinkPanel] = useState(false);

  const totalLinks = linkSummary?.totalLinks ?? 0;
  const linkCounts = linkSummary?.linkCounts ?? {};

  // Filter to only show entity types that have links (in standard display order)
  const linkedTypes = ENTITY_TYPE_DISPLAY_ORDER.filter((type) => (linkCounts[type] ?? 0) > 0);

  // Don't render anything if no links
  if (totalLinks === 0 && !compact) {
    return (
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setShowLinkPanel(true)}
          className="inline-flex items-center justify-center gap-1 h-6 px-2 text-xs text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          title="Link to other items"
        >
          <LinkIcon className="w-4 h-4" />
          <span>Link</span>
        </button>

        {showLinkPanel && (
          <LinkPanel
            tripId={tripId}
            entityType={entityType}
            entityId={entityId}
            onClose={() => setShowLinkPanel(false)}
            onUpdate={onUpdate}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Link type badges */}
      {linkedTypes.map((type) => {
        const count = linkCounts[type] ?? 0;
        const config = ENTITY_TYPE_CONFIG[type];

        // Special handling for photos - show preview on hover
        if (type === 'PHOTO') {
          return (
            <PhotoPreviewPopover
              key={type}
              tripId={tripId}
              entityType={entityType}
              entityId={entityId}
              photoCount={count}
              onViewAll={() => setShowLinkPanel(true)}
            >
              <span
                className={`inline-flex items-center justify-center gap-1 h-6 px-1.5 rounded text-xs font-medium leading-none bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer`}
              >
                <span className="flex items-center justify-center w-4 h-4">{config.emoji}</span>
                <span>{count}</span>
              </span>
            </PhotoPreviewPopover>
          );
        }

        return (
          <EntityLinkTooltip
            key={type}
            tripId={tripId}
            sourceEntityType={entityType}
            sourceEntityId={entityId}
            targetEntityType={type}
          >
            <span
              className="inline-flex items-center justify-center gap-1 h-6 px-1.5 rounded text-xs font-medium leading-none bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-default"
            >
              <span className="flex items-center justify-center w-4 h-4">{config.emoji}</span>
              <span>{count}</span>
            </span>
          </EntityLinkTooltip>
        );
      })}

      {/* View all / Link button */}
      <button
        type="button"
        onClick={() => setShowLinkPanel(true)}
        className="inline-flex items-center justify-center h-6 px-1.5 rounded text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
        title={totalLinks > 0 ? `View all ${totalLinks} links` : 'Link to other items'}
      >
        <LinkIcon className="w-4 h-4" />
      </button>

      {/* Link Panel Modal */}
      {showLinkPanel && (
        <LinkPanel
          tripId={tripId}
          entityType={entityType}
          entityId={entityId}
          onClose={() => setShowLinkPanel(false)}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
}
