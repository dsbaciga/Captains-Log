import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  isDarkMode: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'light',
      isDarkMode: false,
      toggleTheme: () =>
        set((state) => {
          const newTheme = state.theme === 'light' ? 'dark' : 'light';
          // Update document class
          if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
          return { theme: newTheme, isDarkMode: newTheme === 'dark' };
        }),
      setTheme: (theme: Theme) =>
        set(() => {
          // Update document class
          if (theme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
          return { theme, isDarkMode: theme === 'dark' };
        }),
    }),
    {
      name: 'theme-storage',
    }
  )
);

// Initialize theme on app load
const storedTheme = localStorage.getItem('theme-storage');
if (storedTheme) {
  try {
    const { state } = JSON.parse(storedTheme);
    if (state.theme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  } catch (error) {
    console.error('Error parsing theme storage:', error);
  }
}
