import { useEffect } from 'react';
import type { PluginHooksContext, PluginHandlerContext } from '../../../types/plugins';
import type { CanvasStore } from '../../../store/canvasStore';
import { useCanvasStore } from '../../../store/canvasStore';
import type { PathData } from '../../../types';
import { calculateBounds } from '../../../utils/boundsUtils';
import type { ElementDragModifier, ElementDragContext } from '../../../types/interaction';

/**
 * Result of applying guidelines during drag
 */
export interface GuidelinesDragResult {
  deltaX: number;
  deltaY: number;
  applied: boolean;
}

/**
 * Applies guidelines snapping during element drag.
 * This function calculates alignment, distance, and size guidelines
 * and applies sticky snap to the delta values.
 * 
 * @returns Modified delta values after applying snap
 */
export function applyGuidelinesDuringDrag(
  originalDeltaX: number,
  originalDeltaY: number,
  selectedIds: string[]
): GuidelinesDragResult {
  const state = useCanvasStore.getState();
  
  // Early exit if guidelines not enabled or no selection
  if (!state.guidelines?.enabled || selectedIds.length === 0) {
    return { deltaX: originalDeltaX, deltaY: originalDeltaY, applied: false };
  }

  let deltaX = originalDeltaX;
  let deltaY = originalDeltaY;

  // Calculate bounds for the first selected element (for simplicity, we use the first one for snapping)
  const firstElementId = selectedIds[0];
  const element = state.elements.find(el => el.id === firstElementId);

  if (!element || element.type !== 'path') {
    return { deltaX, deltaY, applied: false };
  }

  const pathData = element.data as PathData;

  // Calculate current bounds using consolidated utility
  const bounds = calculateBounds(pathData.subPaths, pathData.strokeWidth || 0, state.viewport.zoom);

  if (!isFinite(bounds.minX)) {
    return { deltaX, deltaY, applied: false };
  }

  // Apply the delta to get the "would-be" position
  const projectedBounds = {
    minX: bounds.minX + deltaX,
    minY: bounds.minY + deltaY,
    maxX: bounds.maxX + deltaX,
    maxY: bounds.maxY + deltaY,
  };

  // Find alignment guidelines
  const alignmentMatches = state.findAlignmentGuidelines?.(firstElementId, projectedBounds) ?? [];

  // Find distance guidelines if enabled (pass alignment matches for 2-element detection)
  const distanceMatches = (state.guidelines?.distanceEnabled && state.findDistanceGuidelines)
    ? state.findDistanceGuidelines(firstElementId, projectedBounds, alignmentMatches)
    : [];

  // Find size matches if enabled
  const sizeMatches = (state.guidelines?.sizeMatchingEnabled && state.findSizeMatches)
    ? state.findSizeMatches(firstElementId, projectedBounds)
    : [];

  // Update the guidelines state
  if (state.updateGuidelinesState) {
    state.updateGuidelinesState({
      currentMatches: alignmentMatches,
      currentDistanceMatches: distanceMatches,
      currentSizeMatches: sizeMatches,
    });
  }

  // Apply sticky snap
  if (state.checkStickySnap) {
    const snappedDelta = state.checkStickySnap(deltaX, deltaY, projectedBounds);
    deltaX = snappedDelta.x;
    deltaY = snappedDelta.y;
  }

  return { deltaX, deltaY, applied: true };
}

/**
 * Hook that listens for drag events and applies guidelines snapping.
 * This is registered as a global plugin hook to intercept drag operations.
 */
export function useGuidelinesDragSnap(_context: PluginHooksContext): void {
  useEffect(() => {
    // This hook doesn't need to do anything directly.
    // The applyGuidelinesDuringDrag function is exported and called
    // by the pointer handlers when dragging elements.
    // 
    // The hook exists to ensure the guidelines plugin is properly
    // registered and the slice is available in the store.
  }, []);
}

/**
 * Creates an ElementDragModifier for guidelines snapping.
 * This allows the guidelines plugin to participate in the drag modification pipeline
 * without direct coupling from the canvas core.
 */
export function createGuidelinesDragModifier(
  _context: PluginHandlerContext<CanvasStore>
): ElementDragModifier {
  return {
    id: 'guidelines-snap',
    priority: 50, // Mid-priority - after grid (10) but before final adjustments
    modify: (
      deltaX: number,
      deltaY: number,
      context: ElementDragContext
    ) => {
      const result = applyGuidelinesDuringDrag(deltaX, deltaY, context.selectedIds);
      return { deltaX: result.deltaX, deltaY: result.deltaY, applied: result.applied };
    },
    onDragEnd: () => {
      // Clear guidelines when drag ends
      const state = useCanvasStore.getState();
      state.updateGuidelinesState?.({
        currentMatches: [],
        currentDistanceMatches: [],
        currentSizeMatches: [],
      });
    },
  };
}
