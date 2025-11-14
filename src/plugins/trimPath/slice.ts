import type { StateCreator } from 'zustand';
import type { Point, SubPath, Command, PathElement } from '../../types';
import type { SplitPathResult, ReconstructedPath } from '../../types/trimPath';
import type { CanvasStore } from '../../store/canvasStore';
import paper from 'paper';
import {
  validatePathsForTrim,
  computePathIntersections,
  splitPathsByIntersections,
  findSegmentsAlongPath,
  reconstructPathsFromSegments,
} from '../../utils/trimPathGeometry';

/**
 * State slice for the Trim Path plugin.
 */
export interface TrimPathPluginSlice {
  trimPath: {
    /** Whether the trim tool is currently active */
    isActive: boolean;
    
    /** Result of splitting paths by intersections (when tool is active) */
    splitResult: SplitPathResult | null;
    
    /** ID of the segment currently under the cursor */
    hoveredSegmentId: string | null;
    
    /** IDs of segments marked for removal (during drag) */
    markedSegmentIds: string[];
    
    /** Whether the user is currently dragging to mark multiple segments */
    isDragging: boolean;
    
    /** Path traced by cursor during drag operation */
    cursorPath: Point[];
  };

  /** Activates the trim tool with currently selected paths */
  activateTrimTool: () => void;
  
  /** Deactivates the trim tool and clears state */
  deactivateTrimTool: () => void;
  
  /** Updates which segment is hovered */
  setHoveredSegment: (segmentId: string | null) => void;
  
  /** Starts a drag operation to mark multiple segments */
  startTrimDrag: (startPoint: Point) => void;
  
  /** Updates the drag path and marks intersected segments */
  updateTrimDrag: (currentPoint: Point) => void;
  
  /** Completes the drag operation and applies trim to marked segments */
  finishTrimDrag: () => void;
  
  /** Cancels the drag operation without applying changes */
  cancelTrimDrag: () => void;
  
  /** Trims a single segment (click operation) */
  trimSegment: (segmentId: string) => void;
}

/**
 * Factory for creating the Trim Path plugin slice.
 */
export const createTrimPathPluginSlice: StateCreator<
  TrimPathPluginSlice,
  [],
  [],
  TrimPathPluginSlice
> = (set, get) => ({
  // Initial state
  trimPath: {
    isActive: false,
    splitResult: null,
    hoveredSegmentId: null,
    markedSegmentIds: [],
    isDragging: false,
    cursorPath: [],
  },

  // Actions
  activateTrimTool: () => {
    const selectedIds = (get() as CanvasStore & TrimPathPluginSlice).selectedIds || [];
    
    // Use the helper function to calculate trim state
    recalculateTrimState(selectedIds, get as () => CanvasStore & TrimPathPluginSlice, set as (partial: Partial<CanvasStore & TrimPathPluginSlice>) => void);
  },

  deactivateTrimTool: () => {
     
    set({
      trimPath: {
        isActive: false,
        splitResult: null,
        hoveredSegmentId: null,
        markedSegmentIds: [],
        isDragging: false,
        cursorPath: [],
      },
    });
  },

  setHoveredSegment: (segmentId: string | null) => {
     
    set({
      trimPath: {
        ...get().trimPath,
        hoveredSegmentId: segmentId,
      },
    });
  },

  startTrimDrag: (startPoint: Point) => {
     
    set({
      trimPath: {
        ...get().trimPath,
        isDragging: true,
        cursorPath: [startPoint],
        markedSegmentIds: [],
      },
    });
  },

  updateTrimDrag: (currentPoint: Point) => {
    const currentTrimPath = get().trimPath;
    
    if (!currentTrimPath.isDragging || !currentTrimPath.splitResult) {
      return;
    }

    const newCursorPath = [...currentTrimPath.cursorPath, currentPoint];
    const markedSegmentIds = findSegmentsAlongPath(
      currentTrimPath.splitResult.segments,
      newCursorPath,
      5 // threshold in pixels
    );

    set({
      trimPath: {
        ...currentTrimPath,
        cursorPath: newCursorPath,
        markedSegmentIds,
      },
    });
  },

  finishTrimDrag: () => {
    const currentTrimPath = get().trimPath;
     
    if (!currentTrimPath.isDragging || currentTrimPath.markedSegmentIds.length === 0) {
      // Cancel if no segments marked
      get().cancelTrimDrag();
      return;
    }

    // Apply the trim
    applyTrim(currentTrimPath.markedSegmentIds, get as () => CanvasStore & TrimPathPluginSlice, set as (partial: Partial<CanvasStore & TrimPathPluginSlice>) => void);

    // Reset drag state but keep tool active
    set({
      trimPath: {
        ...get().trimPath,
        isDragging: false,
        cursorPath: [],
        markedSegmentIds: [],
      },
    });

    // Recompute intersections with new paths
    get().activateTrimTool();
  },

  cancelTrimDrag: () => {
     
    set({
      trimPath: {
        ...get().trimPath,
        isDragging: false,
        cursorPath: [],
        markedSegmentIds: [],
      },
    });
  },

  trimSegment: (segmentId: string) => {
     
    // Apply trim to single segment
    applyTrim([segmentId], get as () => CanvasStore & TrimPathPluginSlice, set as (partial: Partial<CanvasStore & TrimPathPluginSlice>) => void);
    
    // Recompute intersections with new paths
    get().activateTrimTool();
  },
});

