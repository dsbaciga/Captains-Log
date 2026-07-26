import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';

/**
 * Open a Manager's create form when the URL carries `?action=new`.
 *
 * The mobile capture sheet navigates straight to a trip tab with this param so
 * "Log → Journal entry" lands in the editor rather than on a list the user then
 * has to find an Add button on. The param is cleared as soon as it is consumed
 * so a refresh or back-navigation does not reopen the form.
 *
 * @param openCreateForm - Manager callback that opens its blank create form.
 * @param options.enabled - Gate for tab-scoped Managers: pass `false` while the
 *   Manager's tab is not visible so an inactive tab does not swallow the param.
 *   Defaults to `true`.
 *
 * @example
 * ```typescript
 * useCreateFromUrlParam(openCreateForm);
 * ```
 */
export function useCreateFromUrlParam(
  openCreateForm: () => void,
  options: { enabled?: boolean } = {}
): void {
  const { enabled = true } = options;
  const [searchParams, setSearchParams] = useSearchParams();

  // The Manager's callback identity changes between renders in several
  // Managers; holding it in a ref keeps that from re-running the effect and
  // reopening the form.
  const openRef = useRef(openCreateForm);
  openRef.current = openCreateForm;

  useEffect(() => {
    if (!enabled || searchParams.get('action') !== 'new') return;

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('action');
        return next;
      },
      { replace: true }
    );

    openRef.current();
  }, [enabled, searchParams, setSearchParams]);
}
