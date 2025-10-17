/**
 * DOM Helper Utilities
 * 
 * Shared utilities for DOM manipulation and querying
 */

/**
 * Check if a text input field is currently focused
 * Used to prevent keyboard shortcuts from triggering while user is typing
 * 
 * @returns true if a text input/textarea is focused
 */
export function isTextFieldFocused(): boolean {
  const activeElement = document.activeElement;
  if (!activeElement) return false;

  const tagName = activeElement.tagName.toLowerCase();
  const isContentEditable = activeElement.getAttribute('contenteditable') === 'true';

  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    isContentEditable
  );
}
