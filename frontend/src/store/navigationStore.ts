import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type NavigationLayout = 'tabs' | 'sidebar';

interface NavigationState {
  /** Current navigation layout preference */
  layout: NavigationLayout;
  /** Whether the sidebar is collapsed (only applies when layout is 'sidebar') */
  sidebarCollapsed: boolean;
  /** Set the navigation layout */
  setLayout: (layout: NavigationLayout) => void;
  /** Toggle between tabs and sidebar */
  toggleLayout: () => void;
  /** Toggle sidebar collapsed state */
  toggleSidebar: () => void;
  /** Set sidebar collapsed state */
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useNavigationStore = create<NavigationState>()(
  persist(
    (set) => ({
      layout: 'tabs',
      sidebarCollapsed: false,
      setLayout: (layout: NavigationLayout) => set({ layout }),
      toggleLayout: () =>
        set((state) => ({
          layout: state.layout === 'tabs' ? 'sidebar' : 'tabs',
        })),
      toggleSidebar: () =>
        set((state) => ({
          sidebarCollapsed: !state.sidebarCollapsed,
        })),
      setSidebarCollapsed: (collapsed: boolean) =>
        set({ sidebarCollapsed: collapsed }),
    }),
    {
      name: 'navigation-storage',
    }
  )
);

export default useNavigationStore;
