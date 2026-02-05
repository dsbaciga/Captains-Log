import { useState, useEffect, useMemo } from 'react';

export interface IOSDetectionResult {
  /** Whether the device is running iOS (iPhone, iPad, iPod) */
  isIOS: boolean;
  /** Whether the browser is Safari (not Chrome/Firefox on iOS) */
  isSafari: boolean;
  /** Whether the app is running as an installed PWA (standalone mode) */
  isStandalone: boolean;
  /** Whether the device is an iPad (including iPadOS 13+ which reports as Mac) */
  isIPad: boolean;
  /** iOS version number if applicable, null otherwise */
  iosVersion: number | null;
  /** Whether the device supports PWA installation */
  canInstallPWA: boolean;
  /** Whether the device is running iPadOS 13+ (reports as Mac) */
  isIPadOS: boolean;
}

/**
 * Detects iOS device, Safari browser, and standalone PWA mode.
 *
 * Handles edge cases including:
 * - iPadOS 13+ reporting as Mac
 * - Chrome/Firefox on iOS (WebKit-based but not Safari)
 * - Standalone mode detection
 * - iOS version parsing
 *
 * Prefers feature detection over user agent sniffing where possible.
 *
 * @example
 * ```tsx
 * const {
 *   isIOS,
 *   isSafari,
 *   isStandalone,
 *   iosVersion,
 *   canInstallPWA,
 * } = useIOSDetection();
 *
 * // Show install prompt only on iOS Safari when not installed
 * if (isIOS && isSafari && !isStandalone) {
 *   return <IOSInstallPrompt />;
 * }
 * ```
 */
export function useIOSDetection(): IOSDetectionResult {
  const [isStandalone, setIsStandalone] = useState(false);

  // Memoize detection results that don't change
  const detectionResult = useMemo(() => {
    // Avoid running on server
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return {
        isIOS: false,
        isSafari: false,
        isIPad: false,
        iosVersion: null,
        isIPadOS: false,
      };
    }

    const ua = navigator.userAgent;

    // Detect iOS devices (iPhone, iPad, iPod)
    // Note: iPadOS 13+ with "Request Desktop Website" reports as Mac
    const isIOSByUA = /iPad|iPhone|iPod/.test(ua);

    // Detect iPadOS 13+ which reports as macOS
    // Check for touch capability + Mac platform (iPadOS masquerades as Mac)
    const isIPadOS = detectIPadOS();

    // Combined iOS detection
    const isIOS = isIOSByUA || isIPadOS;

    // Detect iPad specifically
    const isIPad = /iPad/.test(ua) || isIPadOS;

    // Detect Safari browser
    // Safari includes "Safari" but excludes Chrome, Firefox, etc.
    // On iOS, all browsers use WebKit, but we want to identify Safari specifically
    const isSafari = detectSafari(ua);

    // Parse iOS version
    const iosVersion = parseIOSVersion(ua, isIPadOS);

    return {
      isIOS,
      isSafari,
      isIPad,
      iosVersion,
      isIPadOS,
    };
  }, []);

  // Detect standalone mode (PWA installed)
  // This uses matchMedia which can change, so we track it in state
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check multiple methods for standalone detection
    const checkStandalone = () => {
      // iOS Safari standalone mode
      const iosStandalone = 'standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true;

      // Standard display-mode: standalone
      const displayModeStandalone = window.matchMedia('(display-mode: standalone)').matches;

      // Fullscreen mode (some PWAs use this)
      const fullscreenMode = window.matchMedia('(display-mode: fullscreen)').matches;

      return iosStandalone || displayModeStandalone || fullscreenMode;
    };

    setIsStandalone(checkStandalone());

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = () => setIsStandalone(checkStandalone());

    // Modern browsers use addEventListener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    // Older Safari uses addListener (deprecated but needed for compatibility)
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  // Determine if PWA can be installed
  // On iOS, this is only possible via Safari (not other browsers)
  const canInstallPWA = detectionResult.isIOS
    ? detectionResult.isSafari && !isStandalone
    : !isStandalone; // On other platforms, beforeinstallprompt handles this

  return {
    ...detectionResult,
    isStandalone,
    canInstallPWA,
  };
}

/**
 * Detect iPadOS 13+ which reports as macOS.
 *
 * iPadOS 13+ with "Request Desktop Website" enabled (default for many sites)
 * reports as a Mac. We detect this by checking for touch support on a Mac platform.
 */
function detectIPadOS(): boolean {
  if (typeof navigator === 'undefined') return false;

  const platform = navigator.platform || '';
  const maxTouchPoints = navigator.maxTouchPoints || 0;

  // iPadOS reports as MacIntel but has touch support
  // Real Macs have maxTouchPoints = 0 or undefined
  const isMacPlatform = /MacIntel|Macintosh/.test(platform);
  const hasTouch = maxTouchPoints > 0;

  // Additional check: real Macs typically don't have touch events
  const hasTouchEvent = 'ontouchend' in document;

  return isMacPlatform && (hasTouch || hasTouchEvent);
}

/**
 * Detect if the browser is Safari.
 *
 * This is tricky because:
 * - On iOS, all browsers use WebKit and include "Safari" in UA
 * - Chrome on iOS includes "CriOS"
 * - Firefox on iOS includes "FxiOS"
 * - Edge on iOS includes "EdgiOS"
 * - Opera on iOS includes "OPiOS"
 *
 * For our purposes, we want to identify Safari specifically because
 * only Safari supports "Add to Home Screen" on iOS.
 */
function detectSafari(ua: string): boolean {
  // Must include Safari
  if (!ua.includes('Safari')) return false;

  // Exclude Chrome-based browsers
  if (ua.includes('Chrome') || ua.includes('CriOS')) return false;

  // Exclude Firefox
  if (ua.includes('Firefox') || ua.includes('FxiOS')) return false;

  // Exclude Edge
  if (ua.includes('Edg') || ua.includes('EdgiOS')) return false;

  // Exclude Opera
  if (ua.includes('Opera') || ua.includes('OPR') || ua.includes('OPiOS')) return false;

  // Exclude Samsung Browser
  if (ua.includes('SamsungBrowser')) return false;

  // Exclude DuckDuckGo browser
  if (ua.includes('DuckDuckGo')) return false;

  // If we get here, it's likely Safari
  return true;
}

/**
 * Parse iOS version from user agent string.
 *
 * Returns the major version number (e.g., 15 for iOS 15.4.1)
 * or null if not iOS or version cannot be determined.
 */
function parseIOSVersion(ua: string, isIPadOS: boolean): number | null {
  // Standard iOS version format: "OS 15_4_1" or "OS 15_4"
  const iosMatch = ua.match(/OS (\d+)[._](\d+)?[._]?(\d+)?/);
  if (iosMatch) {
    return parseInt(iosMatch[1], 10);
  }

  // For iPadOS masquerading as Mac, try to extract version from "Version/X.Y"
  if (isIPadOS) {
    const versionMatch = ua.match(/Version\/(\d+)/);
    if (versionMatch) {
      return parseInt(versionMatch[1], 10);
    }
  }

  return null;
}

export default useIOSDetection;
