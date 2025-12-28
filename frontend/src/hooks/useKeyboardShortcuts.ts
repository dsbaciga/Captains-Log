/**
 * Keyboard Shortcuts Hook
 *
 * Provides global keyboard shortcuts for common actions.
 * Displays a help modal with `?` key.
 *
 * Shortcuts:
 * - Esc: Close modals/forms
 * - ?: Show keyboard shortcuts help
 * - Arrow keys: Navigate photo gallery
 * - Delete: Delete selected item (with confirmation)
 * - E: Toggle edit mode
 * - N: New trip (on dashboard)
 * - Ctrl/Cmd + K: Global search (future)
 *
 * Usage:
 * ```tsx
 * const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts();
 *
 * // Register custom shortcut
 * useEffect(() => {
 *   const cleanup = registerShortcut({
 *     key: 'e',
 *     description: 'Edit trip',
 *     action: () => setEditMode(true),
 *   });
 *   return cleanup;
 * }, []);
 * ```
 */

import { useEffect, useCallback, useState } from 'react';

export interface KeyboardShortcut {
  key: string;
  description: string;
  action: () => void;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean; // Cmd on Mac
  category?: 'Navigation' | 'Actions' | 'Editing' | 'General';
}

interface UseKeyboardShortcutsReturn {
  registerShortcut: (shortcut: KeyboardShortcut) => () => void;
  unregisterShortcut: (key: string) => void;
  showHelp: boolean;
  setShowHelp: (show: boolean) => void;
  shortcuts: KeyboardShortcut[];
}

const globalShortcuts: KeyboardShortcut[] = [];

export function useKeyboardShortcuts(): UseKeyboardShortcutsReturn {
  const [showHelp, setShowHelp] = useState(false);
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);

  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    globalShortcuts.push(shortcut);
    setShortcuts([...globalShortcuts]);

    return () => {
      const index = globalShortcuts.findIndex((s) => s.key === shortcut.key);
      if (index > -1) {
        globalShortcuts.splice(index, 1);
        setShortcuts([...globalShortcuts]);
      }
    };
  }, []);

  const unregisterShortcut = useCallback((key: string) => {
    const index = globalShortcuts.findIndex((s) => s.key === key);
    if (index > -1) {
      globalShortcuts.splice(index, 1);
      setShortcuts([...globalShortcuts]);
    }
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      const isInputField =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Special case: Allow Esc in input fields
      if (event.key !== 'Escape' && isInputField) {
        return;
      }

      // Show help modal
      if (event.key === '?' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        setShowHelp(true);
        return;
      }

      // Close help modal with Escape
      if (event.key === 'Escape' && showHelp) {
        event.preventDefault();
        setShowHelp(false);
        return;
      }

      // Find matching shortcut
      const shortcut = globalShortcuts.find((s) => {
        const keyMatch = s.key.toLowerCase() === event.key.toLowerCase();
        const ctrlMatch = s.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const altMatch = s.alt ? event.altKey : !event.altKey;
        const shiftMatch = s.shift ? event.shiftKey : !event.shiftKey;
        const metaMatch = s.meta ? event.metaKey : !event.metaKey;

        return keyMatch && ctrlMatch && altMatch && shiftMatch && metaMatch;
      });

      if (shortcut) {
        event.preventDefault();
        shortcut.action();
      }
    },
    [showHelp]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    registerShortcut,
    unregisterShortcut,
    showHelp,
    setShowHelp,
    shortcuts,
  };
}

/**
 * Hook for form-specific shortcuts (Escape to close)
 */
export function useFormShortcuts(onClose: () => void) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
}

/**
 * Hook for photo gallery shortcuts (arrow keys for navigation)
 */
export function usePhotoGalleryShortcuts(
  currentIndex: number,
  totalPhotos: number,
  onNavigate: (index: number) => void,
  onClose?: () => void
) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          if (currentIndex > 0) {
            onNavigate(currentIndex - 1);
          }
          break;
        case 'ArrowRight':
          event.preventDefault();
          if (currentIndex < totalPhotos - 1) {
            onNavigate(currentIndex + 1);
          }
          break;
        case 'Escape':
          if (onClose) {
            event.preventDefault();
            onClose();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, totalPhotos, onNavigate, onClose]);
}

/**
 * Get display string for shortcut
 */
export function getShortcutDisplay(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];

  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.alt) parts.push('Alt');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.meta) parts.push('⌘'); // Cmd symbol

  const keyDisplay = shortcut.key.length === 1
    ? shortcut.key.toUpperCase()
    : shortcut.key.charAt(0).toUpperCase() + shortcut.key.slice(1);

  parts.push(keyDisplay);

  return parts.join(' + ');
}
