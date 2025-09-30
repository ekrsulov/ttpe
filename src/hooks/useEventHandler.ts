import { useCallback } from 'react';

/**
 * Generic hook for creating memoized event handlers
 * Helps reduce re-renders by memoizing callback functions
 */

/**
 * Creates a memoized event handler function
 * @param handler - The event handler function
 * @param dependencies - Dependencies array for useCallback
 * @returns Memoized event handler
 */
export const useEventHandler = <T extends (...args: unknown[]) => void>(
  handler: T,
  dependencies: React.DependencyList
): T => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(handler, dependencies);
};

/**
 * Creates a memoized click handler
 * @param onClick - Click handler function
 * @param dependencies - Dependencies array
 * @returns Memoized click handler
 */
export const useClickHandler = (
  onClick: () => void,
  dependencies: React.DependencyList = []
) => {
  return useEventHandler(onClick, dependencies);
};

/**
 * Creates a memoized pointer handler
 * @param onPointer - Pointer handler function
 * @param dependencies - Dependencies array
 * @returns Memoized pointer handler
 */
export const usePointerHandler = (
  onPointer: (e: PointerEvent) => void,
  dependencies: React.DependencyList = []
) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(onPointer, dependencies);
};

/**
 * Creates a memoized keyboard handler
 * @param onKey - Keyboard handler function
 * @param dependencies - Dependencies array
 * @returns Memoized keyboard handler
 */
export const useKeyboardHandler = (
  onKey: (e: KeyboardEvent) => void,
  dependencies: React.DependencyList = []
) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(onKey, dependencies);
};