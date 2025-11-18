import type { StateCreator } from 'zustand';
import type { Point, SubPath, Command, PathElement } from '../../types';
import type { SplitPathResult, ReconstructedPath, TrimIntersection } from '../../types/trimPath';
import type { CanvasStore } from '../../store/canvasStore';
import paper from 'paper';
import {
  findSegmentsAlongPath,
  reconstructPathsFromSegments,
} from '../../utils/trimPathGeometry';
import { trimPathCache } from './cache';

/**
 * Converts a SubPath to SVG path data string for debugging.
 */
function convertSubPathToSVGPathData(subPath: SubPath): string {
  return subPath.map(cmd => {
    switch (cmd.type) {
      case 'M':
        return `M ${cmd.position.x.toFixed(2)} ${cmd.position.y.toFixed(2)}`;
      case 'L':
        return `L ${cmd.position.x.toFixed(2)} ${cmd.position.y.toFixed(2)}`;
      case 'C':
        return `C ${cmd.controlPoint1.x.toFixed(2)} ${cmd.controlPoint1.y.toFixed(2)} ${cmd.controlPoint2.x.toFixed(2)} ${cmd.controlPoint2.y.toFixed(2)} ${cmd.position.x.toFixed(2)} ${cmd.position.y.toFixed(2)}`;
      case 'Z':
        return 'Z';
      default:
        return '';
    }
  }).join(' ');
}

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
  
  /** Refreshes the cache when selection or paths change */
  refreshTrimCache: () => void;
  
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
  
  /** Debug method: Logs detailed information about paths and segments */
  debugTrimState: () => void;
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
     
    // Clear the cache when deactivating
    trimPathCache.clear();
    
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

  refreshTrimCache: () => {
    const state = get() as CanvasStore & TrimPathPluginSlice;
    
    // Only refresh if trim tool is active
    if (!state.trimPath?.isActive) {
      return;
    }

    const selectedIds = state.selectedIds || [];
    const elements = state.elements || [];
    
    // Get the path elements by IDs
    const currentPaths = elements.filter(
      (el) => selectedIds.includes(el.id) && el.type === 'path'
    ) as PathElement[];

    // Refresh the cache
    const splitResult = trimPathCache.refresh(currentPaths);

    if (!splitResult) {
      // If validation fails, deactivate
      state.deactivateTrimTool?.();
      return;
    }

    // Update state with refreshed cache
    set({
      trimPath: {
        ...state.trimPath,
        splitResult,
        hoveredSegmentId: null,
        markedSegmentIds: [],
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
    
    if (!currentTrimPath.isDragging) {
      return;
    }

    // Get splitResult from cache or state
    const splitResult = currentTrimPath.splitResult || trimPathCache.get();
    
    if (!splitResult) {
      return;
    }

    const newCursorPath = [...currentTrimPath.cursorPath, currentPoint];
    const markedSegmentIds = findSegmentsAlongPath(
      splitResult.segments,
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

  debugTrimState: () => {
    const state = get() as CanvasStore & TrimPathPluginSlice;
    const trimPath = state.trimPath;
    const selectedIds = state.selectedIds || [];
    const elements = state.elements || [];

    console.group('🔍 Trim Path Debug Info');
    
    // 1. Tool State
    console.log('\n📌 Tool State:');
    console.log('  - Active:', trimPath.isActive);
    console.log('  - Dragging:', trimPath.isDragging);
    console.log('  - Hovered Segment:', trimPath.hoveredSegmentId);
    console.log('  - Marked Segments:', trimPath.markedSegmentIds);

    // 2. Selected Paths
    console.log('\n📂 Selected Paths:', selectedIds.length);
    const selectedPaths = elements.filter(
      (el) => selectedIds.includes(el.id) && el.type === 'path'
    ) as PathElement[];

    selectedPaths.forEach((path, index) => {
      console.group(`  Path ${index + 1}: ${path.id}`);
      console.log('    SubPaths:', path.data.subPaths.length);
      
      path.data.subPaths.forEach((subPath, spIndex) => {
        const pathData = convertSubPathToSVGPathData(subPath);
        console.log(`    SubPath ${spIndex + 1}:`, pathData);
      });
      
      console.log('    Style:', {
        strokeWidth: path.data.strokeWidth,
        strokeColor: path.data.strokeColor,
        fillColor: path.data.fillColor,
      });
      console.groupEnd();
    });

    // 3. Split Result
    if (!trimPath.splitResult) {
      console.log('\n⚠️ No split result available (tool not active or no intersections)');
      console.groupEnd();
      return;
    }

    const { intersections, segments } = trimPath.splitResult;

    // 4. Intersections
    console.log('\n🔗 Intersections:', intersections.length);
    intersections.forEach((inter, index) => {
      console.log(`  Intersection ${index + 1}:`, {
        id: inter.id,
        point: `(${inter.point.x.toFixed(2)}, ${inter.point.y.toFixed(2)})`,
        path1: inter.pathId1,
        path2: inter.pathId2,
        segment1: inter.segmentIndex1,
        segment2: inter.segmentIndex2,
        param1: inter.parameter1.toFixed(3),
        param2: inter.parameter2.toFixed(3),
      });
    });
    
    // 4.5 Group intersections by path and curve for better analysis
    console.log('\n🔗 Intersections by Path and Curve:');
    const intersByPathAndCurve = new Map<string, Map<number, TrimIntersection[]>>();
    intersections.forEach(inter => {
      // Process path1
      if (!intersByPathAndCurve.has(inter.pathId1)) {
        intersByPathAndCurve.set(inter.pathId1, new Map());
      }
      const curvesMap1 = intersByPathAndCurve.get(inter.pathId1)!;
      if (!curvesMap1.has(inter.segmentIndex1)) {
        curvesMap1.set(inter.segmentIndex1, []);
      }
      curvesMap1.get(inter.segmentIndex1)!.push(inter);
      
      // Process path2
      if (!intersByPathAndCurve.has(inter.pathId2)) {
        intersByPathAndCurve.set(inter.pathId2, new Map());
      }
      const curvesMap2 = intersByPathAndCurve.get(inter.pathId2)!;
      if (!curvesMap2.has(inter.segmentIndex2)) {
        curvesMap2.set(inter.segmentIndex2, []);
      }
      curvesMap2.get(inter.segmentIndex2)!.push(inter);
    });
    
    intersByPathAndCurve.forEach((curvesMap, pathId) => {
      const pathElement = selectedPaths.find(p => p.id === pathId);
      const pathLabel = pathElement ? `${pathId.substring(0, 20)}...` : pathId;
      console.group(`  Path: ${pathLabel}`);
      
      curvesMap.forEach((inters, curveIndex) => {
        console.log(`    Curve ${curveIndex}: ${inters.length} intersection(s)`, 
          inters.map(i => `(${i.point.x.toFixed(1)}, ${i.point.y.toFixed(1)})`));
      });
      
      console.groupEnd();
    });

    // 5. Segments
    console.log('\n✂️ Trim Segments:', segments.length);
    
    // Group segments by pathId
    const segmentsByPath = new Map<string, typeof segments>();
    segments.forEach(seg => {
      if (!segmentsByPath.has(seg.pathId)) {
        segmentsByPath.set(seg.pathId, []);
      }
      segmentsByPath.get(seg.pathId)!.push(seg);
    });

    segmentsByPath.forEach((segs, pathId) => {
      console.group(`  📍 Path: ${pathId} (${segs.length} segments)`);
      
      segs.forEach((seg, index) => {
        const isHovered = seg.id === trimPath.hoveredSegmentId;
        const isMarked = trimPath.markedSegmentIds.includes(seg.id);
        const status = isMarked ? '🔴 MARKED' : isHovered ? '🟡 HOVERED' : '⚪️';
        
        console.group(`    ${status} Segment ${index + 1}: ${seg.id}`);
        console.log('      Start:', `(${seg.startPoint.x.toFixed(2)}, ${seg.startPoint.y.toFixed(2)})`);
        console.log('      End:', `(${seg.endPoint.x.toFixed(2)}, ${seg.endPoint.y.toFixed(2)})`);
        console.log('      Start Intersection:', seg.startIntersectionId || 'none');
        console.log('      End Intersection:', seg.endIntersectionId || 'none');
        console.log('      Path Data:', seg.pathData);
        console.log('      BBox:', {
          x: `${seg.boundingBox.minX.toFixed(2)} - ${seg.boundingBox.maxX.toFixed(2)}`,
          y: `${seg.boundingBox.minY.toFixed(2)} - ${seg.boundingBox.maxY.toFixed(2)}`,
        });
        console.groupEnd();
      });
      
      console.groupEnd();
    });

    // 6. Cache Info
    console.log('\n💾 Cache Info:');
    const cachedPathIds = trimPathCache.getCachedPathIds();
    console.log('  Cached Path IDs:', cachedPathIds);
    console.log('  Cache Valid:', trimPathCache.isValidFor(selectedIds));

    console.groupEnd();
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

  // Refresh the cache with the current paths
  const splitResult = trimPathCache.refresh(currentPaths);

  if (!splitResult) {
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

  // Update trim state with new intersections from cache
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
