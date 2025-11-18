import paper from 'paper';
import type { PathElement, Point } from '../types';
import type {
  TrimIntersection,
  TrimSegment,
  SplitPathResult,
  ReconstructedPath,
  TrimValidationResult,
} from '../types/trimPath';
import { calculateBounds, type Bounds } from './boundsUtils';
import { convertPathDataToPaperPath } from './pathOperationsUtils';

/**
 * Generates a unique ID for elements (inline implementation).
 */
function generateId(): string {
  return `element_${Date.now()}_${Math.random()}`;
}

/**
 * Gets bounds for a PathElement.
 */
function getPathBounds(pathElement: PathElement): Bounds {
  return calculateBounds(pathElement.data.subPaths, pathElement.data.strokeWidth);
}

/**
 * Validates that paths are suitable for trim operations.
 */
export function validatePathsForTrim(paths: PathElement[]): TrimValidationResult {
  if (paths.length < 2) {
    return {
      isValid: false,
      message: 'Selecciona al menos 2 paths que se intersecten',
    };
  }

  // Check all are valid paths (not groups, etc.)
  const invalidPaths = paths.filter(p => p.type !== 'path');
  if (invalidPaths.length > 0) {
    return {
      isValid: false,
      message: 'Todos los elementos seleccionados deben ser paths',
    };
  }

  // MVP: Limit to 5 paths for simplicity
  // MVP: Limit to 100 paths
  if (paths.length > 100) {
    return {
      isValid: false,
      message: 'Trim Path soporta hasta 100 paths simultáneamente',
    };
  }

  return { isValid: true };
}

/**
 * Checks if two bounding boxes overlap (with optional tolerance).
 */
function boundsOverlap(bounds1: Bounds, bounds2: Bounds, tolerance = 0): boolean {
  return !(
    bounds1.maxX + tolerance < bounds2.minX ||
    bounds2.maxX + tolerance < bounds1.minX ||
    bounds1.maxY + tolerance < bounds2.minY ||
    bounds2.maxY + tolerance < bounds1.minY
  );
}

/**
 * Computes all intersections between a set of paths.
 * 
 * @param paths - Array of PathElements to analyze
 * @returns Array of intersections found, ordered by pathId and parameter
 */
export function computePathIntersections(paths: PathElement[]): TrimIntersection[] {
  const intersections: TrimIntersection[] = [];

  try {
    // Convert PathElements to Paper.js paths
    const paperPaths = paths.map(p => ({
      id: p.id,
      paperPath: convertPathDataToPaperPath(p.data),
      bounds: getPathBounds(p),
    }));

    // First, check for self-intersections within each path (for compound paths with multiple subpaths)
    for (let i = 0; i < paperPaths.length; i++) {
      const path = paperPaths[i];
      
      // Get self-intersections
      const selfIntersections = path.paperPath.getIntersections(path.paperPath);
      
      for (const inter of selfIntersections) {
        // Extract intersection data
        const intersection: TrimIntersection = {
          id: generateId(),
          point: {
            x: inter.point.x,
            y: inter.point.y,
          },
          pathId1: path.id,
          pathId2: path.id, // Same path - self-intersection
          segmentIndex1: inter.curve.index,
          segmentIndex2: inter.intersection?.curve?.index ?? 0,
          parameter1: inter.time,
          parameter2: inter.intersection?.time ?? 0,
        };

        intersections.push(intersection);
      }
    }

    // Then check each pair of different paths (i, j) where i < j
    for (let i = 0; i < paperPaths.length; i++) {
      for (let j = i + 1; j < paperPaths.length; j++) {
        const path1 = paperPaths[i];
        const path2 = paperPaths[j];

        // Quick bounding box check to skip non-overlapping paths
        if (!boundsOverlap(path1.bounds, path2.bounds, 10)) {
          continue;
        }

        // Get intersections from Paper.js
        const paperIntersections = path1.paperPath.getIntersections(path2.paperPath);

        for (const inter of paperIntersections) {
          // Extract intersection data
          const intersection: TrimIntersection = {
            id: generateId(),
            point: {
              x: inter.point.x,
              y: inter.point.y,
            },
            pathId1: path1.id,
            pathId2: path2.id,
            segmentIndex1: inter.curve.index,
            segmentIndex2: inter.intersection?.curve?.index ?? 0,
            parameter1: inter.time, // Parameter along the curve [0, 1]
            parameter2: inter.intersection?.time ?? 0,
          };

          intersections.push(intersection);
        }
      }
    }

    // Filter out self-intersections that are too close to path endpoints (likely artifacts from path reconstruction)
    const filteredIntersections = intersections.filter(intersection => {
      // Only filter self-intersections (same path)
      if (intersection.pathId1 !== intersection.pathId2) {
        return true; // Keep intersections between different paths
      }
      
      const threshold = 1; // pixels - reduced threshold
      
      // Find the path
      const path = paperPaths.find(p => p.id === intersection.pathId1);
      
      if (!path) return false;
      
      // Get start and end points of the path
      const pathStart = path.paperPath.firstSegment.point;
      const pathEnd = path.paperPath.lastSegment.point;
      
      const interPoint = new paper.Point(intersection.point.x, intersection.point.y);
      
      // Check distance to endpoints
      const distanceToStart = interPoint.getDistance(pathStart);
      const distanceToEnd = interPoint.getDistance(pathEnd);
      
      // Keep self-intersection if it's not too close to any endpoint
      return distanceToStart > threshold && distanceToEnd > threshold;
    });

    return filteredIntersections;
  } catch (_error) {
    return [];
  }
}

