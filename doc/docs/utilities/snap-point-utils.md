---
id: snap-point-utils
title: Snap Point Utilities
sidebar_label: Snap Point Utilities
---

# Snap Point Utilities

The `snapPointUtils` module provides a unified set of functions and types for extracting and using snap points from the canvas elements.

Location:
- `src/utils/snapPointUtils.ts`

Key Concepts
- SnapPoint: A canonical representation of a point worth snapping to
  - `point` — canvas-space coordinates `{ x, y }`
  - `type` — one of: `anchor`, `midpoint`, `edge`, `bbox-corner`, `bbox-center` or `intersection`
  - `elementId` (optional) and `metadata` (e.g., command/point indices)

Common Utilities
- `distance(p1, p2)` — Euclidean distance between points in canvas coordinates
- `screenDistance(p1, p2, zoom)` — Screen-space distance (scaled by `zoom`)
- `midpoint(p1, p2)` — Returns midpoint between two points

Path and Geometry Helpers
- `extractAnchorPoints(element)` — Returns anchors (M/L/C points) from a path element
- `extractMidpoints(element)` — Returns midpoints for lines and curves
- `extractBBoxPoints(element, bounds)` — Returns bbox corners, center, and edge midpoints
- `extractLineSegments(element)` — Returns flat line segments (used for intersections and edge snap)

Snap Calculations
- `getAllSnapPoints(elements, getElementBounds, options?)` — Returns a list of SnapPoints; useful for caching and visualizing snap points.
  - `options` allow toggling anchors, midpoints, bbox corners/centers, and intersections
- `findClosestSnapPoint(position, snapPoints, threshold, zoom)` — Finds the closest snap point within the given threshold
- `findEdgeSnapPoint(position, element, threshold, zoom)` — Returns the closest point on a path edge (computed with a discrete approximation for Bezier curves)
- `findSnapPoint(point, elements, getElementBounds, threshold, zoom, options?)` — Higher-level helper that combines priority snap checks (anchors, midpoints, bbox, intersections) and optional edge snapping
- `findIntersections(elements)` — Computes intersection snap points between different elements
- `getSnapPointLabel(type)` — Returns a localized label for a `SnapPoint.type` used in user-facing feedback overlays

Notes & Performance
- Use `getAllSnapPoints` on mode activation and cache the results to avoid per-frame recapture of all snap points. The measure plugin and object-snap slice both use caching for performance.
- Edge snaps are expensive for curves: the code computes them only on-demand for pointer positions and only if no higher-priority point is found nearby.
- Use `screenDistance` and convert thresholds between screen-space and canvas-space using the viewport's `zoom`.

Example: Manual snap check

```ts
import { getAllSnapPoints, findClosestSnapPoint, findEdgeSnapPoint } from '../utils/snapPointUtils';

const boundsFn = (el) => calculateBounds(...);
const cachedPoints = getAllSnapPoints(elements, boundsFn, { snapToAnchors: true, snapToMidpoints: true });

// Find closest high-priority snap
const snap = findClosestSnapPoint(position, cachedPoints, threshold, viewport.zoom);

// Check edge snap only if no high-priority snap found
if (!snap) {
  for (const el of elements) {
    const edge = findEdgeSnapPoint(position, el, threshold, viewport.zoom);
    if (edge) {
      // use edge
    }
  }
}
```

Related utilities
- `src/overlays/SnapPointOverlay.tsx` — visualization components (crosses & active ring)
- `src/plugins/measure/SnapPointsCache.tsx` — helper to build the measure plugin's snap cache
- See `object-snap` and `measure` plugin docs for integration examples
