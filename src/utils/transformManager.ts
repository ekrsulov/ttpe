import type { Point } from '../types';

export interface TransformBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  center: Point;
}

export interface TransformHandle {
  id: string;
  type: 'corner' | 'edge' | 'rotation';
  position: Point;
  cursor: string;
}

export type TransformMode = 'scale' | 'rotate' | null;

interface TransformState {
  isTransforming: boolean;
  mode: TransformMode;
  activeHandle: string | null;
  dragStart: Point | null;
  currentPoint: Point | null;
  initialBounds: TransformBounds | null;
}

export class SimpleTransformManager {
  private state: TransformState = {
    isTransforming: false,
    mode: null,
    activeHandle: null,
    dragStart: null,
    currentPoint: null,
    initialBounds: null,
  };

  // Calculate scale factors for subpaths - EXACT same logic as calculateScale to avoid amplification
  calculateSubpathScale(
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

    // Use EXACTLY the same logic as calculateScale - no compensation factors
    switch (handleId) {
      case 'corner-tl': // Top-left corner
        scaleX = (bounds.width - deltaX) / bounds.width;
        scaleY = (bounds.height - deltaY) / bounds.height;
        originX = bounds.x + bounds.width;
        originY = bounds.y + bounds.height;
        // Force proportional scaling for corners
        const scaleTL = Math.min(Math.abs(scaleX), Math.abs(scaleY));
        scaleX = scaleX < 0 ? -scaleTL : scaleTL;
        scaleY = scaleY < 0 ? -scaleTL : scaleTL;
        break;
        
      case 'corner-tr': // Top-right corner
        scaleX = (bounds.width + deltaX) / bounds.width;
        scaleY = (bounds.height - deltaY) / bounds.height;
        originX = bounds.x;
        originY = bounds.y + bounds.height;
        // Force proportional scaling for corners
        const scaleTR = Math.min(Math.abs(scaleX), Math.abs(scaleY));
        scaleX = scaleX < 0 ? -scaleTR : scaleTR;
        scaleY = scaleY < 0 ? -scaleTR : scaleTR;
        break;
        
      case 'corner-bl': // Bottom-left corner
        scaleX = (bounds.width - deltaX) / bounds.width;
        scaleY = (bounds.height + deltaY) / bounds.height;
        originX = bounds.x + bounds.width;
        originY = bounds.y;
        // Force proportional scaling for corners
        const scaleBL = Math.min(Math.abs(scaleX), Math.abs(scaleY));
        scaleX = scaleX < 0 ? -scaleBL : scaleBL;
        scaleY = scaleY < 0 ? -scaleBL : scaleBL;
        break;
        
      case 'corner-br': // Bottom-right corner
        scaleX = (bounds.width + deltaX) / bounds.width;
        scaleY = (bounds.height + deltaY) / bounds.height;
        originX = bounds.x;
        originY = bounds.y;
        // Force proportional scaling for corners
        const scaleBR = Math.min(Math.abs(scaleX), Math.abs(scaleY));
        scaleX = scaleX < 0 ? -scaleBR : scaleBR;
        scaleY = scaleY < 0 ? -scaleBR : scaleBR;
        break;
        
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

    // Apply the same conservative limits as calculateScale
    const minScale = 0.01;
    const maxScale = 50.0;
    
    scaleX = Math.max(-maxScale, Math.min(maxScale, scaleX));
    scaleY = Math.max(-maxScale, Math.min(maxScale, scaleY));
    
    if (Math.abs(scaleX) < minScale) {
      scaleX = scaleX < 0 ? -minScale : minScale;
    }
    if (Math.abs(scaleY) < minScale) {
      scaleY = scaleY < 0 ? -minScale : minScale;
    }

    return { scaleX, scaleY, originX, originY };
  }

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
      case 'corner-tl': // Top-left corner
        scaleX = (bounds.width - deltaX) / bounds.width;
        scaleY = (bounds.height - deltaY) / bounds.height;
        originX = bounds.x + bounds.width;
        originY = bounds.y + bounds.height;
        // Force proportional scaling for corners
        const scaleTL = Math.min(Math.abs(scaleX), Math.abs(scaleY));
        scaleX = scaleX < 0 ? -scaleTL : scaleTL;
        scaleY = scaleY < 0 ? -scaleTL : scaleTL;
        break;
        
      case 'corner-tr': // Top-right corner
        scaleX = (bounds.width + deltaX) / bounds.width;
        scaleY = (bounds.height - deltaY) / bounds.height;
        originX = bounds.x;
        originY = bounds.y + bounds.height;
        // Force proportional scaling for corners
        const scaleTR = Math.min(Math.abs(scaleX), Math.abs(scaleY));
        scaleX = scaleX < 0 ? -scaleTR : scaleTR;
        scaleY = scaleY < 0 ? -scaleTR : scaleTR;
        break;
        
      case 'corner-bl': // Bottom-left corner
        scaleX = (bounds.width - deltaX) / bounds.width;
        scaleY = (bounds.height + deltaY) / bounds.height;
        originX = bounds.x + bounds.width;
        originY = bounds.y;
        // Force proportional scaling for corners
        const scaleBL = Math.min(Math.abs(scaleX), Math.abs(scaleY));
        scaleX = scaleX < 0 ? -scaleBL : scaleBL;
        scaleY = scaleY < 0 ? -scaleBL : scaleBL;
        break;
        
      case 'corner-br': // Bottom-right corner
        scaleX = (bounds.width + deltaX) / bounds.width;
        scaleY = (bounds.height + deltaY) / bounds.height;
        originX = bounds.x;
        originY = bounds.y;
        // Force proportional scaling for corners
        const scaleBR = Math.min(Math.abs(scaleX), Math.abs(scaleY));
        scaleX = scaleX < 0 ? -scaleBR : scaleBR;
        scaleY = scaleY < 0 ? -scaleBR : scaleBR;
        break;
        
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

  // Transform a point using scale and rotation
  transformPoint(
    point: Point,
    scaleX: number,
    scaleY: number,
    originX: number,
    originY: number,
    rotationAngle: number = 0,
    rotationCenterX?: number,
    rotationCenterY?: number
  ): Point {
    let x = point.x;
    let y = point.y;

    // Apply scaling first
    if (scaleX !== 1 || scaleY !== 1) {
      x = originX + (x - originX) * scaleX;
      y = originY + (y - originY) * scaleY;
    }

    // Apply rotation if specified
    if (rotationAngle !== 0 && rotationCenterX !== undefined && rotationCenterY !== undefined) {
      const angleRad = rotationAngle * Math.PI / 180;
      const cos = Math.cos(angleRad);
      const sin = Math.sin(angleRad);
      
      // Translate to rotation center
      const dx = x - rotationCenterX;
      const dy = y - rotationCenterY;
      
      // Rotate
      x = rotationCenterX + dx * cos - dy * sin;
      y = rotationCenterY + dx * sin + dy * cos;
    }

    return { x, y };
  }

  // Check if mirroring is occurring
  isMirroring(scaleX: number, scaleY: number): { mirrorX: boolean; mirrorY: boolean } {
    return {
      mirrorX: scaleX < 0,
      mirrorY: scaleY < 0
    };
  }

  // Generate transform handles for a given bounds
  generateHandles(bounds: TransformBounds, handlerSize: number): TransformHandle[] {
    const { x, y, width, height } = bounds;
    
    return [
      // Corner handles
      {
        id: 'corner-tl',
        type: 'corner',
        position: { x: x - handlerSize / 2, y: y - handlerSize / 2 },
        cursor: 'nw-resize'
      },
      {
        id: 'corner-tr',
        type: 'corner',
        position: { x: x + width - handlerSize / 2, y: y - handlerSize / 2 },
        cursor: 'ne-resize'
      },
      {
        id: 'corner-bl',
        type: 'corner',
        position: { x: x - handlerSize / 2, y: y + height - handlerSize / 2 },
        cursor: 'sw-resize'
      },
      {
        id: 'corner-br',
        type: 'corner',
        position: { x: x + width - handlerSize / 2, y: y + height - handlerSize / 2 },
        cursor: 'se-resize'
      },
      
      // Edge handles
      {
        id: 'midpoint-t',
        type: 'edge',
        position: { x: x + width / 2 - handlerSize / 2, y: y - handlerSize / 2 },
        cursor: 'n-resize'
      },
      {
        id: 'midpoint-b',
        type: 'edge',
        position: { x: x + width / 2 - handlerSize / 2, y: y + height - handlerSize / 2 },
        cursor: 's-resize'
      },
      {
        id: 'midpoint-l',
        type: 'edge',
        position: { x: x - handlerSize / 2, y: y + height / 2 - handlerSize / 2 },
        cursor: 'w-resize'
      },
      {
        id: 'midpoint-r',
        type: 'edge',
        position: { x: x + width - handlerSize / 2, y: y + height / 2 - handlerSize / 2 },
        cursor: 'e-resize'
      },
      
      // Rotation handles
      {
        id: 'rotate-tl',
        type: 'rotation',
        position: { x: x - handlerSize * 1.5, y: y - handlerSize * 1.5 },
        cursor: 'alias'
      },
      {
        id: 'rotate-tr',
        type: 'rotation',
        position: { x: x + width + handlerSize / 2, y: y - handlerSize * 1.5 },
        cursor: 'alias'
      },
      {
        id: 'rotate-bl',
        type: 'rotation',
        position: { x: x - handlerSize * 1.5, y: y + height + handlerSize / 2 },
        cursor: 'alias'
      },
      {
        id: 'rotate-br',
        type: 'rotation',
        position: { x: x + width + handlerSize / 2, y: y + height + handlerSize / 2 },
        cursor: 'alias'
      }
    ];
  }

  // Get the current state
  getState() {
    return { ...this.state };
  }

  // Update state
  setState(updates: Partial<TransformState>) {
    this.state = { ...this.state, ...updates };
  }
}

// Export a singleton instance
export const transformManager = new SimpleTransformManager();