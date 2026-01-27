/**
 * User event helpers for testing interactive components
 * Provides convenient wrappers around @testing-library/user-event
 */

import userEvent from '@testing-library/user-event';
import { screen, waitFor, within } from '@testing-library/react';

// ============================================================================
// User Event Setup
// ============================================================================

/**
 * Create a configured user event instance
 * Recommended for all tests to ensure realistic event simulation
 */
export function setupUserEvent() {
  return userEvent.setup({
    // Add a small delay between events to simulate real user behavior
    delay: null, // Set to null for faster tests, or a number for realistic delays
    // Automatically advance timers if using fake timers
    advanceTimers: (delay) => {
      // This works with vi.useFakeTimers()
      if (typeof jest !== 'undefined') {
        jest.advanceTimersByTime(delay);
      }
    },
  });
}

// ============================================================================
// Form Interaction Helpers
// ============================================================================

/**
 * Fill a text input by label
 */
export async function fillInputByLabel(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  value: string
): Promise<void> {
  const input = screen.getByLabelText(label);
  await user.clear(input);
  await user.type(input, value);
}

/**
 * Fill a text input by placeholder
 */
export async function fillInputByPlaceholder(
  user: ReturnType<typeof userEvent.setup>,
  placeholder: string,
  value: string
): Promise<void> {
  const input = screen.getByPlaceholderText(placeholder);
  await user.clear(input);
  await user.type(input, value);
}

/**
 * Fill a text input by test ID
 */
export async function fillInputByTestId(
  user: ReturnType<typeof userEvent.setup>,
  testId: string,
  value: string
): Promise<void> {
  const input = screen.getByTestId(testId);
  await user.clear(input);
  await user.type(input, value);
}

/**
 * Select an option from a dropdown by label
 */
export async function selectOptionByLabel(
  user: ReturnType<typeof userEvent.setup>,
  selectLabel: string,
  optionText: string
): Promise<void> {
  const select = screen.getByLabelText(selectLabel);
  await user.selectOptions(select, optionText);
}

/**
 * Select an option from a dropdown by value
 */
export async function selectOptionByValue(
  user: ReturnType<typeof userEvent.setup>,
  selectLabel: string,
  value: string
): Promise<void> {
  const select = screen.getByLabelText(selectLabel) as HTMLSelectElement;
  await user.selectOptions(select, value);
}

/**
 * Toggle a checkbox by label
 */
export async function toggleCheckbox(
  user: ReturnType<typeof userEvent.setup>,
  label: string
): Promise<void> {
  const checkbox = screen.getByLabelText(label);
  await user.click(checkbox);
}

/**
 * Fill a textarea by label
 */
export async function fillTextareaByLabel(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  value: string
): Promise<void> {
  const textarea = screen.getByLabelText(label);
  await user.clear(textarea);
  await user.type(textarea, value);
}

// ============================================================================
// Button Interaction Helpers
// ============================================================================

/**
 * Click a button by its text content
 */
export async function clickButton(
  user: ReturnType<typeof userEvent.setup>,
  buttonText: string
): Promise<void> {
  const button = screen.getByRole('button', { name: buttonText });
  await user.click(button);
}

/**
 * Click a button by test ID
 */
export async function clickButtonByTestId(
  user: ReturnType<typeof userEvent.setup>,
  testId: string
): Promise<void> {
  const button = screen.getByTestId(testId);
  await user.click(button);
}

/**
 * Click an element by its accessible name
 */
export async function clickByAccessibleName(
  user: ReturnType<typeof userEvent.setup>,
  name: string
): Promise<void> {
  const element = screen.getByRole('button', { name }) || screen.getByLabelText(name);
  await user.click(element);
}

// ============================================================================
// Modal & Dialog Helpers
// ============================================================================

/**
 * Wait for a modal to appear and return its container
 */
export async function waitForModal(
  titleText?: string
): Promise<HTMLElement> {
  return waitFor(() => {
    // Look for modal by role or common modal selectors
    const dialog = screen.getByRole('dialog') ||
                   screen.getByTestId('modal') ||
                   document.querySelector('[class*="modal"]');

    if (!dialog) {
      throw new Error('Modal not found');
    }

    if (titleText) {
      expect(within(dialog as HTMLElement).getByText(titleText)).toBeInTheDocument();
    }

    return dialog as HTMLElement;
  });
}

/**
 * Close a modal by clicking the close button or backdrop
 */
