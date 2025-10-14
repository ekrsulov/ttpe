import { useCanvasStore } from '../store/canvasStore';

/**
 * Hook to get the effective shift state (physical shift key OR virtual shift button)
 * Use this instead of directly checking e.shiftKey to support virtual shift for mobile/touch devices
 * 
 * @param physicalShiftKey - The state of the physical shift key (from keyboard event)
 * @returns The effective shift state (physical OR virtual)
 * 
 * @example
 * ```ts
 * const effectiveShift = useEffectiveShift(e.shiftKey);
 * if (effectiveShift) {
 *   // Handle shift behavior
 * }
 * ```
 */
export const useEffectiveShift = (physicalShiftKey: boolean): boolean => {
  const isVirtualShiftActive = useCanvasStore(state => state.isVirtualShiftActive);
  return physicalShiftKey || isVirtualShiftActive;
};

/**
 * Utility function to get effective shift state without a hook
 * Useful in event handlers or callbacks where hooks can't be used
 * 
 * @param physicalShiftKey - The state of the physical shift key (from keyboard event)
 * @param isVirtualShiftActive - The virtual shift state from store
 * @returns The effective shift state (physical OR virtual)
 */
export const getEffectiveShift = (
  physicalShiftKey: boolean,
  isVirtualShiftActive: boolean
): boolean => {
  return physicalShiftKey || isVirtualShiftActive;
};
