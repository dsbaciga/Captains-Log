import { create } from 'zustand';

interface ScrollPositions {
  [key: string]: number;
}

interface PageNumbers {
  [key: string]: number;
}

interface ScrollState {
  /** Stored scroll positions by page key */
  positions: ScrollPositions;
  /** Stored page numbers by page key */
  pageNumbers: PageNumbers;
  /** Whether to skip the next scroll-to-top (for returning navigation) */
  skipNextScrollToTop: boolean;
  /** Save scroll position for a page */
  savePosition: (pageKey: string, position: number) => void;
  /** Get saved scroll position for a page */
  getPosition: (pageKey: string) => number;
  /** Save page number for a page */
  savePageNumber: (pageKey: string, page: number) => void;
  /** Get saved page number for a page */
  getPageNumber: (pageKey: string) => number;
  /** Clear scroll position for a page */
  clearPosition: (pageKey: string) => void;
  /** Clear all saved scroll positions */
  clearAllPositions: () => void;
  /** Set whether to skip the next scroll-to-top */
  setSkipNextScrollToTop: (skip: boolean) => void;
}

export const useScrollStore = create<ScrollState>()((set, get) => ({
  positions: {},
  pageNumbers: {},
  skipNextScrollToTop: false,
  savePosition: (pageKey: string, position: number) =>
    set((state) => ({
      positions: { ...state.positions, [pageKey]: position },
    })),
  getPosition: (pageKey: string) => get().positions[pageKey] || 0,
  savePageNumber: (pageKey: string, page: number) =>
    set((state) => ({
      pageNumbers: { ...state.pageNumbers, [pageKey]: page },
    })),
  getPageNumber: (pageKey: string) => get().pageNumbers[pageKey] || 1,
  clearPosition: (pageKey: string) =>
    set((state) => {
      const { [pageKey]: _removed, ...rest } = state.positions;
      const { [pageKey]: _removedPage, ...restPages } = state.pageNumbers;
      void _removed; // Explicitly mark as intentionally unused
      void _removedPage;
      return { positions: rest, pageNumbers: restPages };
    }),
  clearAllPositions: () => set({ positions: {}, pageNumbers: {} }),
  setSkipNextScrollToTop: (skip: boolean) =>
    set({ skipNextScrollToTop: skip }),
}));

export default useScrollStore;
