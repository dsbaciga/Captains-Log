import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useScrollStore } from '../store/scrollStore';

/**
 * Component that scrolls to the top of the page whenever the route changes,
 * unless skipNextScrollToTop is set in the scroll store.
 *
 * This allows pages to preserve scroll position when returning from
 * navigation (e.g., returning to trips list after editing a trip).
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();
  const { skipNextScrollToTop, setSkipNextScrollToTop } = useScrollStore();

  useEffect(() => {
    if (skipNextScrollToTop) {
      // Reset the flag but don't scroll
      setSkipNextScrollToTop(false);
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, skipNextScrollToTop, setSkipNextScrollToTop]);

  return null;
}
