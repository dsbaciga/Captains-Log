import { type ReactNode } from "react";
import Modal from "./Modal";

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
 * Modal component optimized for forms.
 * This is a thin wrapper around Modal with form-specific defaults:
 * - Focuses the first input element on open
 * - Supports Ctrl+S/Cmd+S keyboard shortcut to submit (when formId provided)
 * - Shows entrance animation
 *
 * For non-form modals, use Modal directly.
 *
 * @example
 * ```tsx
 * <FormModal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   title="Edit Item"
 *   icon="✏️"
 *   formId="my-form"
 *   footer={
 *     <>
 *       <button type="button" onClick={onClose}>Cancel</button>
 *       <button type="submit" form="my-form">Save</button>
 *     </>
 *   }
 * >
 *   <form id="my-form" onSubmit={handleSubmit}>...</form>
 * </FormModal>
 * ```
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
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      icon={icon}
      footer={footer}
      maxWidth={maxWidth}
      formId={formId}
      focusFirstInput={true}
      animate={true}
      closeOnBackdropClick={true}
      closeOnEscape={true}
    >
      {children}
    </Modal>
  );
}
