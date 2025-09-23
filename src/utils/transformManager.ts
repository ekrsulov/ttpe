import type { Point } from '../types';

export interface TransformBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  center: Point;
}

export type TransformMode = 'scale' | 'rotate' | null;

export class SimpleTransformManager {
  // Calculate scale factors based on handle movement - more natural approach
  calculateScale(
    handleId: string,
    currentPoint: Point,
    dragStart: Point,
    bounds: TransformBounds
  ): { scaleX: number; scaleY: number; originX: number; originY: number } {
    const deltaX = currentPoint.x - dragStart.x;
    const deltaY = currentPoint.y - dragStart.y;
    
    let scaleX = 1;
    let scaleY = 1;
    let originX = bounds.x;
    let originY = bounds.y;

    // Calculate scale based on handle type - direct approach without sensitivity factors
    switch (handleId) {
      case 'corner-tl': { // Top-left corner
        scaleX = (bounds.width - deltaX) / bounds.width;
        scaleY = (bounds.height - deltaY) / bounds.height;
        originX = bounds.x + bounds.width;
        originY = bounds.y + bounds.height;
        // Force proportional scaling for corners
        const scaleTL = Math.min(Math.abs(scaleX), Math.abs(scaleY));
        scaleX = scaleX < 0 ? -scaleTL : scaleTL;
        scaleY = scaleY < 0 ? -scaleTL : scaleTL;
        break;
      }
        
      case 'corner-tr': { // Top-right corner
        scaleX = (bounds.width + deltaX) / bounds.width;
        scaleY = (bounds.height - deltaY) / bounds.height;
        originX = bounds.x;
        originY = bounds.y + bounds.height;
        // Force proportional scaling for corners
        const scaleTR = Math.min(Math.abs(scaleX), Math.abs(scaleY));
        scaleX = scaleX < 0 ? -scaleTR : scaleTR;
        scaleY = scaleY < 0 ? -scaleTR : scaleTR;
        break;
      }
        
      case 'corner-bl': { // Bottom-left corner
        scaleX = (bounds.width - deltaX) / bounds.width;
        scaleY = (bounds.height + deltaY) / bounds.height;
        originX = bounds.x + bounds.width;
        originY = bounds.y;
        // Force proportional scaling for corners
        const scaleBL = Math.min(Math.abs(scaleX), Math.abs(scaleY));
        scaleX = scaleX < 0 ? -scaleBL : scaleBL;
        scaleY = scaleY < 0 ? -scaleBL : scaleBL;
        break;
      }
        
      case 'corner-br': { // Bottom-right corner
        scaleX = (bounds.width + deltaX) / bounds.width;
        scaleY = (bounds.height + deltaY) / bounds.height;
        originX = bounds.x;
        originY = bounds.y;
        // Force proportional scaling for corners
        const scaleBR = Math.min(Math.abs(scaleX), Math.abs(scaleY));
        scaleX = scaleX < 0 ? -scaleBR : scaleBR;
        scaleY = scaleY < 0 ? -scaleBR : scaleBR;
        break;
      }
        
      // Edge handles - non-proportional scaling
      case 'midpoint-t': // Top edge
        scaleX = 1; // No horizontal scaling
        scaleY = (bounds.height - deltaY) / bounds.height;
        originX = bounds.x + bounds.width / 2;
        originY = bounds.y + bounds.height;
        break;
        
      case 'midpoint-b': // Bottom edge
        scaleX = 1; // No horizontal scaling
        scaleY = (bounds.height + deltaY) / bounds.height;
        originX = bounds.x + bounds.width / 2;
        originY = bounds.y;
        break;
        
      case 'midpoint-l': // Left edge
        scaleX = (bounds.width - deltaX) / bounds.width;
        scaleY = 1; // No vertical scaling
        originX = bounds.x + bounds.width;
        originY = bounds.y + bounds.height / 2;
        break;
        
      case 'midpoint-r': // Right edge
        scaleX = (bounds.width + deltaX) / bounds.width;
        scaleY = 1; // No vertical scaling
        originX = bounds.x;
        originY = bounds.y + bounds.height / 2;
        break;
    }

    // Apply reasonable scale limits to prevent extreme transformations
    const minScale = 0.05; // Allow more shrinking than before
    const maxScale = 10.0; // Allow more expansion than before
    
    if (Math.abs(scaleX) < minScale) {
      scaleX = scaleX < 0 ? -minScale : minScale;
    } else if (Math.abs(scaleX) > maxScale) {
      scaleX = scaleX < 0 ? -maxScale : maxScale;
    }
    
    if (Math.abs(scaleY) < minScale) {
      scaleY = scaleY < 0 ? -minScale : minScale;
    } else if (Math.abs(scaleY) > maxScale) {
      scaleY = scaleY < 0 ? -maxScale : maxScale;
    }

    return { scaleX, scaleY, originX, originY };
  }

  // Calculate rotation angle - simpler approach
  calculateRotation(
    currentPoint: Point,
    dragStart: Point,
    bounds: TransformBounds
  ): { angle: number; centerX: number; centerY: number } {
    const center = bounds.center;
    
    // Vector from center to initial point
    const initialVector = {
      x: dragStart.x - center.x,
      y: dragStart.y - center.y
    };
    
    // Vector from center to current point
    const currentVector = {
      x: currentPoint.x - center.x,
      y: currentPoint.y - center.y
    };
    
    // Calculate angle between vectors (in radians)
    const initialAngle = Math.atan2(initialVector.y, initialVector.x);
    const currentAngle = Math.atan2(currentVector.y, currentVector.x);
    const rotationAngle = currentAngle - initialAngle;
    
    // Convert to degrees
    const angleDegrees = rotationAngle * 180 / Math.PI;

    return {
      angle: angleDegrees,
      centerX: center.x,
      centerY: center.y
    };
  }
}

// Export a singleton instance
export const transformManager = new SimpleTransformManager();
