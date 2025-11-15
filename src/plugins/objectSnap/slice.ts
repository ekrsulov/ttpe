import type { StateCreator } from 'zustand';
import type { PathData, CanvasElement, Point, Command } from '../../types';
import { extractEditablePoints } from '../../utils/pathParserUtils';

export interface SnapPoint {
  x: number;
  y: number;
  type: 'endpoint' | 'control' | 'midpoint';
  elementId: string;
  commandIndex: number;
  pointIndex: number;
}

export interface ObjectSnapState {
  enabled: boolean;
  snapThreshold: number; // in screen pixels
  currentSnapPoint: SnapPoint | null;
  availableSnapPoints: SnapPoint[];
  snapToEndpoints: boolean;
  snapToMidpoints: boolean;
  snapToIntersections: boolean;
  // Cache
  cachedSnapPoints: SnapPoint[] | null;
  cacheKey: string | null; // Hash of elements to detect changes
}

/**
 * Calculate distance between two points
 */
function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate midpoint between two points
 */
function midpoint(p1: Point, p2: Point): Point {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

/**
 * Find intersection point between two line segments (if any)
 * Returns null if lines don't intersect or are parallel
 */
function lineSegmentIntersection(
  p1: Point, p2: Point, // First line segment
  p3: Point, p4: Point  // Second line segment
): Point | null {
  const x1 = p1.x, y1 = p1.y;
  const x2 = p2.x, y2 = p2.y;
  const x3 = p3.x, y3 = p3.y;
  const x4 = p4.x, y4 = p4.y;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  
  // Lines are parallel
  if (Math.abs(denom) < 1e-10) {
    return null;
  }

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  // Check if intersection is within both segments
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1),
    };
  }

  return null;
}

/**
 * Get the endpoint of a command
 */
function getCommandEndpoint(command: Command): Point | null {
  if (command.type === 'M' || command.type === 'L' || command.type === 'C') {
    return command.position;
  }
  return null;
}

/**
 * Extract snap points from a path element
 */
function extractSnapPointsFromPath(
  element: CanvasElement,
  options: {
    includeEndpoints: boolean;
    includeMidpoints: boolean;
  }
): SnapPoint[] {
  if (element.type !== 'path') return [];
  
  const pathData = element.data as PathData;
  const commands = pathData.subPaths.flat();
  const editablePoints = extractEditablePoints(commands);
  
  const snapPoints: SnapPoint[] = [];
  
  // Add endpoints only
  if (options.includeEndpoints) {
    editablePoints.forEach((point) => {
      if (!point.isControl) {
        snapPoints.push({
          x: point.x,
          y: point.y,
          type: 'endpoint',
          elementId: element.id,
          commandIndex: point.commandIndex,
          pointIndex: point.pointIndex,
        });
      }
    });
  }
  
  // Add midpoints for L and C commands
  if (options.includeMidpoints) {
    let currentPoint: Point | null = null;
    let startPoint: Point | null = null; // Track the first M command position
    
    commands.forEach((command, commandIndex) => {
      const endpoint = getCommandEndpoint(command);
      
      if (command.type === 'M') {
        currentPoint = endpoint;
        if (!startPoint) {
          startPoint = endpoint; // Remember the start of the path
        }
      } else if (command.type === 'L' && currentPoint && endpoint) {
        // Calculate midpoint of the line segment
        const mid = midpoint(currentPoint, endpoint);
        snapPoints.push({
          x: mid.x,
          y: mid.y,
          type: 'midpoint',
          elementId: element.id,
          commandIndex,
          pointIndex: -1, // Midpoints don't have a pointIndex
        });
        currentPoint = endpoint;
      } else if (command.type === 'C' && currentPoint && endpoint) {
        // Calculate midpoint of cubic Bezier curve at t=0.5
        const c = command as Extract<Command, { type: 'C' }>;
        const t = 0.5;
        const t1 = 1 - t;
        
        // Cubic Bezier formula: B(t) = (1-t)³P0 + 3(1-t)²tP1 + 3(1-t)t²P2 + t³P3
        const mid = {
          x: t1*t1*t1*currentPoint.x + 3*t1*t1*t*c.controlPoint1.x + 3*t1*t*t*c.controlPoint2.x + t*t*t*c.position.x,
          y: t1*t1*t1*currentPoint.y + 3*t1*t1*t*c.controlPoint1.y + 3*t1*t*t*c.controlPoint2.y + t*t*t*c.position.y,
        };
        
        snapPoints.push({
          x: mid.x,
          y: mid.y,
          type: 'midpoint',
          elementId: element.id,
          commandIndex,
          pointIndex: -1,
        });
        currentPoint = endpoint;
      } else if (command.type === 'Z' && currentPoint && startPoint) {
        // Calculate midpoint of the closing segment from current point back to start
        const mid = midpoint(currentPoint, startPoint);
        snapPoints.push({
          x: mid.x,
          y: mid.y,
          type: 'midpoint',
          elementId: element.id,
          commandIndex,
          pointIndex: -1,
        });
        currentPoint = startPoint; // After Z, current point becomes the start point
      } else if (endpoint) {
        currentPoint = endpoint;
      }
    });
  }
  
  return snapPoints;
}