/**
 * Splits paths into segments at their intersection points.
 * NEW APPROACH: Works at the curve (geometric segment) level for fine-grained control.
 * Each curve becomes an independent TrimSegment, allowing precise trimming.
 * 
 * @param paths - Original PathElements
 * @param intersections - Previously computed intersections
 * @returns Structure with segments and metadata
 */
export function splitPathsByIntersections(
  paths: PathElement[],
  intersections: TrimIntersection[]
): SplitPathResult {
  const segments: TrimSegment[] = [];
  const originalPaths = new Map<string, PathElement>();

  try {
    // Store original paths
    for (const path of paths) {
      originalPaths.set(path.id, path);
    }

    // Group intersections by path
    const intersectionsByPath = new Map<string, TrimIntersection[]>();
    for (const inter of intersections) {
      if (!intersectionsByPath.has(inter.pathId1)) {
        intersectionsByPath.set(inter.pathId1, []);
      }
      if (!intersectionsByPath.has(inter.pathId2)) {
        intersectionsByPath.set(inter.pathId2, []);
      }
      intersectionsByPath.get(inter.pathId1)!.push(inter);
      intersectionsByPath.get(inter.pathId2)!.push(inter);
    }

    // Process each path
    for (const path of paths) {
      const pathIntersections = intersectionsByPath.get(path.id) || [];

      // Convert to Paper.js path
      const paperPathOriginal = convertPathDataToPaperPath(path.data);
      
      // Handle CompoundPath by processing each child separately
      const subpathsToProcess: paper.Path[] = [];
      if (paperPathOriginal instanceof paper.CompoundPath) {
        for (const child of paperPathOriginal.children) {
          if (child instanceof paper.Path) {
            subpathsToProcess.push(child.clone());
          }
        }
      } else if (paperPathOriginal instanceof paper.Path) {
        subpathsToProcess.push(paperPathOriginal);
      } else {
        continue;
      }
      
      for (const paperPath of subpathsToProcess) {
        if (pathIntersections.length === 0) {
          const segment = createTrimSegmentFromPath(paperPath, path, null, null);
          if (segment) segments.push(segment);
          continue;
        }

        const curves = paperPath.curves;

        for (let curveIndex = 0; curveIndex < curves.length; curveIndex++) {
          const curve = curves[curveIndex];

          const curveIntersections = pathIntersections
            .map(inter => {
              const isOnCurve =
                (inter.pathId1 === path.id && inter.segmentIndex1 === curveIndex) ||
                (inter.pathId2 === path.id && inter.segmentIndex2 === curveIndex);

              if (!isOnCurve) return null;

              const time = inter.pathId1 === path.id ? inter.parameter1 : inter.parameter2;

              return {
                intersection: inter,
                time,
                point: inter.point,
              };
            })
            .filter((item): item is { intersection: TrimIntersection; time: number; point: Point } => item !== null)
            .sort((a, b) => a.time - b.time);

          if (curveIntersections.length === 0) {
            const segment = createTrimSegmentFromCurve(curve, path, curveIndex, null, null);
            if (segment) segments.push(segment);
          } else {
            const subSegments = splitCurveAtIntersections(curve, curveIntersections, path, curveIndex);
            segments.push(...subSegments);
          }
        }

        paperPath.remove();
      }
    }

    return {
      intersections,
      segments,
      originalPaths,
    };
  } catch (_error) {
    return {
      intersections,
      segments: [],
      originalPaths,
    };
  }
}

