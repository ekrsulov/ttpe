import { useState, useCallback, useMemo } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { TransformController, type TransformState, type TransformFeedback } from '../canvasInteractions/TransformController';
import { measurePath, measureSubpathBounds } from '../utils/measurementUtils';
import type { Point, PathData } from '../types';

export const useCanvasTransformControls = () => {
  const [transformState, setTransformState] = useState<TransformState>({
    isTransforming: false,
    transformStart: null,
    transformElementId: null,
    transformHandler: null,
    originalBounds: null,
    transformedBounds: null,
    initialTransform: null,
    originalElementData: null
  });

  const [feedback, setFeedback] = useState<TransformFeedback>({
    rotation: { degrees: 0, visible: false, isShiftPressed: false, isMultipleOf15: false },
    resize: { deltaX: 0, deltaY: 0, visible: false, isShiftPressed: false, isMultipleOf10: false },
    shape: { width: 0, height: 0, visible: false, isShiftPressed: false, isMultipleOf10: false },
    pointPosition: { x: 0, y: 0, visible: false }
  });

  const { elements, updateElement } = useCanvasStore();
  const transformController = useMemo(() => new TransformController(), []);

  const startTransformation = useCallback((elementId: string, handler: string, point: Point) => {
    // Handle subpath transformations
    let realElementId = elementId;

    if (elementId.startsWith('subpath:')) {
      // Extract real element ID and subpath index
      const parts = elementId.split(':');
      realElementId = parts[1];
    }

    const element = elements.find(el => el.id === realElementId);
    if (!element) return;

    // Calculate bounds based on element type and ID
    let bounds;
    if (elementId.startsWith('subpath:')) {
      // Subpath transformation
      const parts = elementId.split(':');
      const subpathIndex = parseInt(parts[2]);
      const subpathBounds = measureSubpathBounds(
        (element.data as PathData).subPaths[subpathIndex],
        (element.data as PathData).strokeWidth || 1,
        1 // zoom
      );
      if (subpathBounds) {
        bounds = subpathBounds;
      }
    } else {
      // Regular element bounds
      bounds = measurePath((element.data as PathData).subPaths, (element.data as PathData).strokeWidth, 1);
    }

    if (bounds) {
      const newState = transformController.initializeTransform(element, elementId, handler, point, bounds);
      setTransformState(prev => ({ ...prev, ...newState }));
    }
  }, [elements, transformController]);

  const updateTransformation = useCallback((point: Point, isShiftPressed: boolean) => {
    if (!transformState.isTransforming) return;

    const result = transformController.calculateTransformUpdate(point, transformState, elements, isShiftPressed);

    if (result.updatedElement) {
      updateElement(result.updatedElement.id, result.updatedElement);
    }

    setFeedback(result.feedback);
  }, [transformState, elements, transformController, updateElement]);

  const endTransformation = useCallback(() => {
    const resetState = transformController.resetTransform();
    setTransformState(prev => ({ ...prev, ...resetState }));

    // Reset feedback
    setFeedback({
      rotation: { degrees: 0, visible: false, isShiftPressed: false, isMultipleOf15: false },
      resize: { deltaX: 0, deltaY: 0, visible: false, isShiftPressed: false, isMultipleOf10: false },
      shape: { width: 0, height: 0, visible: false, isShiftPressed: false, isMultipleOf10: false },
      pointPosition: { x: 0, y: 0, visible: false }
    });
  }, [transformController]);

  return {
    transformState,
    feedback,
    startTransformation,
    updateTransformation,
    endTransformation
  };
};