/**
 * Helper function to apply trim operation to the store.
 * This removes segments and reconstructs paths.
 */
function applyTrim(
  segmentIdsToRemove: string[],
  get: () => CanvasStore & TrimPathPluginSlice,
  set: (partial: Partial<CanvasStore & TrimPathPluginSlice>) => void
) {
  const currentTrimPath = get().trimPath;
  
  if (!currentTrimPath.splitResult) {
    console.error('Cannot apply trim: no split result');
    return;
  }

  // Reconstruct paths from remaining segments
  const reconstructedPaths: ReconstructedPath[] = reconstructPathsFromSegments(
    currentTrimPath.splitResult.segments,
    segmentIdsToRemove,
    currentTrimPath.splitResult.originalPaths
  );

  // Get current store state
  const state = get();
  const elements = state.elements || [];
  const originalPathIds = Array.from(currentTrimPath.splitResult.originalPaths.keys());

  // Remove original paths
  const elementsWithoutOriginals = elements.filter(
    (el) => !originalPathIds.includes(el.id)
  );

  // Add reconstructed paths
  const newElements = [
    ...elementsWithoutOriginals,
    ...reconstructedPaths.map((rp, index) => ({
      id: rp.id,
      type: 'path' as const,
      zIndex: elementsWithoutOriginals.filter((el) => !el.parentId).length + index,
      parentId: null,
      data: {
        subPaths: parsePathDataToSubPaths(rp.pathData),
        strokeWidth: rp.style.strokeWidth,
        strokeColor: rp.style.strokeColor,
        strokeOpacity: rp.style.strokeOpacity,
        fillColor: rp.style.fillColor,
        fillOpacity: rp.style.fillOpacity,
        strokeLinecap: rp.style.strokeLinecap,
        strokeLinejoin: rp.style.strokeLinejoin,
        fillRule: rp.style.fillRule,
        strokeDasharray: rp.style.strokeDasharray,
        transform: rp.transform,
      },
    })),
  ];

  // Update store
  set({ elements: newElements });

  // Update selection to new paths
  const newPathIds = reconstructedPaths.map(rp => rp.id);
  if (state.selectElements) {
    state.selectElements(newPathIds);
  }

  // Recalculate intersections with filtered validation to avoid false intersections
  recalculateTrimState(newPathIds, get as () => CanvasStore & TrimPathPluginSlice, set as (partial: Partial<CanvasStore & TrimPathPluginSlice>) => void);
}

/**
 * Recalculates trim state after paths have changed (e.g., after trimming)
 */