/**
 * Creates a TrimSegment from an entire Paper.js path.
 */
function createTrimSegmentFromPath(
  paperPath: paper.Path,
  originalPath: PathElement,
  startIntersectionId: string | null,
  endIntersectionId: string | null
): TrimSegment | null {
  try {
    if (!paperPath.segments || paperPath.segments.length === 0) return null;

    const firstPoint = paperPath.segments[0].point;
    const lastPoint = paperPath.segments[paperPath.segments.length - 1].point;

    return {
      id: generateId(),
      pathId: originalPath.id,
      startIntersectionId,
      endIntersectionId,
      startPoint: { x: firstPoint.x, y: firstPoint.y },
      endPoint: { x: lastPoint.x, y: lastPoint.y },
      pathData: paperPath.pathData,
      boundingBox: {
        minX: paperPath.bounds.x,
        minY: paperPath.bounds.y,
        maxX: paperPath.bounds.x + paperPath.bounds.width,
        maxY: paperPath.bounds.y + paperPath.bounds.height,
      },
      originalSegmentIndices: [0],
      style: {
        strokeWidth: originalPath.data.strokeWidth,
        strokeColor: originalPath.data.strokeColor,
        strokeOpacity: originalPath.data.strokeOpacity,
        strokeLinecap: originalPath.data.strokeLinecap,
        strokeLinejoin: originalPath.data.strokeLinejoin,
        strokeDasharray: originalPath.data.strokeDasharray,
      },
    };
  } catch {
    return null;
  }
}

function createTrimSegmentFromCurve(
  curve: paper.Curve,
  originalPath: PathElement,
  curveIndex: number,
  startIntersectionId: string | null,
  endIntersectionId: string | null
): TrimSegment | null {
  try {
    const tempPath = new paper.Path();
    tempPath.add(curve.segment1.clone());
    tempPath.add(curve.segment2.clone());

    const segment = createTrimSegmentFromPath(tempPath, originalPath, startIntersectionId, endIntersectionId);
    tempPath.remove();

    if (segment) {
      segment.originalSegmentIndices = [curveIndex];
    }

    return segment;
  } catch {
    return null;
  }
}

function splitCurveAtIntersections(
  curve: paper.Curve,
  curveIntersections: Array<{ intersection: TrimIntersection; time: number; point: Point }>,
  originalPath: PathElement,
  curveIndex: number
): TrimSegment[] {
  const segments: TrimSegment[] = [];

  try {
    const workingPath = new paper.Path();
    workingPath.add(curve.segment1.clone());
    workingPath.add(curve.segment2.clone());

    const EPS = 1e-4;

    const isClosedSegment =
      (curve.path?.closed ?? false) &&
      workingPath.firstSegment.point.getDistance(workingPath.lastSegment.point) < EPS;

    const intersectionsWithOffsets = curveIntersections
      .map(({ intersection, point }) => {
        const location = workingPath.getLocationOf(new paper.Point(point.x, point.y));
        if (!location || typeof location.offset !== 'number') {
          return null;
        }
        return {
          intersection,
          offset: location.offset,
        };
      })
      .filter((entry): entry is { intersection: TrimIntersection; offset: number } => entry !== null)
      .sort((a, b) => a.offset - b.offset);

    if (intersectionsWithOffsets.length === 0) {
      const wholeSegment = createTrimSegmentFromCurve(curve, originalPath, curveIndex, null, null);
      workingPath.remove();
      return wholeSegment ? [wholeSegment] : [];
    }

    const dedupedOffsets: typeof intersectionsWithOffsets = [];
    for (const entry of intersectionsWithOffsets) {
      const last = dedupedOffsets[dedupedOffsets.length - 1];
      if (last && Math.abs(last.offset - entry.offset) < EPS) {
        continue;
      }
      dedupedOffsets.push(entry);
    }

    const partPaths: paper.Path[] = [];
    for (let i = dedupedOffsets.length - 1; i >= 0; i--) {
      const offset = dedupedOffsets[i].offset;
      try {
        const splitResult = workingPath.splitAt(offset);
        if (splitResult) {
          partPaths.unshift(splitResult);
        }
      } catch {
        /* ignore divide errors */
      }
    }
    partPaths.unshift(workingPath);

    if (isClosedSegment && partPaths.length > dedupedOffsets.length) {
      const seamHead = partPaths.shift();
      const seamTail = partPaths.pop();

      if (seamHead && seamTail) {
        const merged = new paper.Path();
        seamTail.segments.forEach((seg) => merged.add(seg.clone()));
        for (let i = 1; i < seamHead.segments.length; i++) {
          merged.add(seamHead.segments[i].clone());
        }
        partPaths.unshift(merged);
        seamHead.remove();
        seamTail.remove();
      } else {
        seamHead?.remove();
        seamTail?.remove();
      }
    }

    const entryCount = dedupedOffsets.length;

    for (let i = 0; i < partPaths.length; i++) {
      const partPath = partPaths[i];
      if (!partPath || partPath.length < 0.01 || partPath.segments.length < 2) {
        partPath?.remove();
        continue;
      }

      const startIntersectionId = isClosedSegment
        ? dedupedOffsets[(i - 1 + entryCount) % entryCount]?.intersection.id ?? null
        : i === 0
          ? null
          : dedupedOffsets[i - 1]?.intersection.id ?? null;

      const endIntersectionId = isClosedSegment
        ? dedupedOffsets[i % entryCount]?.intersection.id ?? null
        : dedupedOffsets[i]?.intersection.id ?? null;

      const segment = createTrimSegmentFromPath(
        partPath,
        originalPath,
        startIntersectionId,
        endIntersectionId
      );

      partPath.remove();

      if (segment) {
        segment.originalSegmentIndices = [curveIndex];
        segments.push(segment);
      }
    }
  } catch {
    /* noop */
  }

  return segments;
}


