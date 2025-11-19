import { useState, useCallback, useRef, useEffect } from 'react';
import { debugLog } from '../../utils/debugUtils';
import { useCanvasStore } from '../../store/canvasStore';
import type { Point, CanvasElement } from '../../types';
import { calculateSkewAngleFromDelta } from '../../utils/advancedTransformUtils';

interface AdvancedTransformState {
  isTransforming: boolean;
  transformType: 'distort' | 'skew' | null;
  handler: string | null;
  startPoint: Point | null;
  originalBounds: { minX: number; minY: number; maxX: number; maxY: number } | null;
  // For distort: track all corner positions
  corners: { tl: Point; tr: Point; bl: Point; br: Point } | null;
  // For skew: track which edge and direction
  skewAxis: 'x' | 'y' | null;
  // Store original element state to restore and reapply transformations
  originalElements: Map<string, CanvasElement> | null;
}

export const useAdvancedTransformControls = () => {
  const [transformState, setTransformState] = useState<AdvancedTransformState>({
    isTransforming: false,
    transformType: null,
    handler: null,
    startPoint: null,
    originalBounds: null,
    corners: null,
    skewAxis: null,
    originalElements: null
  });

  const transformStateRef = useRef(transformState);
  transformStateRef.current = transformState;

  const applyAdvancedDistortTransform = useCanvasStore(state => state.applyAdvancedDistortTransform);
  const applyAdvancedSkewTransform = useCanvasStore(state => state.applyAdvancedSkewTransform);
  const getTransformationBounds = useCanvasStore(state => state.getTransformationBounds);
  const updateElement = useCanvasStore(state => state.updateElement);
  const advancedMode = useCanvasStore(state => state.transformation?.advancedMode);

  // Clean up transformation state when advanced mode is disabled
  useEffect(() => {
    if (!advancedMode) {
      const currentState = transformStateRef.current;
      
      // Restore original elements if there's an active transformation
      if (currentState.isTransforming && currentState.originalElements) {
        currentState.originalElements.forEach((originalElement, elementId) => {
          updateElement(elementId, { data: originalElement.data });
        });
      }
      
      // Clear transformation state
      setTransformState({
        isTransforming: false,
        transformType: null,
        handler: null,
        startPoint: null,
        originalBounds: null,
        corners: null,
        skewAxis: null,
        originalElements: null
      });
    }
  }, [advancedMode, updateElement]);

  const startAdvancedTransformation = useCallback((handler: string, point: Point, isModifierPressed: boolean) => {
    const bounds = getTransformationBounds?.();
    if (!bounds) return;

    const corners = {
      tl: { x: bounds.minX, y: bounds.minY },
      tr: { x: bounds.maxX, y: bounds.minY },
      bl: { x: bounds.minX, y: bounds.maxY },
      br: { x: bounds.maxX, y: bounds.maxY }
    };

    // Determine transformation type based on handler and modifier key
    let transformType: 'distort' | 'skew' = 'distort';
    let skewAxis: 'x' | 'y' | null = null;

    if (handler.startsWith('advanced-edge-')) {
      if (isModifierPressed) {
        transformType = 'distort'; // Perspective mode (edge + modifier = distort with 2 corners)
          debugLog('🔷 Advanced Transform Mode: PERSPECTIVE (edge + modifier)');
      } else {
        transformType = 'skew';
        skewAxis = handler.includes('top') || handler.includes('bottom') ? 'x' : 'y';
        debugLog('🔷 Advanced Transform Mode: SKEW', { axis: skewAxis });
      }
    } else if (handler.startsWith('advanced-corner-')) {
      transformType = 'distort';
      debugLog('🔷 Advanced Transform Mode: DISTORT (corner)');
    }

    // Save original state of all affected elements
    const originalElements = new Map<string, CanvasElement>();
    const store = useCanvasStore.getState();
    const isSubpathMode = store.isWorkingWithSubpaths?.() ?? false;

    if (isSubpathMode && store.selectedSubpaths) {
      // Save selected subpath elements
      store.selectedSubpaths.forEach(({ elementId }: { elementId: string }) => {
        const element = store.elements.find(el => el.id === elementId);
        if (element) {
          originalElements.set(elementId, JSON.parse(JSON.stringify(element)));
        }
      });
    } else {
      // Save selected elements
      store.selectedIds.forEach(id => {
        const element = store.elements.find(el => el.id === id);
        if (element) {
          originalElements.set(id, JSON.parse(JSON.stringify(element)));
          
          // If it's a group, save all descendants too
          if (element.type === 'group') {
            const collectDescendants = (groupId: string) => {
              const group = store.elements.find(el => el.id === groupId);
              if (group && group.type === 'group') {
                const childIds = (group.data as { childIds: string[] }).childIds;
                childIds.forEach(childId => {
                  const child = store.elements.find(el => el.id === childId);
                  if (child) {
                    originalElements.set(childId, JSON.parse(JSON.stringify(child)));
                    if (child.type === 'group') {
                      collectDescendants(childId);
                    }
                  }
                });
              }
            };
            collectDescendants(id);
          }
        }
      });
    }

    setTransformState({
      isTransforming: true,
      transformType,
      handler,
      startPoint: point,
      originalBounds: bounds,
      corners,
      skewAxis,
      originalElements
    });
  }, [getTransformationBounds]);

  const updateAdvancedTransformation = useCallback((point: Point) => {
    const state = transformStateRef.current;
    if (!state.isTransforming || !state.startPoint || !state.originalBounds || !state.corners || !state.originalElements) {
      return;
    }

    // First, restore all elements to their original state
    state.originalElements.forEach((originalElement, elementId) => {
      updateElement(elementId, { data: originalElement.data });
    });

    const dx = point.x - state.startPoint.x;
    const dy = point.y - state.startPoint.y;

    if (state.transformType === 'distort') {
      // Distort or perspective transformation
      const newCorners = { ...state.corners };

      // Handle corner movements (standard distort)
      if (state.handler === 'advanced-corner-tl') {
        newCorners.tl = { x: state.corners.tl.x + dx, y: state.corners.tl.y + dy };
        debugLog('🔷 Applying DISTORT: top-left corner');
      } else if (state.handler === 'advanced-corner-tr') {
        newCorners.tr = { x: state.corners.tr.x + dx, y: state.corners.tr.y + dy };
        debugLog('🔷 Applying DISTORT: top-right corner');
      } else if (state.handler === 'advanced-corner-bl') {
        newCorners.bl = { x: state.corners.bl.x + dx, y: state.corners.bl.y + dy };
        debugLog('🔷 Applying DISTORT: bottom-left corner');
      } else if (state.handler === 'advanced-corner-br') {
        newCorners.br = { x: state.corners.br.x + dx, y: state.corners.br.y + dy };
        debugLog('🔷 Applying DISTORT: bottom-right corner');
      }
      // Handle edge movements with modifier (perspective)
      else if (state.handler === 'advanced-edge-top') {
        newCorners.tl = { x: state.corners.tl.x + dx, y: state.corners.tl.y + dy };
        newCorners.tr = { x: state.corners.tr.x + dx, y: state.corners.tr.y + dy };
        debugLog('🔷 Applying PERSPECTIVE: top edge (both corners)');
      } else if (state.handler === 'advanced-edge-bottom') {
        newCorners.bl = { x: state.corners.bl.x + dx, y: state.corners.bl.y + dy };
        newCorners.br = { x: state.corners.br.x + dx, y: state.corners.br.y + dy };
        debugLog('🔷 Applying PERSPECTIVE: bottom edge (both corners)');
      } else if (state.handler === 'advanced-edge-left') {
        newCorners.tl = { x: state.corners.tl.x + dx, y: state.corners.tl.y + dy };
        newCorners.bl = { x: state.corners.bl.x + dx, y: state.corners.bl.y + dy };
        debugLog('🔷 Applying PERSPECTIVE: left edge (both corners)');
      } else if (state.handler === 'advanced-edge-right') {
        newCorners.tr = { x: state.corners.tr.x + dx, y: state.corners.tr.y + dy };
        newCorners.br = { x: state.corners.br.x + dx, y: state.corners.br.y + dy };
        debugLog('🔷 Applying PERSPECTIVE: right edge (both corners)');
      }

      // Apply distort transformation from original state
      if (applyAdvancedDistortTransform) {
        applyAdvancedDistortTransform(newCorners);
      }
    } else if (state.transformType === 'skew' && state.skewAxis) {
      // Skew transformation
      const height = state.originalBounds.maxY - state.originalBounds.minY;
      const width = state.originalBounds.maxX - state.originalBounds.minX;

      let angle = 0;

      if (state.skewAxis === 'x') {
        // Horizontal skew (edge top/bottom moves horizontally)
        angle = calculateSkewAngleFromDelta(dx, height / 2);
      } else {
        // Vertical skew (edge left/right moves vertically)
        angle = calculateSkewAngleFromDelta(dy, width / 2);
      }

      // Limit skew angle to prevent extreme distortion
      angle = Math.max(-75, Math.min(75, angle));

      debugLog('🔷 Applying SKEW:', { axis: state.skewAxis, angle: angle.toFixed(2) });

      // Apply skew transformation from original state
      if (applyAdvancedSkewTransform) {
        applyAdvancedSkewTransform(state.skewAxis, angle);
      }
    }
  }, [applyAdvancedDistortTransform, applyAdvancedSkewTransform, updateElement]);

  const endAdvancedTransformation = useCallback(() => {
    // Just clear the state, keep the transformed elements
    setTransformState({
      isTransforming: false,
      transformType: null,
      handler: null,
      startPoint: null,
      originalBounds: null,
      corners: null,
      skewAxis: null,
      originalElements: null
    });
  }, []);

  return {
    transformState,
    startAdvancedTransformation,
    updateAdvancedTransformation,
    endAdvancedTransformation
  };
};
