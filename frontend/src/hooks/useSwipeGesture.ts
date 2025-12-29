/**
 * useSwipeGesture Hook
 *
 * Detects swipe gestures on touch devices
 * Supports left, right, up, down swipes with configurable thresholds
 */

import { useRef, TouchEvent as ReactTouchEvent } from 'react';

interface SwipeCallbacks {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

interface SwipeOptions {
  minSwipeDistance?: number; // Minimum distance in pixels for a swipe
  maxSwipeTime?: number; // Maximum time in ms for a swipe
  preventDefaultTouchmoveEvent?: boolean;
}

export function useSwipeGesture(
  callbacks: SwipeCallbacks,
  options: SwipeOptions = {}
) {
  const {
    minSwipeDistance = 50,
    maxSwipeTime = 300,
  } = options;

  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);

  const handleTouchStart = (e: TouchEvent | ReactTouchEvent) => {
    const touch = 'touches' in e ? e.touches[0] : e.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  };

  const handleTouchEnd = (e: TouchEvent | ReactTouchEvent) => {
    if (!touchStart.current) return;

    const touch = 'changedTouches' in e ? e.changedTouches[0] : e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    const deltaTime = Date.now() - touchStart.current.time;

    // Reset touch start
    touchStart.current = null;

    // Check if swipe was fast enough
    if (deltaTime > maxSwipeTime) return;

    // Determine swipe direction based on larger delta
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Horizontal swipe
    if (absX > absY && absX > minSwipeDistance) {
      if (deltaX > 0) {
        callbacks.onSwipeRight?.();
      } else {
        callbacks.onSwipeLeft?.();
      }
    }
    // Vertical swipe
    else if (absY > absX && absY > minSwipeDistance) {
      if (deltaY > 0) {
        callbacks.onSwipeDown?.();
      } else {
        callbacks.onSwipeUp?.();
      }
    }
  };

  // handleTouchMove is unused but kept for future use
  // const handleTouchMove = (e: TouchEvent) => {
  // };

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
  };
}

/**
 * useSwipeToDelete Hook
 *
 * Provides swipe-to-delete functionality with visual feedback
 */
interface SwipeToDeleteOptions {
  onDelete: () => void;
  threshold?: number;
}

export function useSwipeToDelete(options: SwipeToDeleteOptions) {
  const { onDelete, threshold = 100 } = options;
  const swipeDistance = useRef(0);
  const isDragging = useRef(false);
  const startX = useRef(0);

  const handleTouchStart = (e: ReactTouchEvent) => {
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const handleTouchMove = (e: ReactTouchEvent) => {
    if (!isDragging.current) return;

    const currentX = e.touches[0].clientX;
    const delta = startX.current - currentX;

    // Only allow left swipe (positive delta)
    if (delta > 0) {
      swipeDistance.current = Math.min(delta, threshold * 1.5);
    }
  };

  const handleTouchEnd = () => {
    if (swipeDistance.current >= threshold) {
      onDelete();
    }

    // Reset
    swipeDistance.current = 0;
    isDragging.current = false;
  };

  return {
    swipeHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    swipeDistance: swipeDistance.current,
    isDragging: isDragging.current,
  };
}
