# Canvas Elements

This document describes the core types for canvas elements, geometry, and curves used throughout the TTPE application.

## Point

Represents a 2D point with x and y coordinates.

```typescript
interface Point {
  x: number;
  y: number;
}
```

## ControlPoint

Extends Point with additional properties for Bézier curve control points.

```typescript
interface ControlPoint extends Point {
  /** Whether this control point is active/selected */
  active?: boolean;
  /** Whether this control point is mirrored */
  mirrored?: boolean;
  /** Reference to the mirrored control point */
  mirrorOf?: string;
}
```

## Command

Represents a single command in an SVG path data string.

```typescript
interface Command {
  /** The command type (M, L, C, Q, Z, etc.) */
  type: string;
  /** The x coordinate */
  x: number;
  /** The y coordinate */
  y: number;
  /** Control point x for curves */
  x1?: number;
  /** Control point y for curves */
  y1?: number;
  /** Second control point x for cubic curves */
  x2?: number;
  /** Second control point y for cubic curves */
  y2?: number;
  /** Whether this is a relative command */
  relative?: boolean;
}
```

## PathData

Represents the complete path data for an SVG path element.

```typescript
interface PathData {
  /** Array of path commands */
  commands: Command[];
  /** Whether the path is closed */
  closed: boolean;
}
```

## CanvasElement

The base interface for all elements that can be rendered on the canvas.

```typescript
interface CanvasElement {
  /** Unique identifier for the element */
  id: string;
  /** The type of element */
  type: string;
  /** Position and transformation data */
  transform: {
    x: number;
    y: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
  };
  /** Style properties */
  style: {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    opacity?: number;
  };
  /** Whether the element is visible */
  visible: boolean;
  /** Whether the element is locked */
  locked: boolean;
  /** Element-specific data */
  data: Record<string, any>;
}
```

## Viewport

Represents the current view state of the canvas.

```typescript
interface Viewport {
  /** The x offset of the viewport */
  x: number;
  /** The y offset of the viewport */
  y: number;
  /** The zoom level */
  zoom: number;
  /** The width of the viewport */
  width: number;
  /** The height of the viewport */
  height: number;
}
```

## Curve Types

### CurveType

Enumeration of supported curve types for the curve tool.

```typescript
type CurveType = 'cubic' | 'quadratic' | 'arc';
```

### CurvePoint

Represents a point in a curve with its control points.

```typescript
interface CurvePoint {
  /** The main point */
  point: Point;
  /** Control point for quadratic curves */
  control?: Point;
  /** First control point for cubic curves */
  control1?: Point;
  /** Second control point for cubic curves */
  control2?: Point;
  /** Type of curve segment */
  type: CurveType;
}
```

### CurveData

Represents the data for a curve element.

```typescript
interface CurveData {
  /** Array of curve points */
  points: CurvePoint[];
  /** Whether the curve is closed */
  closed: boolean;
  /** The type of curve */
  curveType: CurveType;
}
```

## Usage Examples

### Creating a Path Element

```typescript
const pathElement: CanvasElement = {
  id: 'path-1',
  type: 'path',
  transform: { x: 100, y: 100, rotation: 0, scaleX: 1, scaleY: 1 },
  style: { fill: 'none', stroke: '#000', strokeWidth: 2 },
  visible: true,
  locked: false,
  data: {
    pathData: {
      commands: [
        { type: 'M', x: 0, y: 0 },
        { type: 'L', x: 100, y: 0 },
        { type: 'L', x: 100, y: 100 },
        { type: 'Z', x: 0, y: 0 }
      ],
      closed: true
    }
  }
};
```

### Working with Curves

```typescript
const curveData: CurveData = {
  points: [
    {
      point: { x: 0, y: 0 },
      control1: { x: 25, y: -25 },
      control2: { x: 75, y: -25 },
      type: 'cubic'
    },
    {
      point: { x: 100, y: 0 },
      control1: { x: 125, y: 25 },
      control2: { x: 175, y: 25 },
      type: 'cubic'
    }
  ],
  closed: false,
  curveType: 'cubic'
};
```
