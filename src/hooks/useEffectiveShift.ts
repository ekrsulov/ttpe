import { useCanvasStore } from '../store/canvasStore';

/**
 * Hook to get the effective shift state (physical shift key OR virtual shift button)
 * Use this instead of directly checking e.shiftKey to support virtual shift for mobile/touch devices
 */
export const useEffectiveShift = (physicalShiftKey: boolean): boolean => {
  const isVirtualShiftActive = useCanvasStore(state => state.isVirtualShiftActive);
  return physicalShiftKey || isVirtualShiftActive;
};