/**
 * Extracts a portion of a Paper.js path between two points.
 * Returns the path data and bounds.
 */


/**
 * Finds the segment closest to a cursor position.
 * 
 * @param segments - Candidate segments
 * @param cursorPosition - Cursor position in canvas coordinates
 * @param threshold - Maximum distance in pixels to consider (default: 5)
 * @returns The closest segment or null
 */
export function findSegmentAtPoint(
  segments: TrimSegment[],
  cursorPosition: Point,
  threshold = 5
): TrimSegment | null {
  let closestSegment: TrimSegment | null = null;
  let minDistance = threshold;

  for (const segment of segments) {
    // Quick bounding box check first
    const bbox = segment.boundingBox;
    const margin = threshold;
    
    if (
      cursorPosition.x < bbox.minX - margin ||
      cursorPosition.x > bbox.maxX + margin ||
      cursorPosition.y < bbox.minY - margin ||
      cursorPosition.y > bbox.maxY + margin
    ) {
      continue;
    }
    

    // More precise check: distance to the path
    try {
      const tempPath = new paper.Path(segment.pathData);
      const nearestPoint = tempPath.getNearestPoint(new paper.Point(cursorPosition.x, cursorPosition.y));
      
      if (nearestPoint) {
        const distance = Math.sqrt(
          Math.pow(nearestPoint.x - cursorPosition.x, 2) +
          Math.pow(nearestPoint.y - cursorPosition.y, 2)
        );

        if (distance < minDistance) {
          minDistance = distance;
          closestSegment = segment;
        }
      }
      
      tempPath.remove();
    } catch (_error) {
      // Silently continue if error occurs
    }
  }

  return closestSegment;
}

/**
 * Finds all segments that intersect a cursor path (for drag operations).
 * 
 * @param segments - Candidate segments
 * @param cursorPath - Array of points representing cursor trajectory
 * @param threshold - Maximum distance in pixels (default: 5)
 * @returns Array of segment IDs that intersect the cursor path
 */
export function findSegmentsAlongPath(
  segments: TrimSegment[],
  cursorPath: Point[],
  threshold = 5
): string[] {
  const foundSegmentIds = new Set<string>();

  for (const cursorPoint of cursorPath) {
    const segment = findSegmentAtPoint(segments, cursorPoint, threshold);
    if (segment) {
      foundSegmentIds.add(segment.id);
    }
  }

  return Array.from(foundSegmentIds);
}

/**
 * Reconstructs paths from remaining segments after trimming.
 * 
 * @param allSegments - All segments after splitting
 * @param segmentIdsToRemove - IDs of segments to trim away
 * @param originalPaths - Map of original paths for style reference
 * @returns Array of reconstructed paths
 */
