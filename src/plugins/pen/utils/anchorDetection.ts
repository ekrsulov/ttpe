import type { Point, CanvasElement, PathElement } from '../../../types';
import type { PenPath } from '../types';
import { pathDataToPenPath } from './pathConverter';

const HIT_THRESHOLD = 8; // pixels

/**
 * Find a path element under the cursor
 */
export function findPathAtPoint(
    point: Point,
    elements: CanvasElement[],
    scale: number
): { pathId: string; penPath: PenPath; subPathIndex: number } | null {
    const threshold = HIT_THRESHOLD / scale;

    // Iterate elements in reverse (top to bottom)
    for (let i = elements.length - 1; i >= 0; i--) {
        const element = elements[i];
        if (element.type !== 'path') continue;

        const pathElement = element as PathElement;

        // Check each subpath
        for (let subIndex = 0; subIndex < pathElement.data.subPaths.length; subIndex++) {
            const subPath = pathElement.data.subPaths[subIndex];
            const penPath = pathDataToPenPath(subPath, pathElement.id);

            // Check if point is close to any segment or anchor
            if (isPointNearPath(point, penPath, threshold)) {
                return { pathId: pathElement.id, penPath, subPathIndex: subIndex };
            }
        }
    }
    return null;
}

/**
 * Check if a point is near any part of the path
 */
function isPointNearPath(point: Point, path: PenPath, threshold: number): boolean {
    // Check anchors first
    if (findAnchorOnPath(point, path, threshold) !== null) return true;
    // Check segments
    if (findSegmentOnPath(point, path, threshold) !== null) return true;
    return false;
}

/**
 * Find a specific anchor on a path under the cursor
 */
export function findAnchorOnPath(
    point: Point,
    path: PenPath,
    threshold: number = HIT_THRESHOLD
): number | null {
    for (let i = 0; i < path.anchors.length; i++) {
        const anchor = path.anchors[i];
        const dist = distance(point, anchor.position);
        if (dist <= threshold) {
            return i;
        }
    }
    return null;
}

/**
 * Find a specific segment on a path under the cursor
 */
export function findSegmentOnPath(
    point: Point,
    path: PenPath,
    threshold: number = HIT_THRESHOLD
): { segmentIndex: number; t: number } | null {
    const anchors = path.anchors;
    if (anchors.length < 2) return null;

    // Iterate segments
    // If closed, we also check the closing segment
    const count = path.closed ? anchors.length : anchors.length - 1;

    for (let i = 0; i < count; i++) {
        const startAnchor = anchors[i];
        const endAnchor = anchors[(i + 1) % anchors.length];

        // Check if segment is straight or curved
        const isCurved = startAnchor.outHandle || endAnchor.inHandle;

        if (isCurved) {
            // Bezier curve distance check
            const cp1 = startAnchor.outHandle
                ? addPoints(startAnchor.position, startAnchor.outHandle)
                : startAnchor.position;
            const cp2 = endAnchor.inHandle
                ? addPoints(endAnchor.position, endAnchor.inHandle)
                : endAnchor.position;

            const t = getClosestPointOnBezier(point, startAnchor.position, cp1, cp2, endAnchor.position, threshold);
            if (t !== null) {
                return { segmentIndex: i, t };
            }
        } else {
            // Straight line distance check
            const t = getClosestPointOnLine(point, startAnchor.position, endAnchor.position, threshold);
            if (t !== null) {
                return { segmentIndex: i, t };
            }
        }
    }

    return null;
}

// --- Helper Functions ---

function distance(p1: Point, p2: Point): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function addPoints(p1: Point, p2: Point): Point {
    return { x: p1.x + p2.x, y: p1.y + p2.y };
}

/**
 * Get closest t on line segment if within threshold
 */
function getClosestPointOnLine(p: Point, a: Point, b: Point, threshold: number): number | null {
    const l2 = dist2(a, b);
    if (l2 === 0) return distance(p, a) <= threshold ? 0 : null;

    let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
    t = Math.max(0, Math.min(1, t));

    const projection = {
        x: a.x + t * (b.x - a.x),
        y: a.y + t * (b.y - a.y),
    };

    if (distance(p, projection) <= threshold) {
        return t;
    }
    return null;
}

function dist2(v: Point, w: Point): number {
    return (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
}

/**
 * Get closest t on cubic bezier if within threshold
 * Approximate solution using sampling
 */
function getClosestPointOnBezier(
    p: Point,
    p0: Point,
    p1: Point,
    p2: Point,
    p3: Point,
    threshold: number
): number | null {
    // Simple sampling approach for now
    // Can be optimized with recursive subdivision or analytical solution
    const samples = 20;
    let minDist = Infinity;
    let bestT = -1;

    for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        const pos = getBezierPoint(t, p0, p1, p2, p3);
        const dist = distance(p, pos);

        if (dist < minDist) {
            minDist = dist;
            bestT = t;
        }
    }

    // Refine search around bestT
    if (minDist <= threshold + 5) { // Broad check first
        const range = 1 / samples;
        const start = Math.max(0, bestT - range);
        const end = Math.min(1, bestT + range);
        const refinedSamples = 10;

        for (let i = 0; i <= refinedSamples; i++) {
            const t = start + (i / refinedSamples) * (end - start);
            const pos = getBezierPoint(t, p0, p1, p2, p3);
            const dist = distance(p, pos);

            if (dist < minDist) {
                minDist = dist;
                bestT = t;
            }
        }
    }

    if (minDist <= threshold) {
        return bestT;
    }
    return null;
}

function getBezierPoint(t: number, p0: Point, p1: Point, p2: Point, p3: Point): Point {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;

    return {
        x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
        y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
    };
}

/**
 * Find a handle on a path under the cursor
 * Returns the anchor index and handle type if found
 */
export function findHandleOnPath(
    point: Point,
    path: PenPath,
    scale: number
): { anchorIndex: number; handleType: 'in' | 'out' } | null {
    const threshold = HIT_THRESHOLD / scale;

    for (let i = 0; i < path.anchors.length; i++) {
        const anchor = path.anchors[i];

        // Check outHandle
        if (anchor.outHandle) {
            const handlePos = addPoints(anchor.position, anchor.outHandle);
            const dist = distance(point, handlePos);
            if (dist <= threshold) {
                return { anchorIndex: i, handleType: 'out' };
            }
        }

        // Check inHandle
        if (anchor.inHandle) {
            const handlePos = addPoints(anchor.position, anchor.inHandle);
            const dist = distance(point, handlePos);
            if (dist <= threshold) {
                return { anchorIndex: i, handleType: 'in' };
            }
        }
    }

    return null;
}