/**
 * Extract line segments from a path element
 */
function extractLineSegments(element: CanvasElement): Array<{ start: Point; end: Point }> {
  if (element.type !== 'path') return [];
  
  const pathData = element.data as PathData;
  const commands = pathData.subPaths.flat();
  const segments: Array<{ start: Point; end: Point }> = [];
  
  let currentPoint: Point | null = null;
  
  commands.forEach((command) => {
    const endpoint = getCommandEndpoint(command);
    
    if (command.type === 'M') {
      currentPoint = endpoint;
    } else if (command.type === 'L' && currentPoint && endpoint) {
      segments.push({ start: currentPoint, end: endpoint });
      currentPoint = endpoint;
    } else if (endpoint) {
      currentPoint = endpoint;
    }
  });
  
  return segments;
}

/**
 * Find all intersection points between paths
 */
function findPathIntersections(pathElements: CanvasElement[]): SnapPoint[] {
  const intersectionPoints: SnapPoint[] = [];
  const seen = new Set<string>(); // To avoid duplicate intersections
  
  // Compare each pair of paths
  for (let i = 0; i < pathElements.length; i++) {
    const segments1 = extractLineSegments(pathElements[i]);
    
    for (let j = i + 1; j < pathElements.length; j++) {
      const segments2 = extractLineSegments(pathElements[j]);
      
      // Check each segment pair
      segments1.forEach((seg1) => {
        segments2.forEach((seg2) => {
          const intersection = lineSegmentIntersection(
            seg1.start, seg1.end,
            seg2.start, seg2.end
          );
          
          if (intersection) {
            // Create unique key to avoid duplicates
            const key = `${intersection.x.toFixed(3)},${intersection.y.toFixed(3)}`;
            if (!seen.has(key)) {
              seen.add(key);
              intersectionPoints.push({
                x: intersection.x,
                y: intersection.y,
                type: 'endpoint', // Use 'endpoint' type for intersections
                elementId: pathElements[i].id,
                commandIndex: -1,
                pointIndex: -1,
              });
            }
          }
        });
      });
    }
  }
  
  return intersectionPoints;
}

export const createObjectSnapPluginSlice: StateCreator<
  ObjectSnapPluginSlice,
  [],
  [],
  ObjectSnapPluginSlice