export function reconstructPathsFromSegments(
  allSegments: TrimSegment[],
  segmentIdsToRemove: string[],
  originalPaths: Map<string, PathElement>
): ReconstructedPath[] {
  const reconstructedPaths: ReconstructedPath[] = [];

  try {
    // Filter out removed segments
    const remainingSegments = allSegments.filter(s => !segmentIdsToRemove.includes(s.id));

    // Group remaining segments by original path
    const segmentsByPath = new Map<string, TrimSegment[]>();
    for (const segment of remainingSegments) {
      if (!segmentsByPath.has(segment.pathId)) {
        segmentsByPath.set(segment.pathId, []);
      }
      segmentsByPath.get(segment.pathId)!.push(segment);
    }

    // Process each group
    for (const [pathId, segments] of segmentsByPath.entries()) {
      const originalPath = originalPaths.get(pathId);
      if (!originalPath) continue;

      // Find continuous sequences of segments
      const sequences = findContinuousSequences(segments);

      for (const sequence of sequences) {
        // Concatenate path data
        const concatenatedPathData = concatenateSegmentPathData(sequence);
        
        if (!concatenatedPathData) continue;

        const isClosed = isSequenceClosed(sequence);

        const reconstructed: ReconstructedPath = {
          id: generateId(),
          pathData: concatenatedPathData,
          style: {
            strokeWidth: originalPath.data.strokeWidth,
            strokeColor: originalPath.data.strokeColor,
            strokeOpacity: originalPath.data.strokeOpacity,
            fillColor: isClosed ? originalPath.data.fillColor : 'none',
            fillOpacity: isClosed ? originalPath.data.fillOpacity : 0,
            strokeLinecap: originalPath.data.strokeLinecap,
            strokeLinejoin: originalPath.data.strokeLinejoin,
            fillRule: originalPath.data.fillRule,
            strokeDasharray: originalPath.data.strokeDasharray,
          },
          isClosed,
          sourcePathId: pathId,
          containsSegmentIds: sequence.map(s => s.id),
          transform: originalPath.data.transform,
        };

        reconstructedPaths.push(reconstructed);
      }
    }

    // Run a sanitation pass to remove stray duplicates and insignificant fragments
    return sanitizeReconstructedPaths(reconstructedPaths);
  } catch (_error) {
    return [];
  }
}

/**
 * Cleans an array of ReconstructedPath by removing insignificant or duplicate ones and
 * merging tiny fragments that likely represent noise or duplicated geometry.
 */
export function sanitizeReconstructedPaths(paths: ReconstructedPath[]): ReconstructedPath[] {
  try {
    const cleaned: ReconstructedPath[] = [];
    const seen = new Set<string>();

    // Helper: compute a normalized signature for path (rounded pathData)
    function signature(pathData: string): string {
      try {
        const p = new paper.Path(pathData);
        // Round coordinates to 2 decimals for safe comparison
        const rounded = p.pathData.replace(/(\d+\.\d{2})\d*/g, '$1');
        p.remove();
        return rounded;
      } catch {
        return pathData;
      }
    }

    // Helper: whether a path is too small / degenerate to keep
    function isInsignificant(rp: ReconstructedPath): boolean {
      try {
        const p = new paper.Path(rp.pathData);
        const length = p.length || 0;
        const segments = p.segments ? p.segments.length : 0;
        p.remove();
        
        // Only consider insignificant if:
        // - Has less than 2 segments (degenerate - just a point)
        // - Or has nearly zero length (< 0.1 pixels)
        // Note: We removed the 'area' check because a line segment has area=0 but is valid
        return segments < 2 || length < 0.1;
      } catch {
        return true;
      }
    }

    // Build cleaned list, remove duplicates and small paths
    for (const rp of paths) {
      if (!rp || !rp.pathData) continue;

      if (isInsignificant(rp)) {
        continue;
      }

      const sig = signature(rp.pathData);
      if (seen.has(sig)) continue;

      // check duplicates via simple bounding box inclusion test: if a later path is wholly inside an earlier path, drop the later
      let isContained = false;
      try {
        const curPath = new paper.Path(rp.pathData);
        for (const kept of cleaned) {
          const keptPath = new paper.Path(kept.pathData);
          // if current bounding box is inside kept bounding box and its length is much smaller => consider it noise
          if (
            curPath.bounds.x >= keptPath.bounds.x - 0.01 &&
            curPath.bounds.y >= keptPath.bounds.y - 0.01 &&
            curPath.bounds.x + curPath.bounds.width <= keptPath.bounds.x + keptPath.bounds.width + 0.01 &&
            curPath.bounds.y + curPath.bounds.height <= keptPath.bounds.y + keptPath.bounds.height + 0.01 &&
            curPath.length < keptPath.length * 0.1
          ) {
            isContained = true;
            keptPath.remove();
            break;
          }
          keptPath.remove();
        }
        curPath.remove();
      } catch {
        /* noop */
      }

      if (isContained) continue;

      seen.add(sig);
      cleaned.push(rp);
    }

    return cleaned;
  } catch (_err) {
    return paths;
  }
}