export async function closeModal(
  user: ReturnType<typeof userEvent.setup>
): Promise<void> {
  // Try common close button patterns
  const closeButton =
    screen.queryByRole('button', { name: /close/i }) ||
    screen.queryByRole('button', { name: /cancel/i }) ||
    screen.queryByLabelText(/close/i) ||
    document.querySelector('[class*="close"]');

  if (closeButton) {
    await user.click(closeButton);
  }
}

/**
 * Confirm a dialog by clicking the confirm/ok/yes button
 */
export async function confirmDialog(
  user: ReturnType<typeof userEvent.setup>,
  confirmText = /confirm|ok|yes|delete|save/i
): Promise<void> {
  const confirmButton = screen.getByRole('button', { name: confirmText });
  await user.click(confirmButton);
}

/**
 * Cancel a dialog by clicking the cancel/no button
 */
export async function cancelDialog(
  user: ReturnType<typeof userEvent.setup>
): Promise<void> {
  const cancelButton = screen.getByRole('button', { name: /cancel|no|close/i });
  await user.click(cancelButton);
}

// ============================================================================
// Form Submission Helpers
// ============================================================================

/**
 * Submit a form by clicking the submit button
 */
export async function submitForm(
  user: ReturnType<typeof userEvent.setup>,
  submitButtonText: string | RegExp = /submit|save|add|create|update/i
): Promise<void> {
  const submitButton = screen.getByRole('button', { name: submitButtonText });
  await user.click(submitButton);
}

/**
 * Submit a form by pressing Enter in an input
 */
export async function submitFormByEnter(
  user: ReturnType<typeof userEvent.setup>,
  inputLabel: string
): Promise<void> {
  const input = screen.getByLabelText(inputLabel);
  await user.type(input, '{enter}');
}

// ============================================================================
// Complex Interaction Patterns
// ============================================================================

/**
 * Fill out a complete form with multiple fields
 */
export async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  fields: Record<string, { type: 'input' | 'select' | 'textarea' | 'checkbox'; value: string | boolean }>
): Promise<void> {
  for (const [label, config] of Object.entries(fields)) {
    switch (config.type) {
      case 'input':
        await fillInputByLabel(user, label, config.value as string);
        break;
      case 'select':
        await selectOptionByLabel(user, label, config.value as string);
        break;
      case 'textarea':
        await fillTextareaByLabel(user, label, config.value as string);
        break;
      case 'checkbox': {
        const checkbox = screen.getByLabelText(label) as HTMLInputElement;
        if (checkbox.checked !== config.value) {
          await user.click(checkbox);
        }
        break;
      }
    }
  }
}

/**
 * Perform a drag and drop operation
 */
export async function dragAndDrop(
  user: ReturnType<typeof userEvent.setup>,
  sourceTestId: string,
  targetTestId: string
): Promise<void> {
  const source = screen.getByTestId(sourceTestId);
  const target = screen.getByTestId(targetTestId);

  // Note: user-event doesn't support drag and drop natively
  // This is a simplified version that fires the events
  await user.pointer([
    { keys: '[MouseLeft>]', target: source },
    { target },
    { keys: '[/MouseLeft]' },
  ]);
}

/**
 * Simulate typing in a search input with debounce wait
 */
export async function typeInSearch(
  user: ReturnType<typeof userEvent.setup>,
  searchLabel: string,
  query: string,
  debounceMs = 300
): Promise<void> {
  const searchInput = screen.getByLabelText(searchLabel);
  await user.clear(searchInput);
  await user.type(searchInput, query);

  // Wait for debounce
  await new Promise((resolve) => setTimeout(resolve, debounceMs));
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Wait for an element to be removed from the DOM
 */
export async function waitForElementToBeRemoved(
  getElement: () => HTMLElement | null,
  timeout = 4500
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (getElement() === null) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  throw new Error('Element was not removed within timeout');
}

/**
 * Verify a toast message appeared
 */
export async function expectToast(
  messagePattern: string | RegExp
): Promise<void> {
  await waitFor(() => {
    const toast = screen.getByText(messagePattern);
    expect(toast).toBeInTheDocument();
  });
}

/**
 * Verify form validation error appears
 */
export async function expectValidationError(
  errorMessage: string | RegExp
): Promise<void> {
  await waitFor(() => {
    const error = screen.getByText(errorMessage);
    expect(error).toBeInTheDocument();
  });
}

// ============================================================================
// Export
// ============================================================================

export { userEvent };
