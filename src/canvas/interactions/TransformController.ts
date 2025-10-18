import { transformManager, type TransformBounds } from '../../utils/transformManager';
import { transformCommands, calculateScaledStrokeWidth } from '../../utils/sharedTransformUtils';
import type { Point, PathData, CanvasElement } from '../../types';

export interface TransformState {
  isTransforming: boolean;
  transformStart: Point | null;
  transformElementId: string | null;
  transformHandler: string | null;
  originalBounds: { minX: number; minY: number; maxX: number; maxY: number } | null;
  transformedBounds: { minX: number; minY: number; maxX: number; maxY: number } | null;
  initialTransform: { scaleX: number; scaleY: number; rotation: number; translateX: number; translateY: number } | null;
  originalElementData: PathData | null;
}

export interface TransformFeedback {
  rotation: { degrees: number; visible: boolean; isShiftPressed: boolean; isMultipleOf15: boolean };
  resize: { deltaX: number; deltaY: number; visible: boolean; isShiftPressed: boolean; isMultipleOf10: boolean };
  shape: { width: number; height: number; visible: boolean; isShiftPressed: boolean; isMultipleOf10: boolean };
  pointPosition: { x: number; y: number; visible: boolean };
}

export class TransformController {
  private transformManager = transformManager;

  /**
   * Initialize transformation state for an element
   */
  initializeTransform(
    element: CanvasElement,
    elementId: string,
    handler: string,
    startPoint: Point,
    bounds: { minX: number; minY: number; maxX: number; maxY: number }
  ): Partial<TransformState> {
    return {
      isTransforming: true,
      transformStart: startPoint,
      transformElementId: elementId,
      transformHandler: handler,
      originalBounds: bounds,
      transformedBounds: bounds,
      originalElementData: element.type === 'path' ? element.data as PathData : null,
      initialTransform: {
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        translateX: 0,
        translateY: 0
      }
    };
  }

  /**
   * Calculate transformation updates based on current pointer position
   */
  calculateTransformUpdate(
    currentPoint: Point,
    state: TransformState,
    elements: CanvasElement[],
    isShiftPressed: boolean
  ): {
    updatedElement: CanvasElement | null;
    feedback: TransformFeedback;
  } {

    if (!state.transformStart || !state.transformElementId || !state.transformHandler ||
        !state.originalBounds || !state.transformedBounds || !state.initialTransform || !state.originalElementData) {
      return { updatedElement: null, feedback: this.getEmptyFeedback() };
    }

    // Handle subpath transformations
    let element: CanvasElement | undefined;
    let subpathIndex: number | null = null;

    if (state.transformElementId.startsWith('subpath:')) {
      // Extract real element ID and subpath index
      const parts = state.transformElementId.split(':');
      const realElementId = parts[1];
      subpathIndex = parseInt(parts[2]);
      element = elements.find(el => el.id === realElementId);
    } else {
      element = elements.find(el => el.id === state.transformElementId);
    }

    if (!element || element.type !== 'path') {
      return { updatedElement: null, feedback: this.getEmptyFeedback() };
    }

    const bounds: TransformBounds = {
      x: state.originalBounds.minX,
      y: state.originalBounds.minY,
      width: state.originalBounds.maxX - state.originalBounds.minX,
      height: state.originalBounds.maxY - state.originalBounds.minY,
      center: {
        x: (state.originalBounds.minX + state.originalBounds.maxX) / 2,
        y: (state.originalBounds.minY + state.originalBounds.maxY) / 2
      }
    };

    let newScaleX = state.initialTransform.scaleX;
    let newScaleY = state.initialTransform.scaleY;
    let newRotation = state.initialTransform.rotation;
    let transformOriginX = bounds.center.x;
    let transformOriginY = bounds.center.y;

    const feedback = this.getEmptyFeedback();

    // Handle different transform types
    if (state.transformHandler.startsWith('corner-') || state.transformHandler.startsWith('midpoint-')) {
      // Scale transformation
      const scaleResult = this.transformManager.calculateScale(
        state.transformHandler,
        currentPoint,
        state.transformStart,
        bounds
      );

      newScaleX = scaleResult.scaleX;
      newScaleY = scaleResult.scaleY;
      transformOriginX = scaleResult.originX;
      transformOriginY = scaleResult.originY;

      // Calculate feedback
      const newWidth = Math.round(bounds.width * newScaleX);
      const newHeight = Math.round(bounds.height * newScaleY);
      const originalWidth = Math.round(bounds.width * state.initialTransform.scaleX);
      const originalHeight = Math.round(bounds.height * state.initialTransform.scaleY);
      const deltaX = newWidth - originalWidth;
      const deltaY = newHeight - originalHeight;

      let adjustedDeltaX = deltaX;
      let adjustedDeltaY = deltaY;

      if (isShiftPressed) {
        // Round to nearest 10-pixel increment
        adjustedDeltaX = Math.round(deltaX / 10) * 10;
        adjustedDeltaY = Math.round(deltaY / 10) * 10;

        // Recalculate scales based on adjusted deltas
        newScaleX = state.initialTransform.scaleX * (originalWidth + adjustedDeltaX) / originalWidth;
        newScaleY = state.initialTransform.scaleY * (originalHeight + adjustedDeltaY) / originalHeight;
      }

      const isMultipleOf10 = (Math.abs(adjustedDeltaX) % 10 === 0) && (Math.abs(adjustedDeltaY) % 10 === 0);

      feedback.resize = {
        deltaX: adjustedDeltaX,
        deltaY: adjustedDeltaY,
        visible: true,
        isShiftPressed,
        isMultipleOf10
      };

    } else if (state.transformHandler.startsWith('rotate-')) {
      // Rotation transformation
      const rotationResult = this.transformManager.calculateRotation(
        currentPoint,
        state.transformStart,
        bounds
      );

      let calculatedRotation = state.initialTransform.rotation + rotationResult.angle;

      // Apply sticky rotation (15-degree increments) when Shift is pressed
      if (isShiftPressed) {
        // Round to nearest 15-degree increment
        calculatedRotation = Math.round(calculatedRotation / 15) * 15;
      }

      newRotation = calculatedRotation;
      transformOriginX = rotationResult.centerX;
      transformOriginY = rotationResult.centerY;

      // Keep rotation within reasonable bounds (-180 to 180)
      while (newRotation > 180) newRotation -= 360;
      while (newRotation < -180) newRotation += 360;

      // Update rotation feedback - show total rotation in 0-360 range
      const normalizedDegrees = newRotation < 0 ? newRotation + 360 : newRotation;
      const isMultipleOf15 = Math.round(normalizedDegrees) % 15 === 0;

      feedback.rotation = {
        degrees: Math.round(normalizedDegrees),
        visible: true,
        isShiftPressed,
        isMultipleOf15: isShiftPressed ? isMultipleOf15 : false
      };
    }

    // Apply transformation to element data
    const updatedElement = this.applyTransformToElement(
      element,
      state.originalElementData,
      {
        scaleX: newScaleX,
        scaleY: newScaleY,
        rotation: newRotation,
        translateX: 0,
        translateY: 0
      },
      { x: transformOriginX, y: transformOriginY },
      subpathIndex
    );

    return { updatedElement, feedback };
  }

