import { create } from 'zustand';

interface ScrollPositions {
  [key: string]: number;
}

interface ScrollState {
  /** Stored scroll positions by page key */
  positions: ScrollPositions;
  /** Whether to skip the next scroll-to-top (for returning navigation) */
  skipNextScrollToTop: boolean;
  /** Save scroll position for a page */
  savePosition: (pageKey: string, position: number) => void;
  /** Get saved scroll position for a page */
  getPosition: (pageKey: string) => number;
  /** Clear scroll position for a page */
  clearPosition: (pageKey: string) => void;
  /** Clear all saved scroll positions */
  clearAllPositions: () => void;
  /** Set whether to skip the next scroll-to-top */
  setSkipNextScrollToTop: (skip: boolean) => void;
}

export const useScrollStore = create<ScrollState>()((set, get) => ({
  positions: {},
  skipNextScrollToTop: false,
  savePosition: (pageKey: string, position: number) =>
    set((state) => ({
      positions: { ...state.positions, [pageKey]: position },
    })),
  getPosition: (pageKey: string) => get().positions[pageKey] || 0,
  clearPosition: (pageKey: string) =>
    set((state) => {
      const { [pageKey]: _removed, ...rest } = state.positions;
      void _removed; // Explicitly mark as intentionally unused
      return { positions: rest };
    }),
  clearAllPositions: () => set({ positions: {} }),
  setSkipNextScrollToTop: (skip: boolean) =>
    set({ skipNextScrollToTop: skip }),
}));

export default useScrollStore;
