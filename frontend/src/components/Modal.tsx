import { useEffect, useCallback, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from './icons';

export interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Modal title */
  title: string;
  /** Optional icon (emoji or component) to show next to title */
  icon?: ReactNode;
  /** Modal content */
  children: ReactNode;
  /** Optional footer content (buttons, etc.) */
  footer?: ReactNode;
  /** Maximum width of the modal */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl';
  /** Whether to show the close button in header */
  showCloseButton?: boolean;
  /** Additional class names for the modal container */
  className?: string;
  /** Whether clicking the backdrop closes the modal */
  closeOnBackdropClick?: boolean;
  /** Whether pressing Escape closes the modal */
  closeOnEscape?: boolean;
  /** Z-index for the modal (default: 50) */
  zIndex?: number;
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  '6xl': 'max-w-6xl',
};

/**
 * Reusable modal component with consistent styling, keyboard handling, and accessibility
 * 
 * @example
 * ```tsx
 * <Modal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   title="Edit Item"
 *   icon="✏️"
 *   footer={
 *     <div className="flex gap-2">
 *       <button onClick={handleSave} className="btn btn-primary">Save</button>
 *       <button onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
 *     </div>
 *   }
 * >
 *   <form>...</form>
 * </Modal>
 * ```
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  icon,
  children,
  footer,
  maxWidth = '4xl',
  showCloseButton = true,
  className = '',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  zIndex = 50,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        onClose();
      }
    },
    [onClose, closeOnEscape]
  );

  // Focus modal when it first opens (only on isOpen change)
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure modal is rendered
      const timeoutId = setTimeout(() => {
        modalRef.current?.focus();
      }, 0);

      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

  // Handle keyboard events
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className={`fixed inset-0 flex items-center justify-center p-4`}
      style={{ zIndex }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity"
        onClick={closeOnBackdropClick ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`relative bg-white dark:bg-navy-800 rounded-xl shadow-2xl ${maxWidthClasses[maxWidth]} w-full max-h-[90vh] overflow-hidden flex flex-col ${className}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gold/20 flex-shrink-0">
          <h2
            id="modal-title"
            className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"
          >
            {icon && <span>{icon}</span>}
            {title}
          </h2>
          {showCloseButton && (
            <button
              onClick={onClose}
              type="button"
              aria-label="Close modal"
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gold transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-navy-700"
            >
              <CloseIcon className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gold/20 flex-shrink-0 bg-gray-50 dark:bg-navy-800/50">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

/**
 * Simple modal for displaying content without header/footer
 */
Modal.Simple = function SimpleModal({
  isOpen,
  onClose,
  children,
  maxWidth = 'md',
  className = '',
}: Pick<ModalProps, 'isOpen' | 'onClose' | 'children' | 'maxWidth' | 'className'>) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative bg-white dark:bg-navy-800 rounded-xl shadow-2xl ${maxWidthClasses[maxWidth]} w-full max-h-[90vh] overflow-auto ${className}`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