  /**
   * Apply transformation to element data
   */
  private applyTransformToElement(
    element: CanvasElement,
    originalData: PathData,
    transform: { scaleX: number; scaleY: number; rotation: number; translateX: number; translateY: number },
    origin: Point,
    subpathIndex: number | null = null
  ): CanvasElement {
    if (element.type !== 'path') {
      return element;
    }

    // Create a copy of the original data
    const newData: PathData = {
      ...originalData,
      subPaths: originalData.subPaths.map((subPath, index) => {
        // If transforming a specific subpath, only transform that one
        if (subpathIndex !== null && index !== subpathIndex) {
          return subPath;
        }
        // Use shared transformation utility for consistency
        return transformCommands(subPath, {
          scaleX: transform.scaleX,
          scaleY: transform.scaleY,
          originX: origin.x,
          originY: origin.y,
          rotation: transform.rotation,
          rotationCenterX: origin.x,
          rotationCenterY: origin.y
        });
      }),
      // Update stroke width using shared utility
      strokeWidth: subpathIndex === null 
        ? calculateScaledStrokeWidth(originalData.strokeWidth, transform.scaleX, transform.scaleY)
        : originalData.strokeWidth,
      // Update the transform property to reflect the current transformation
      transform: {
        scaleX: transform.scaleX,
        scaleY: transform.scaleY,
        rotation: transform.rotation,
        translateX: transform.translateX,
        translateY: transform.translateY
      }
    };

    return {
      ...element,
      data: newData
    };
  }

  /**
   * Reset transformation state
   */
  resetTransform(): Partial<TransformState> {
    return {
      isTransforming: false,
      transformStart: null,
      transformElementId: null,
      transformHandler: null,
      originalBounds: null,
      transformedBounds: null,
      initialTransform: null,
      originalElementData: null
    };
  }

  /**
   * Get empty feedback state
   */
  private getEmptyFeedback(): TransformFeedback {
    return {
      rotation: { degrees: 0, visible: false, isShiftPressed: false, isMultipleOf15: false },
      resize: { deltaX: 0, deltaY: 0, visible: false, isShiftPressed: false, isMultipleOf10: false },
      shape: { width: 0, height: 0, visible: false, isShiftPressed: false, isMultipleOf10: false },
      pointPosition: { x: 0, y: 0, visible: false }
    };
  }
}