/**
 * Finds continuous sequences of segments (connected end-to-end).
 */
function findContinuousSequences(segments: TrimSegment[]): TrimSegment[][] {
  const sequences: TrimSegment[][] = [];
  const used = new Set<string>();

  const TOLERANCE = 0.1; // Tolerance for point matching

  function pointsMatch(p1: Point, p2: Point): boolean {
    return Math.abs(p1.x - p2.x) < TOLERANCE && Math.abs(p1.y - p2.y) < TOLERANCE;
  }

  for (const startSegment of segments) {
    if (used.has(startSegment.id)) continue;

    const sequence: TrimSegment[] = [startSegment];
    used.add(startSegment.id);

    // Try to extend forward
    let currentEnd = startSegment.endPoint;
    let foundNext = true;

    while (foundNext) {
      foundNext = false;
      for (const candidate of segments) {
        if (used.has(candidate.id)) continue;
        
        if (pointsMatch(candidate.startPoint, currentEnd)) {
          sequence.push(candidate);
          used.add(candidate.id);
          currentEnd = candidate.endPoint;
          foundNext = true;
          break;
        }
      }
    }

    sequences.push(sequence);
  }

  return sequences;
}

/**
 * Checks if a sequence of segments forms a closed loop.
 */
function isSequenceClosed(segments: TrimSegment[]): boolean {
  if (segments.length === 0) return false;
  
  const TOLERANCE = 0.1;
  const first = segments[0];
  const last = segments[segments.length - 1];

  return (
    Math.abs(first.startPoint.x - last.endPoint.x) < TOLERANCE &&
    Math.abs(first.startPoint.y - last.endPoint.y) < TOLERANCE
  );
}

/**
 * Concatenates path data from multiple segments.
 * 
 * KNOWN ISSUE: When reconstructing paths from trimmed segments, curve handles
 * may be lost or incorrectly merged, causing deformation. This happens especially
 * with circular paths that have been split into many segments.
 * The merging logic needs to preserve the original curve geometry more carefully.
 */
function concatenateSegmentPathData(segments: TrimSegment[]): string | null {
  if (segments.length === 0) return null;

  try {
    const combinedPath = new paper.Path();
    const tolerance = 0.05;

    for (let i = 0; i < segments.length; i++) {
      const segPath = new paper.Path(segments[i].pathData);

      if (combinedPath.segments.length === 0) {
        segPath.segments.forEach(seg => combinedPath.add(seg.clone()));
        segPath.remove();
        continue;
      }

      const merged = mergeSequentialPath(combinedPath, segPath, tolerance);
      if (!merged) {
        segPath.segments.forEach(seg => combinedPath.add(seg.clone()));
      }

      segPath.remove();
    }

    combinedPath.closed = isSequenceClosed(segments);

    const pathData = combinedPath.pathData;
    combinedPath.remove();

    return pathData;
  } catch (_error) {
    return null;
  }
}

function mergeSequentialPath(target: paper.Path, source: paper.Path, tolerance: number): boolean {
  if (
    !target.segments ||
    target.segments.length === 0 ||
    !source.segments ||
    source.segments.length === 0
  ) {
    return false;
  }

  const targetLast = target.segments[target.segments.length - 1];
  let sourceFirst = source.segments[0];

  if (!targetLast.point.isClose(sourceFirst.point, tolerance)) {
    const sourceLast = source.segments[source.segments.length - 1];
    if (targetLast.point.isClose(sourceLast.point, tolerance)) {
      source.reverse();
      sourceFirst = source.segments[0];
    } else {
      return false;
    }
  }

  const mergedSegment = new paper.Segment(
    targetLast.point.clone(),
    targetLast.handleIn ? targetLast.handleIn.clone() : undefined,
    sourceFirst.handleOut ? sourceFirst.handleOut.clone() : undefined
  );

  target.removeSegment(target.segments.length - 1);
  target.add(mergedSegment);

  for (let i = 1; i < source.segments.length; i++) {
    target.add(source.segments[i].clone());
  }

  return true;
}
