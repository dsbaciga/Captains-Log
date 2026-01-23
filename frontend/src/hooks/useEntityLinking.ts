import { useState, useCallback } from 'react';
import type { EntityType } from '../types/entityLink';

interface UseEntityLinkingOptions {
  entityType: EntityType;
  tripId: number;
}

export function useEntityLinking({ entityType, tripId }: UseEntityLinkingOptions) {
  const [linkingEntityId, setLinkingEntityId] = useState<number | null>(null);
  const [showLinkPanel, setShowLinkPanel] = useState(false);

  const openLinkPanel = useCallback((entityId: number) => {
    setLinkingEntityId(entityId);
    setShowLinkPanel(true);
  }, []);

  const closeLinkPanel = useCallback(() => {
    setLinkingEntityId(null);
    setShowLinkPanel(false);
  }, []);

  const linkPanelProps = {
    isOpen: showLinkPanel,
    onClose: closeLinkPanel,
    tripId,
    entityType,
    entityId: linkingEntityId,
  };

  return {
    linkingEntityId,
    showLinkPanel,
    openLinkPanel,
    closeLinkPanel,
    linkPanelProps,
  };
}
