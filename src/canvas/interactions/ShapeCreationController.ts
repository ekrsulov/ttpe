import type { Point } from '../../types';

export interface ShapeFeedback {
  width: number;
  height: number;
  visible: boolean;
  isShiftPressed: boolean;
  isMultipleOf10: boolean;
}

export interface PointPositionFeedback {
  x: number;
  y: number;
  visible: boolean;
}

export interface ShapeCreationCallbacks {
  createShape: (shapeStart: Point, shapeEnd: Point) => void;
  getSelectedShape: () => string;
}

export class ShapeCreationController {
  private callbacks: ShapeCreationCallbacks;

  constructor(callbacks: ShapeCreationCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Calculate shape feedback based on start and end points
   */
  calculateShapeFeedback(
    shapeStart: Point,
    shapeEnd: Point,
    shiftPressed: boolean
  ): ShapeFeedback {
    // Calculate dimensions
    const rawWidth = Math.abs(shapeEnd.x - shapeStart.x);
    const rawHeight = Math.abs(shapeEnd.y - shapeStart.y);

    // Apply sticky creation (10-pixel increments) when Shift is pressed
    let adjustedWidth = rawWidth;
    let adjustedHeight = rawHeight;

    if (shiftPressed) {
      // Round to nearest 10-pixel increment
      adjustedWidth = Math.round(rawWidth / 10) * 10;
      adjustedHeight = Math.round(rawHeight / 10) * 10;
    }

    // Check if adjusted dimensions are multiples of 10
    const isMultipleOf10 = (Math.abs(adjustedWidth) % 10 === 0) && (Math.abs(adjustedHeight) % 10 === 0);

    // Calculate real dimensions based on shape type
    const selectedShape = this.callbacks.getSelectedShape();
    let realWidth = adjustedWidth;
    let realHeight = adjustedHeight;

    if (selectedShape === 'square') {
      // Square always has equal sides
      const sideLength = Math.min(adjustedWidth, adjustedHeight);
      realWidth = sideLength;
      realHeight = sideLength;
    } else if (selectedShape === 'circle') {
      // Circle always has equal width and height (diameter)
      const diameter = Math.min(adjustedWidth, adjustedHeight);
      realWidth = diameter;
      realHeight = diameter;
    }
    // For rectangle, realWidth and realHeight are already correct

    return {
      width: Math.round(realWidth),
      height: Math.round(realHeight),
      visible: true,
      isShiftPressed: shiftPressed,
      isMultipleOf10,
    };
  }

  /**
   * Complete shape creation
   */
  completeShapeCreation(shapeStart: Point, shapeEnd: Point): void {
    this.callbacks.createShape(shapeStart, shapeEnd);
  }

  /**
   * Create point position feedback
   */
  createPointPositionFeedback(x: number, y: number, visible: boolean): PointPositionFeedback {
    return {
      x: Math.round(x),
      y: Math.round(y),
      visible,
    };
  }
}