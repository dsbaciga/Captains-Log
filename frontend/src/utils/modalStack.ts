/**
 * Shared registry of currently-open modals.
 *
 * Modals that each independently lock `document.body` scroll and listen for
 * Escape on `document` misbehave when nested: closing the inner modal restores
 * background scrolling while the outer one is still open, and a single Escape
 * press closes every open modal at once.
 *
 * This module reference-counts open modals so that:
 * - body scroll is locked on the first open modal and restored only when the
 *   last one closes (the original `overflow` value is preserved and restored)
 * - `isTopModal()` lets a modal ignore keyboard events while another modal is
 *   stacked above it, so only the topmost modal responds to Escape
 *
 * Usage (from a modal component):
 * ```ts
 * const idRef = useRef<number | null>(null);
 * useEffect(() => {
 *   if (!isOpen) return;
 *   const id = pushModal();
 *   idRef.current = id;
 *   return () => { popModal(id); idRef.current = null; };
 * }, [isOpen]);
 * // in the keydown handler: if (!isTopModal(idRef.current)) return;
 * ```
 */

let nextModalId = 1;
const stack: number[] = [];
let previousBodyOverflow = '';

/**
 * Register a modal as open, locking body scroll if it is the first one.
 * @returns The id to pass to `popModal` / `isTopModal`.
 */
export function pushModal(): number {
  const id = nextModalId++;

  if (stack.length === 0) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  stack.push(id);
  return id;
}

/**
 * Unregister a modal. Body scroll is restored only when the last open modal
 * is removed. Safe to call with an unknown/already-removed id.
 */
export function popModal(id: number | null): void {
  if (id === null) return;

  const index = stack.lastIndexOf(id);
  if (index === -1) return;
  stack.splice(index, 1);

  if (stack.length === 0) {
    document.body.style.overflow = previousBodyOverflow;
    previousBodyOverflow = '';
  }
}

/**
 * Whether the given modal is the topmost open modal. Returns false for a null
 * id (modal not registered yet) so callers can guard without extra checks.
 */
export function isTopModal(id: number | null): boolean {
  if (id === null) return false;
  return stack.length > 0 && stack[stack.length - 1] === id;
}

/** Number of currently open modals. Exposed for tests and debugging. */
export function getOpenModalCount(): number {
  return stack.length;
}
