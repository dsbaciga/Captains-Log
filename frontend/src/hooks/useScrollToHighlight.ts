/**
 * useScrollToHighlight Hook
 *
 * Detects URL hash fragments and scrolls to the target element with highlighting.
 * Used when navigating via entity links (e.g., from LinkPanel to a specific activity).
 *
 * Usage:
 * 1. URLs with hash fragments like `?tab=activities#activity-123` will scroll to
 *    the element with data-entity-id="activity-123" and highlight it briefly.
 * 2. Add data-entity-id="entitytype-id" to scrollable/highlightable elements.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

interface UseScrollToHighlightOptions {
  /** Delay before scrolling (allows content to render) */
  scrollDelay?: number;
  /** Duration of highlight effect in ms */
  highlightDuration?: number;
  /** Scroll behavior */
  scrollBehavior?: ScrollBehavior;
  /** Block position for scrollIntoView */
  scrollBlock?: ScrollLogicalPosition;
  /** Whether the hook is active (useful for conditional activation) */
  enabled?: boolean;
}

export function useScrollToHighlight(options: UseScrollToHighlightOptions = {}) {
  const {
    scrollDelay = 100,
    highlightDuration = 2000,
    scrollBehavior = 'smooth',
    scrollBlock = 'center',
    enabled = true,
  } = options;

  const location = useLocation();
  const lastProcessedHash = useRef<string>('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Parse entity info from hash (e.g., #activity-123 -> { type: 'activity', id: '123' })
  const parseHash = useCallback((hash: string) => {
    if (!hash || hash === '#') return null;

    // Remove the # prefix
    const cleanHash = hash.startsWith('#') ? hash.slice(1) : hash;

    // Parse entitytype-id format (e.g., activity-123, location-45)
    const match = cleanHash.match(/^([a-z_]+)-(\d+)$/i);
    if (match) {
      return {
        type: match[1].toLowerCase(),
        id: match[2],
        fullId: cleanHash,
      };
    }

    return null;
  }, []);

  // Scroll to and highlight element
  const scrollToElement = useCallback((entityId: string) => {
    // Look for element with data-entity-id attribute
    const element = document.querySelector(`[data-entity-id="${entityId}"]`);

    if (!element) {
      // Try finding by id attribute as fallback
      const elementById = document.getElementById(entityId);
      if (!elementById) {
        console.debug(`[useScrollToHighlight] Element not found: ${entityId}`);
        return false;
      }
      return scrollAndHighlight(elementById);
    }

    return scrollAndHighlight(element);
  }, []);

  const scrollAndHighlight = useCallback((element: Element) => {
    // Scroll to element
    element.scrollIntoView({
      behavior: scrollBehavior,
      block: scrollBlock,
    });

    // Add highlight class
    element.classList.add('scroll-highlight');

    // Clear any existing highlight timeout
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }

    // Remove highlight after duration (tracked for cleanup)
    highlightTimeoutRef.current = setTimeout(() => {
      element.classList.remove('scroll-highlight');
      highlightTimeoutRef.current = null;
    }, highlightDuration);

    return true;
  }, [scrollBehavior, scrollBlock, highlightDuration]);

  // Manual trigger function (useful for programmatic navigation)
  const scrollToEntity = useCallback((entityType: string, entityId: number | string) => {
    const fullId = `${entityType.toLowerCase()}-${entityId}`;

    // Small delay to allow content to render
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      scrollToElement(fullId);
    }, scrollDelay);
  }, [scrollToElement, scrollDelay]);

  // Effect to handle hash changes
  useEffect(() => {
    if (!enabled) return;

    const hash = location.hash;

    // Skip if same hash already processed or no hash
    if (!hash || hash === lastProcessedHash.current) return;

    const entityInfo = parseHash(hash);
    if (!entityInfo) return;

    // Mark as processed to avoid re-triggering
    lastProcessedHash.current = hash;

    // Delay scroll to allow tab content to render
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      scrollToElement(entityInfo.fullId);
    }, scrollDelay);

    // Cleanup timeouts on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, [location.hash, enabled, parseHash, scrollToElement, scrollDelay]);

  // Reset processed hash when location pathname changes (new page)
  useEffect(() => {
    lastProcessedHash.current = '';
  }, [location.pathname]);

  return {
    /** Manually scroll to an entity */
    scrollToEntity,
    /** Current hash info */
    currentHash: parseHash(location.hash),
  };
}

export default useScrollToHighlight;