> = (set, get) => {
  return {
    // Initial state
    objectSnap: {
      enabled: false,
      snapThreshold: 8, // 8 pixels default in screen space
      currentSnapPoint: null,
      availableSnapPoints: [],
      snapToEndpoints: true,
      snapToMidpoints: true,
      snapToIntersections: true, // Enabled by default for Edit panel UX
      cachedSnapPoints: null,
      cacheKey: null,
    },

    // Actions
    updateObjectSnapState: (updates) => {
    set((state) => {
      const newState = {
        objectSnap: {
          ...state.objectSnap,
          ...updates,
        },
      };
      
      // Invalidate cache if snap type options change
      if ('snapToEndpoints' in updates || 
          'snapToMidpoints' in updates || 
          'snapToIntersections' in updates) {
        newState.objectSnap.cachedSnapPoints = null;
        newState.objectSnap.cacheKey = null;
      }
      
      return newState;
    });
  },
  
  invalidateObjectSnapCache: () => {
    set((state) => ({
      objectSnap: {
        ...state.objectSnap,
        cachedSnapPoints: null,
        cacheKey: null,
      },
    }));
  },

  findAvailableSnapPoints: (excludeElementIds) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state = get() as any;
    const elements = state.elements as CanvasElement[];
    const objectSnap = state.objectSnap;
    
    // Generate cache key from elements (excluding the ones being edited)
    const relevantElements = elements.filter((el: CanvasElement) => 
      !excludeElementIds.includes(el.id) && 
      el.type === 'path' &&
      (!state.isElementHidden || !state.isElementHidden(el.id))
    );
    
    const cacheKey = relevantElements
      .map((el: CanvasElement) => el.id)
      .sort()
      .join('|');
    
    // Check if cache is valid
    if (objectSnap?.cachedSnapPoints && objectSnap.cacheKey === cacheKey) {
      return objectSnap.cachedSnapPoints;
    }
    
    const snapPoints: SnapPoint[] = [];
    const pathElements: CanvasElement[] = [];
    
    elements.forEach((element) => {
      // Skip elements that are being edited
      if (excludeElementIds.includes(element.id)) {
        return;
      }
      
      // Skip hidden elements
      if (state.isElementHidden && state.isElementHidden(element.id)) {
        return;
      }
      
      // Only extract from path elements
      if (element.type === 'path') {
        pathElements.push(element);
        
        const points = extractSnapPointsFromPath(element, {
          includeEndpoints: objectSnap?.snapToEndpoints ?? true,
          includeMidpoints: objectSnap?.snapToMidpoints ?? true,
        });
        snapPoints.push(...points);
      }
    });
    
    // Find intersections if enabled
    if (objectSnap?.snapToIntersections && pathElements.length > 1) {
      const intersections = findPathIntersections(pathElements);
      snapPoints.push(...intersections);
    }
    
    // Update cache
    set((current) => ({
      objectSnap: {
        ...current.objectSnap,
        cachedSnapPoints: snapPoints,
        cacheKey,
        availableSnapPoints: snapPoints,
      },
    }));
    
    return snapPoints;
  },

  findClosestSnapPoint: (position, availableSnapPoints, threshold) => {
    let closestPoint: SnapPoint | null = null;
    let minDistance = threshold;
    
    availableSnapPoints.forEach((snapPoint) => {
      const dist = distance(position, snapPoint);
      
      if (dist < minDistance) {
        minDistance = dist;
        closestPoint = snapPoint;
      }
    });
    
    return closestPoint;
  },

  applyObjectSnap: (position, excludeElementIds) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state = get() as any;
    
    // If object snap is disabled, return original position
    if (!state.objectSnap?.enabled) {
      return position;
    }
    
    // Get viewport to convert threshold from screen pixels to canvas coordinates
    const viewport = state.viewport as { zoom: number } | undefined;
    const zoom = viewport?.zoom ?? 1;
    
    // Convert threshold from screen pixels to canvas coordinates
    const thresholdInCanvas = state.objectSnap.snapThreshold / zoom;
    
    // Find available snap points - Call through state to ensure we get the registered function
    const availableSnapPoints = state.findAvailableSnapPoints ? 
      state.findAvailableSnapPoints(excludeElementIds) : [];
    
    // Find closest snap point
    const closestSnap = state.findClosestSnapPoint ? 
      state.findClosestSnapPoint(position, availableSnapPoints, thresholdInCanvas) : null;
    
    // Update current snap point for visualization
    set((current) => ({
      objectSnap: {
        ...current.objectSnap,
        currentSnapPoint: closestSnap,
        availableSnapPoints,
      },
    }));
    
    // Return snapped position if found, otherwise original
    if (closestSnap) {
      return { x: closestSnap.x, y: closestSnap.y };
    }
    
    return position;
  },
  };
};

export interface ObjectSnapPluginSlice {
  objectSnap: ObjectSnapState;
  updateObjectSnapState: (updates: Partial<ObjectSnapState>) => void;
  invalidateObjectSnapCache: () => void;
  findAvailableSnapPoints: (excludeElementIds: string[]) => SnapPoint[];
  findClosestSnapPoint: (
    position: Point,
    availableSnapPoints: SnapPoint[],
    threshold: number
  ) => SnapPoint | null;
  applyObjectSnap: (position: Point, excludeElementIds: string[]) => Point;
}
