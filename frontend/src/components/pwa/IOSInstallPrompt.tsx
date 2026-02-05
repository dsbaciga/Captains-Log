import { useState, useEffect, useCallback } from 'react';
import { useIOSDetection } from '../../hooks/useIOSDetection';

const DISMISSAL_KEY = 'ios-install-dismissed';
const DISMISSAL_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export interface IOSInstallPromptProps {
  /** Custom class name */
  className?: string;
  /** Delay before showing the prompt (ms) */
  delay?: number;
  /** Callback when prompt is dismissed */
  onDismiss?: () => void;
  /** Callback when user indicates they installed */
  onInstalled?: () => void;
}

/**
 * IOSInstallPrompt displays installation instructions for iOS Safari users.
 *
 * iOS does not support the `beforeinstallprompt` event, so we need to provide
 * manual instructions for adding the app to the home screen.
 *
 * Features:
 * - Only shows on iOS Safari when not already installed
 * - Shows visual instructions with Safari Share icon
 * - Dismissible with 7-day memory
 * - Smooth slide-up animation
 * - Respects reduced motion preferences
 * - Safe area inset support for iPhone notch
 *
 * @example
 * ```tsx
 * // Add to App.tsx or Layout component
 * <IOSInstallPrompt />
 *
 * // With callbacks
 * <IOSInstallPrompt
 *   onDismiss={() => analytics.track('ios_install_dismissed')}
 *   onInstalled={() => analytics.track('ios_install_confirmed')}
 * />
 * ```
 */
export default function IOSInstallPrompt({
  className = '',
  delay = 3000,
  onDismiss,
  onInstalled,
}: IOSInstallPromptProps) {
  const { isIOS, isSafari, isStandalone } = useIOSDetection();
  const [show, setShow] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Check if we should show the prompt
  useEffect(() => {
    // Only show on iOS Safari when not installed
    if (!isIOS || !isSafari || isStandalone) {
      return;
    }

    // Check if previously dismissed
    const dismissedAt = localStorage.getItem(DISMISSAL_KEY);
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      if (Date.now() - dismissedTime < DISMISSAL_DURATION) {
        // Still within dismissal period
        return;
      }
    }

    // Show after delay
    const timer = setTimeout(() => {
      setShow(true);
      // Trigger animation after render
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [isIOS, isSafari, isStandalone, delay]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    // Wait for animation before unmounting
    setTimeout(() => {
      localStorage.setItem(DISMISSAL_KEY, Date.now().toString());
      setShow(false);
      onDismiss?.();
    }, 300);
  }, [onDismiss]);

  const handleInstalled = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      // Mark as permanently dismissed since they installed
      localStorage.setItem(DISMISSAL_KEY, (Date.now() + 365 * 24 * 60 * 60 * 1000).toString());
      setShow(false);
      onInstalled?.();
    }, 300);
  }, [onInstalled]);

  if (!show) return null;

  return (
    <div
      className={`
        fixed bottom-0 left-0 right-0 z-50
        transition-transform duration-300 ease-out motion-reduce:transition-none
        ${isVisible ? 'translate-y-0' : 'translate-y-full'}
        ${className}
      `}
      role="dialog"
      aria-modal="false"
      aria-labelledby="ios-install-title"
    >
      {/* Backdrop gradient */}
      <div
        className={`
          absolute inset-0 -top-20 pointer-events-none
          bg-gradient-to-t from-black/30 to-transparent
          transition-opacity duration-300
          ${isVisible ? 'opacity-100' : 'opacity-0'}
        `}
        aria-hidden="true"
      />

      {/* Content card */}
      <div
        className="
          relative bg-white dark:bg-navy-800
          border-t border-navy-200 dark:border-navy-600
          rounded-t-2xl shadow-xl
          p-4 pb-safe
        "
      >
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="
            absolute top-3 right-3
            p-2 rounded-full
            text-slate dark:text-warm-gray/70
            hover:bg-navy-100 dark:hover:bg-navy-700
            transition-colors
          "
          aria-label="Dismiss install prompt"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* App icon and title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="
            w-12 h-12 rounded-xl
            bg-gradient-to-br from-primary-500 to-primary-600
            dark:from-accent-400 dark:to-accent-600
            flex items-center justify-center
            shadow-md
          ">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h3
              id="ios-install-title"
              className="font-display font-semibold text-lg text-charcoal dark:text-warm-gray"
            >
              Install Travel Life
            </h3>
            <p className="text-sm text-slate dark:text-warm-gray/70">
              Add to your home screen for the best experience
            </p>
          </div>
        </div>

        {/* Instructions */}
        <ol className="space-y-3 mb-5">
          <li className="flex items-center gap-3">
            <span className="
              flex-shrink-0 w-7 h-7 rounded-full
              bg-navy-100 dark:bg-navy-700
              flex items-center justify-center
              text-sm font-medium text-charcoal dark:text-warm-gray
            ">
              1
            </span>
            <span className="flex items-center gap-2 text-sm text-charcoal dark:text-warm-gray">
              Tap the
              <ShareIcon className="w-5 h-5 text-[#007AFF]" />
              <span className="font-medium">Share</span>
              button below
            </span>
          </li>

          <li className="flex items-center gap-3">
            <span className="
              flex-shrink-0 w-7 h-7 rounded-full
              bg-navy-100 dark:bg-navy-700
              flex items-center justify-center
              text-sm font-medium text-charcoal dark:text-warm-gray
            ">
              2
            </span>
            <span className="flex items-center gap-2 text-sm text-charcoal dark:text-warm-gray">
              Scroll down and tap
              <AddToHomeScreenIcon className="w-5 h-5 text-charcoal dark:text-warm-gray" />
              <span className="font-medium">Add to Home Screen</span>
            </span>
          </li>

          <li className="flex items-center gap-3">
            <span className="
              flex-shrink-0 w-7 h-7 rounded-full
              bg-navy-100 dark:bg-navy-700
              flex items-center justify-center
              text-sm font-medium text-charcoal dark:text-warm-gray
            ">
              3
            </span>
            <span className="text-sm text-charcoal dark:text-warm-gray">
              Tap <span className="font-medium">Add</span> to confirm
            </span>
          </li>
        </ol>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleDismiss}
            className="btn-secondary flex-1 py-2.5"
          >
            Maybe Later
          </button>
          <button
            onClick={handleInstalled}
            className="btn-primary flex-1 py-2.5"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Safari Share icon (square with arrow pointing up)
 */
function ShareIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
      />
    </svg>
  );
}

/**
 * iOS-style "Add to Home Screen" icon (square with plus)
 */
function AddToHomeScreenIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth={2} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m-4-4h8" />
    </svg>
  );
}
