import { useEffect, useCallback, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl" | "6xl";
  formId?: string; // Optional form ID for Ctrl+S keyboard shortcut
}

/**
 * Reusable modal component for forms
 * Provides consistent styling, keyboard handling, and accessibility
 */
export default function FormModal({
  isOpen,
  onClose,
  title,
  icon,
  children,
  footer,
  maxWidth = "4xl",
  formId,
}: FormModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const hasFocusedRef = useRef(false);

  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "4xl": "max-w-4xl",
    "6xl": "max-w-6xl",
  };

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
      // Ctrl+S or Cmd+S to save form
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault(); // Prevent browser's save dialog
        if (formId) {
          const form = document.getElementById(formId) as HTMLFormElement;
          if (form) {
            form.requestSubmit(); // Use requestSubmit instead of submit() to trigger validation
          }
        }
      }
    },
    [onClose, formId]
  );

  // Handle modal opening/closing and body scroll
  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";

      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "";
      };
    }
  }, [isOpen, handleKeyDown]);

  // Handle initial focus - separate effect to avoid re-running on handleKeyDown changes
  useEffect(() => {
    if (isOpen && !hasFocusedRef.current) {
      // Focus the first focusable element in the modal (input, textarea, button)
      // This provides better UX than focusing the modal container itself
      setTimeout(() => {
        const firstInput = modalRef.current?.querySelector<HTMLElement>(
          'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])'
        );
        firstInput?.focus();
        hasFocusedRef.current = true;
      }, 0);
    } else if (!isOpen) {
      // Reset the flag when modal closes
      hasFocusedRef.current = false;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="form-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className={`relative bg-white dark:bg-navy-800 rounded-xl shadow-2xl ${maxWidthClasses[maxWidth]} w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gold/20 flex-shrink-0">
          <h2
            id="form-modal-title"
            className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"
          >
            {icon && <span>{icon}</span>}
            {title}
          </h2>
          <button
            onClick={onClose}
            type="button"
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gold transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-navy-700"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex flex-wrap justify-center sm:justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t border-gray-200 dark:border-gold/20 flex-shrink-0 bg-gray-50 dark:bg-navy-800/50">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

