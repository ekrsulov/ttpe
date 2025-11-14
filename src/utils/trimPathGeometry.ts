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
      
      if (pathIntersections.length === 0) {
        // No intersections, treat entire path as one segment
        // (not trimmable, but we'll include it for completeness)
        continue;
      }

      // Convert to Paper.js path
      const paperPathOriginal = convertPathDataToPaperPath(path.data);
      
      // Handle CompoundPath by processing each child separately
      const subpathsToProcess: paper.Path[] = [];
      if (paperPathOriginal instanceof paper.CompoundPath) {
        // Extract all child paths
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
      
      // Process each path/subpath
      for (let subpathIndex = 0; subpathIndex < subpathsToProcess.length; subpathIndex++) {
        const paperPath = subpathsToProcess[subpathIndex];

      // For closed paths, we DON'T open them
      // Paper.js handles closed paths correctly when splitting
      // The closing segment is implicit and will be part of the splits

      // Sort intersections by their offset along the path
      const sortedIntersections = pathIntersections
        .map(inter => {
          const point = new paper.Point(inter.point.x, inter.point.y);
          const location = paperPath.getNearestLocation(point);
          
          // Store original curve information from intersection for more precision
          const curveIndex = inter.pathId1 === path.id ? inter.segmentIndex1 : inter.segmentIndex2;
          const curveTime = inter.pathId1 === path.id ? inter.parameter1 : inter.parameter2;
          
          return {
            intersection: inter,
            offset: location ? location.offset : 0,
            location,
            point: inter.point,
            curveIndex,
            curveTime,
          };
        })
        .sort((a, b) => a.offset - b.offset);

      // Remove duplicate intersections at the same point
      // This can happen with self-intersections or when multiple paths meet at one point
      const uniqueIntersections = sortedIntersections.filter((inter, index) => {
        if (index === 0) return true;
        const prev = sortedIntersections[index - 1];
        const distance = Math.sqrt(
          Math.pow(inter.point.x - prev.point.x, 2) + 
          Math.pow(inter.point.y - prev.point.y, 2)
        );
        return distance > 0.01; // Keep only if points are different
      });

      // Use unique intersections for splitting
      const intersectionsToUse = uniqueIntersections;

      if (intersectionsToUse.length === 0) {
        // No intersections, treat whole path as one segment
        const firstPoint = paperPath.segments[0].point;
        const lastPoint = paperPath.segments[paperPath.segments.length - 1].point;
        
        const segment: TrimSegment = {
          id: generateId(),
          pathId: path.id,
          startIntersectionId: null,
          endIntersectionId: null,
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
            strokeWidth: path.data.strokeWidth,
            strokeColor: path.data.strokeColor,
            strokeOpacity: path.data.strokeOpacity,
            strokeLinecap: path.data.strokeLinecap,
            strokeLinejoin: path.data.strokeLinejoin,
            strokeDasharray: path.data.strokeDasharray,
          },
        };
        
        segments.push(segment);
        continue;
      }

      // Split the path at each intersection
      // We need to split the path at each intersection
      const splitSegments: Array<{
        path: paper.Path;
        startIntersectionId: string | null;
        endIntersectionId: string | null;
      }> = [];

      // Strategy: Split from last intersection to first
      // This way offsets remain stable as we work backwards
      // Note: splitAt mutates workingPath, so we need let
      // eslint-disable-next-line prefer-const
      let workingPath = paperPath.clone();
      
      // Sort intersections by offset (ascending)
      const intersectionsSorted = [...intersectionsToUse].sort((a, b) => {
        const aOffset = a.location?.offset || 0;
        const bOffset = b.location?.offset || 0;
        return aOffset - bOffset;
      });
      

      
      // Split from last to first to keep offsets stable
      for (let i = intersectionsSorted.length - 1; i >= 0; i--) {
        const inter = intersectionsSorted[i];
        
        if (!inter.location) continue;
        
        // Get the location on the current working path
        const intersectionPoint = new paper.Point(inter.point.x, inter.point.y);
        const location = workingPath.getNearestLocation(intersectionPoint);
        
        if (!location) {
          continue;
        }
        
        // Divide the curve at this point if needed (to ensure clean split)
        if (location.curve && location.time !== undefined) {
          const time = location.time;
          if (time > 0.0001 && time < 0.9999) {
            try {
              location.curve.divideAtTime(time);
              // Get updated location after divide
              const updatedLocation = workingPath.getNearestLocation(intersectionPoint);
              if (updatedLocation) {
                // Now split at the updated location
                const afterPart = workingPath.splitAt(updatedLocation);
                
                if (afterPart && afterPart.segments.length > 0) {
                  const nextInter = intersectionsSorted[i + 1];
                  splitSegments.unshift({
                    path: afterPart,
                    startIntersectionId: inter.intersection.id,
                    endIntersectionId: nextInter ? nextInter.intersection.id : null,
                  });
                }
              }
            } catch {
              // Silently continue if divideAtTime fails
            }
          } else {
            // At endpoint, just split directly
            const afterPart = workingPath.splitAt(location);
            
            if (afterPart && afterPart.segments.length > 0) {
              const nextInter = intersectionsSorted[i + 1];
              splitSegments.unshift({
                path: afterPart,
                startIntersectionId: inter.intersection.id,
                endIntersectionId: nextInter ? nextInter.intersection.id : null,
              });
            }
          }
        } else {
          // No curve, just split
          const afterPart = workingPath.splitAt(location);
          
          if (afterPart && afterPart.segments.length > 0) {
            const nextInter = intersectionsSorted[i + 1];
            splitSegments.unshift({
              path: afterPart,
              startIntersectionId: inter.intersection.id,
              endIntersectionId: nextInter ? nextInter.intersection.id : null,
            });
          }
        }
      }
      
      // Add the first segment (before the first intersection)
      // workingPath now contains everything before the first intersection
      if (workingPath && workingPath.segments && workingPath.segments.length > 0) {
        splitSegments.unshift({
          path: workingPath,
          startIntersectionId: null,
          endIntersectionId: intersectionsSorted[0].intersection.id,
        });
      }

      // Create trim segments from the split parts
      for (const { path: splitPath, startIntersectionId, endIntersectionId } of splitSegments) {
        if (!splitPath || !splitPath.segments || splitPath.segments.length === 0) {
          continue;
        }

        const firstPoint = splitPath.segments[0].point;
        const lastPoint = splitPath.segments[splitPath.segments.length - 1].point;

        const segment: TrimSegment = {
          id: generateId(),
          pathId: path.id,
          startIntersectionId,
          endIntersectionId,
          startPoint: { x: firstPoint.x, y: firstPoint.y },
          endPoint: { x: lastPoint.x, y: lastPoint.y },
          pathData: splitPath.pathData,
          boundingBox: {
            minX: splitPath.bounds.x,
            minY: splitPath.bounds.y,
            maxX: splitPath.bounds.x + splitPath.bounds.width,
            maxY: splitPath.bounds.y + splitPath.bounds.height,
          },
          originalSegmentIndices: [segments.length],
          style: {
            strokeWidth: path.data.strokeWidth,
            strokeColor: path.data.strokeColor,
            strokeOpacity: path.data.strokeOpacity,
            strokeLinecap: path.data.strokeLinecap,
            strokeLinejoin: path.data.strokeLinejoin,
            strokeDasharray: path.data.strokeDasharray,
          },
        };

        segments.push(segment);
      }

      // Clean up
      splitSegments.forEach(p => p.path?.remove());
      } // End of subpath loop
    } // End of path loop


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

    return reconstructedPaths;
  } catch (_error) {
    return [];
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
    // Create a new path and add all segment paths to it
    const combinedPath = new paper.Path();
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const segPath = new paper.Path(segment.pathData);
      
      if (segPath && segPath.segments) {
        // For the first segment, add all segments
        if (i === 0) {
          for (const seg of segPath.segments) {
            combinedPath.add(seg.clone());
          }
        } else {
          // For subsequent segments, check if first point matches last point of combined path
          const shouldMerge = combinedPath.segments.length > 0 &&
            segPath.segments.length > 0 &&
            combinedPath.segments[combinedPath.segments.length - 1].point.isClose(
              segPath.segments[0].point,
              0.01
            );
          
          if (shouldMerge) {
            // Merge the handles of the coincident point
            // The last segment of combinedPath should get the handleOut from first segment of segPath
            const lastSeg = combinedPath.segments[combinedPath.segments.length - 1];
            const firstSeg = segPath.segments[0];
            
            // Preserve the handleOut from the new segment if it has one
            if (!firstSeg.handleOut.isZero()) {
              lastSeg.handleOut = firstSeg.handleOut.clone();
            }
            
            // Now add the rest of the segments (skipping the first one)
            for (let j = 1; j < segPath.segments.length; j++) {
              combinedPath.add(segPath.segments[j].clone());
            }
          } else {
            // Points don't match, add all segments
            for (let j = 0; j < segPath.segments.length; j++) {
              combinedPath.add(segPath.segments[j].clone());
            }
          }
        }
      }
      segPath.remove();
    }

    const isClosed = isSequenceClosed(segments);
    if (isClosed) {
      combinedPath.closePath();
    }

    const pathData = combinedPath.pathData;
    combinedPath.remove();

    return pathData;
  } catch (_error) {
    return null;
  }
}
