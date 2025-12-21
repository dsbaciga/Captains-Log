import { useState, useCallback } from 'react';
import ConfirmDialog, { ConfirmDialogProps } from '../components/ConfirmDialog';

type ConfirmOptions = Omit<ConfirmDialogProps, 'isOpen' | 'onClose' | 'onConfirm' | 'isLoading'>;

interface UseConfirmDialogReturn {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  ConfirmDialogComponent: React.FC;
}

/**
 * Hook for showing confirmation dialogs
 *
 * Usage:
 * ```tsx
 * const { confirm, ConfirmDialogComponent } = useConfirmDialog();
 *
 * const handleDelete = async () => {
 *   const confirmed = await confirm({
 *     title: 'Delete Item',
 *     message: 'Are you sure you want to delete this item?',
 *     confirmLabel: 'Delete',
 *     variant: 'danger'
 *   });
 *
 *   if (confirmed) {
 *     // Perform delete
 *   }
 * };
 *
 * return (
 *   <>
 *     <button onClick={handleDelete}>Delete</button>
 *     <ConfirmDialogComponent />
 *   </>
 * );
 * ```
 */
export function useConfirmDialog(): UseConfirmDialogReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolveRef, setResolveRef] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions(opts);
      setIsOpen(true);
      setResolveRef(() => resolve);
    });
  }, []);

  const handleClose = useCallback(() => {
    if (isLoading) return;
    setIsOpen(false);
    resolveRef?.(false);
    setResolveRef(null);
    setOptions(null);
  }, [isLoading, resolveRef]);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    resolveRef?.(true);
    setResolveRef(null);
    setOptions(null);
  }, [resolveRef]);

  const ConfirmDialogComponent: React.FC = useCallback(() => {
    if (!options) return null;

    return (
      <ConfirmDialog
        isOpen={isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        isLoading={isLoading}
        {...options}
      />
    );
  }, [isOpen, isLoading, options, handleClose, handleConfirm]);

  return {
    confirm,
    ConfirmDialogComponent,
  };
}

/**
 * Simpler hook that returns just the confirm function
 * Use with ConfirmDialogProvider for a global dialog
 */
export function useConfirmDialogWithLoading(): UseConfirmDialogReturn & { setLoading: (loading: boolean) => void } {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolveRef, setResolveRef] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions(opts);
      setIsOpen(true);
      setIsLoading(false);
      setResolveRef(() => resolve);
    });
  }, []);

  const handleClose = useCallback(() => {
    if (isLoading) return;
    setIsOpen(false);
    resolveRef?.(false);
    setResolveRef(null);
    setOptions(null);
    setIsLoading(false);
  }, [isLoading, resolveRef]);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    resolveRef?.(true);
    setResolveRef(null);
    setOptions(null);
    setIsLoading(false);
  }, [resolveRef]);

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  const ConfirmDialogComponent: React.FC = useCallback(() => {
    if (!options) return null;

    return (
      <ConfirmDialog
        isOpen={isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        isLoading={isLoading}
        {...options}
      />
    );
  }, [isOpen, isLoading, options, handleClose, handleConfirm]);

  return {
    confirm,
    ConfirmDialogComponent,
    setLoading,
  };
}
