import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Network connection type from navigator.connection
 */
export type ConnectionType =
  | 'slow-2g'
  | '2g'
  | '3g'
  | '4g'
  | 'wifi'
  | 'ethernet'
  | 'unknown';

/**
 * Network effective type from navigator.connection.effectiveType
 */
export type EffectiveType = 'slow-2g' | '2g' | '3g' | '4g';

/**
 * NetworkConnection interface extending Navigator with connection API
 * This API is not available in all browsers
 */
interface NetworkConnection {
  effectiveType?: EffectiveType;
  type?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
}

declare global {
  interface Navigator {
    connection?: NetworkConnection;
    mozConnection?: NetworkConnection;
    webkitConnection?: NetworkConnection;
  }
}

export interface NetworkStatus {
  /** Whether the browser reports being online */
  isOnline: boolean;
  /** Whether the connection is slow (2g or slow-2g) */
  isSlowConnection: boolean;
  /** The detected connection type */
  connectionType: ConnectionType;
  /** Effective connection type from Network Information API */
  effectiveType: EffectiveType | null;
  /** Estimated downlink speed in Mbps */
  downlink: number | null;
  /** Estimated round-trip time in ms */
  rtt: number | null;
  /** Whether data saver mode is enabled */
  saveData: boolean;
  /** Timestamp of last status change */
  lastChanged: Date;
}

export interface UseNetworkStatusOptions {
  /** Debounce delay for rapid online/offline flapping (default: 1000ms) */
  debounceMs?: number;
  /** Callback when network status changes */
  onStatusChange?: (status: NetworkStatus) => void;
}

/**
 * Hook for tracking network connectivity status
 *
 * Monitors online/offline state using navigator.onLine and online/offline events.
 * Also detects network quality using the Network Information API (where available).
 * Includes debouncing to prevent rapid status changes from network flapping.
 *
 * @example
 * ```tsx
 * const { isOnline, isSlowConnection, connectionType } = useNetworkStatus();
 *
 * if (!isOnline) {
 *   return <OfflineBanner />;
 * }
 *
 * if (isSlowConnection) {
 *   return <SlowConnectionWarning />;
 * }
 * ```
 */
export function useNetworkStatus(
  options: UseNetworkStatusOptions = {}
): NetworkStatus {
  const { debounceMs = 1000, onStatusChange } = options;

  const getConnection = useCallback((): NetworkConnection | undefined => {
    if (typeof navigator === 'undefined') return undefined;
    return navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  }, []);

  const getConnectionType = useCallback((): ConnectionType => {
    const connection = getConnection();
    if (!connection) return 'unknown';

    // Check effectiveType first (most reliable)
    if (connection.effectiveType) {
      return connection.effectiveType;
    }

    // Fall back to type if available
    if (connection.type) {
      switch (connection.type) {
        case 'wifi':
          return 'wifi';
        case 'ethernet':
          return 'ethernet';
        case 'cellular':
          return connection.effectiveType || '4g';
        default:
          return 'unknown';
      }
    }

    return 'unknown';
  }, [getConnection]);

  const isSlowConnection = useCallback((type: ConnectionType): boolean => {
    return type === 'slow-2g' || type === '2g';
  }, []);

  const buildStatus = useCallback((): NetworkStatus => {
    const connection = getConnection();
    const connectionType = getConnectionType();
    const effectiveType = connection?.effectiveType || null;

    return {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isSlowConnection: isSlowConnection(connectionType),
      connectionType,
      effectiveType,
      downlink: connection?.downlink ?? null,
      rtt: connection?.rtt ?? null,
      saveData: connection?.saveData ?? false,
      lastChanged: new Date(),
    };
  }, [getConnection, getConnectionType, isSlowConnection]);

  const [status, setStatus] = useState<NetworkStatus>(buildStatus);

  // Refs for debouncing
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingStatusRef = useRef<NetworkStatus | null>(null);

  // Debounced status update to prevent flapping
  const updateStatus = useCallback(
    (newStatus: NetworkStatus) => {
      // Clear any pending update
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      pendingStatusRef.current = newStatus;

      // If going offline, apply immediately (user needs to know right away)
      if (!newStatus.isOnline && status.isOnline) {
        setStatus(newStatus);
        onStatusChange?.(newStatus);
        pendingStatusRef.current = null;
        return;
      }

      // Debounce online transitions to prevent flapping
      debounceTimerRef.current = setTimeout(() => {
        if (pendingStatusRef.current) {
          setStatus(pendingStatusRef.current);
          onStatusChange?.(pendingStatusRef.current);
          pendingStatusRef.current = null;
        }
      }, debounceMs);
    },
    [debounceMs, onStatusChange, status.isOnline]
  );

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      updateStatus(buildStatus());
    };

    const handleOffline = () => {
      updateStatus(buildStatus());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [buildStatus, updateStatus]);

  // Handle Network Information API changes
  useEffect(() => {
    const connection = getConnection();
    if (!connection?.addEventListener) return;

    const handleConnectionChange = () => {
      updateStatus(buildStatus());
    };

    connection.addEventListener('change', handleConnectionChange);

    return () => {
      connection.removeEventListener?.('change', handleConnectionChange);
    };
  }, [buildStatus, getConnection, updateStatus]);

  return status;
}

export default useNetworkStatus;
