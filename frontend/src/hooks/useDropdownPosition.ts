import { useState, useCallback, useRef, useEffect } from 'react';

interface DropdownPosition {
  /** Whether the dropdown should open upward instead of downward */
  openUpward: boolean;
  /** Whether the dropdown should align to the right edge instead of left */
  alignRight: boolean;
  /** Whether the dropdown should align to the left edge instead of right */
  alignLeft: boolean;
  /** Calculated max height to prevent viewport overflow */
  maxHeight?: number;
}

interface UseDropdownPositionOptions {
  /** Estimated height of the dropdown content (default: 300) */
  dropdownHeight?: number;
  /** Estimated width of the dropdown content (default: 200) */
  dropdownWidth?: number;
  /** Minimum space to maintain from viewport edges (default: 16) */
  viewportPadding?: number;
  /** Whether the dropdown is currently open */
  isOpen: boolean;
}

/**
 * Hook to calculate optimal dropdown position to avoid viewport overflow.
 *
 * @example
 * ```tsx
 * const { triggerRef, position, recalculate } = useDropdownPosition({
 *   isOpen: showDropdown,
 *   dropdownHeight: 200,
 *   dropdownWidth: 192, // w-48 = 12rem = 192px
 * });
 *
 * return (
 *   <div ref={triggerRef}>
 *     <button onClick={() => setShowDropdown(!showDropdown)}>Menu</button>
 *     {showDropdown && (
 *       <div className={`absolute ${position.openUpward ? 'bottom-full mb-2' : 'top-full mt-2'} ${position.alignRight ? 'right-0' : 'left-0'}`}>
 *         Dropdown content
 *       </div>
 *     )}
 *   </div>
 * );
 * ```
 */
export function useDropdownPosition<T extends HTMLElement = HTMLDivElement>({
  dropdownHeight = 300,
  dropdownWidth = 200,
  viewportPadding = 16,
  isOpen,
}: UseDropdownPositionOptions) {
  const triggerRef = useRef<T>(null);
  const [position, setPosition] = useState<DropdownPosition>({
    openUpward: false,
    alignRight: false,
    alignLeft: false,
  });

  const recalculate = useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Calculate space available in each direction
    const spaceBelow = viewportHeight - rect.bottom - viewportPadding;
    const spaceAbove = rect.top - viewportPadding;
    const spaceRight = viewportWidth - rect.left - viewportPadding;
    const spaceLeft = rect.right - viewportPadding;

    // Determine vertical position
    const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

    // Determine horizontal position
    // If there's not enough space to the right, align to right edge
    const alignRight = spaceRight < dropdownWidth && spaceLeft >= dropdownWidth;
    // If there's not enough space to the left (for right-aligned dropdowns), align to left
    const alignLeft = spaceLeft < dropdownWidth && spaceRight >= dropdownWidth;

    // Calculate max height to prevent overflow
    const availableHeight = openUpward ? spaceAbove : spaceBelow;
    const maxHeight = Math.min(dropdownHeight, availableHeight - viewportPadding);

    setPosition({
      openUpward,
      alignRight,
      alignLeft,
      maxHeight: maxHeight > 100 ? maxHeight : undefined, // Only set if reasonable
    });
  }, [dropdownHeight, dropdownWidth, viewportPadding]);

  // Recalculate when dropdown opens
  useEffect(() => {
    if (isOpen) {
      recalculate();
    }
  }, [isOpen, recalculate]);

  // Recalculate on window resize
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => recalculate();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [isOpen, recalculate]);

  return {
    triggerRef,
    position,
    recalculate,
  };
}

/**
 * Get CSS classes for dropdown positioning based on position state.
 *
 * @example
 * ```tsx
 * const positionClasses = getDropdownPositionClasses(position);
 * // Returns something like "top-full mt-2 left-0" or "bottom-full mb-2 right-0"
 * ```
 */
export function getDropdownPositionClasses(
  position: DropdownPosition,
  options?: {
    /** Custom margin for top position (default: 'mt-2') */
    marginTop?: string;
    /** Custom margin for bottom position (default: 'mb-2') */
    marginBottom?: string;
  }
): string {
  const { marginTop = 'mt-2', marginBottom = 'mb-2' } = options || {};

  const verticalClass = position.openUpward
    ? `bottom-full ${marginBottom}`
    : `top-full ${marginTop}`;

  let horizontalClass = 'left-0';
  if (position.alignRight) {
    horizontalClass = 'right-0';
  } else if (position.alignLeft) {
    horizontalClass = 'left-0';
  }

  return `${verticalClass} ${horizontalClass}`;
}

export default useDropdownPosition;