function recalculateTrimState(
  pathIds: string[],
  get: () => CanvasStore & TrimPathPluginSlice,
  set: (partial: Partial<CanvasStore & TrimPathPluginSlice>) => void
) {
  const state = get();
  const elements = state.elements || [];

  // Get the path elements by IDs
  const currentPaths = elements.filter(
    (el) => pathIds.includes(el.id) && el.type === 'path'
  ) as PathElement[];

  // Validate paths for trim
  const validation = validatePathsForTrim(currentPaths);
  if (!validation.isValid || currentPaths.length < 2) {
    // If validation fails or not enough paths, deactivate trim mode
    set({
      trimPath: {
        ...get().trimPath,
        isActive: false,
        splitResult: null,
        hoveredSegmentId: null,
        markedSegmentIds: [],
        isDragging: false,
        cursorPath: [],
      },
    });
    return;
  }

  // Compute intersections
  const intersections = computePathIntersections(currentPaths);

  if (intersections.length === 0) {
    // No intersections, but keep mode active with empty result
    set({
      trimPath: {
        ...get().trimPath,
        isActive: true,
        splitResult: { intersections: [], segments: [], originalPaths: new Map() },
        hoveredSegmentId: null,
        markedSegmentIds: [],
        isDragging: false,
        cursorPath: [],
      },
    });
    return;
  }

  // Split paths into trimmable segments
  const splitResult = splitPathsByIntersections(currentPaths, intersections);

  // Update trim state with new intersections
  set({
    trimPath: {
      ...get().trimPath,
      isActive: true,
      splitResult,
      hoveredSegmentId: null,
      markedSegmentIds: [],
      isDragging: false,
      cursorPath: [],
    },
  });
}

/**
 * Parses SVG path data string into SubPath array using Paper.js.
 */
function parsePathDataToSubPaths(pathData: string): SubPath[] {
  try {
    const paperPath = new paper.Path(pathData);
    const subPaths: SubPath[] = [];
    const commands: Command[] = [];

    // Helper function to round with precision
    const roundToPrecision = (value: number, precision = 2): number => {
      const multiplier = Math.pow(10, precision);
      return Math.round(value * multiplier) / multiplier;
    };

    // Convert Paper.js segments to our Command format
    for (let i = 0; i < paperPath.segments.length; i++) {
      const segment = paperPath.segments[i];
      const point = segment.point;

      if (i === 0) {
        // First segment is always a MoveTo
        commands.push({
          type: 'M',
          position: { x: roundToPrecision(point.x), y: roundToPrecision(point.y) },
        });
      } else {
        const prevSegment = paperPath.segments[i - 1];
        
        // Check if this is a curve or a line
        if (prevSegment.handleOut.isZero() && segment.handleIn.isZero()) {
          // Straight line
          commands.push({
            type: 'L',
            position: { x: roundToPrecision(point.x), y: roundToPrecision(point.y) },
          });
        } else {
          // Cubic Bezier curve
          const cp1 = prevSegment.point.add(prevSegment.handleOut);
          const cp2 = point.add(segment.handleIn);
          
          const anchorPoint = { x: roundToPrecision(point.x), y: roundToPrecision(point.y) };
          
          commands.push({
            type: 'C',
            controlPoint1: {
              x: roundToPrecision(cp1.x),
              y: roundToPrecision(cp1.y),
              commandIndex: i,
              pointIndex: 0,
              anchor: { x: roundToPrecision(prevSegment.point.x), y: roundToPrecision(prevSegment.point.y) },
              isControl: true,
            },
            controlPoint2: {
              x: roundToPrecision(cp2.x),
              y: roundToPrecision(cp2.y),
              commandIndex: i,
              pointIndex: 1,
              anchor: anchorPoint,
              isControl: true,
            },
            position: anchorPoint,
          });
        }
      }
    }

    // Add close path command if the path is closed
    if (paperPath.closed && commands.length > 0) {
      commands.push({ type: 'Z' });
    }

    paperPath.remove();

    // For MVP, treat the entire path as a single subpath
    if (commands.length > 0) {
      subPaths.push(commands);
    }

    return subPaths;
  } catch (error) {
    console.error('Error parsing path data to subpaths:', error);
    // Return minimal fallback
    return [[{ type: 'M', position: { x: 0, y: 0 } }]];
  }
}
