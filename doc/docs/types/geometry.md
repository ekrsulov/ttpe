# Geometry Types

Geometry types define points, coordinates, control points, and path commands that form the foundation of vector graphics in Vectornest.

## Point Types

### Point

Basic 2D coordinate point.

```typescript
interface Point {
  x: number;
  y: number;
}
```

**Usage:**

```typescript
const origin: Point = { x: 0, y: 0 };
const destination: Point = { x: 100, y: 50 };
```

## Control Point Types

Control points are used for editing Bézier curves and managing curve continuity.

### ControlPointInfo

Metadata about a control point's location in a path structure.

```typescript
interface ControlPointInfo {
  commandIndex: number;              // Index in subPath array
  pointIndex: number;                // Index within command points
  anchor: Point;                     // Associated anchor point
  isControl: boolean;                // True if this is a control point
  associatedCommandIndex?: number;   // Command this control point belongs to
  associatedPointIndex?: number;     // Point index in associated command
}
```

### ControlPoint

Combines position and metadata.

```typescript
interface ControlPoint extends Point, ControlPointInfo {}
```

**Example:**

```typescript
const controlPoint: ControlPoint = {
  x: 50,
  y: 25,
  commandIndex: 1,
  pointIndex: 0,
  anchor: { x: 100, y: 50 },
  isControl: true,
  associatedCommandIndex: 1,
  associatedPointIndex: 0,
};
```

### ControlPointType

Alignment type for control point handles.

```typescript
type ControlPointType = 'independent' | 'aligned' | 'mirrored';
```

**Types:**

- **independent**: Control points move freely without affecting each other
- **aligned**: Control points stay collinear with anchor, but can have different lengths
- **mirrored**: Control points are symmetric around the anchor point

### ControlPointAlignmentInfo

Extended information about control point alignment (calculated on-demand).

```typescript
interface ControlPointAlignmentInfo {
  type: ControlPointType;
  pairedCommandIndex?: number;       // Index of paired control point's command
  pairedPointIndex?: number;         // Index of paired control point
  anchor: Point;                     // Anchor point both handles share
}
```

## Path Commands

Path commands follow a subset of SVG path specification, supporting only M, L, C, and Z commands.

### Command Type

Discriminated union of all supported path commands:

```typescript
type Command =
  | { type: 'M' | 'L'; position: Point }
  | { type: 'C'; controlPoint1: ControlPoint; controlPoint2: ControlPoint; position: Point }
  | { type: 'Z' };
```

### Command Types

#### Move (M)

Moves to a new point without drawing.

```typescript
{
  type: 'M',
  position: { x: 0, y: 0 }
}
```

#### Line (L)

Draws a straight line to a point.

```typescript
{
  type: 'L',
  position: { x: 100, y: 100 }
}
```

#### Cubic Bézier (C)

Draws a cubic Bézier curve with two control points.

```typescript
{
  type: 'C',
  controlPoint1: {
    x: 33,
    y: 0,
    commandIndex: 1,
    pointIndex: 0,
    anchor: { x: 0, y: 0 },
    isControl: true,
  },
  controlPoint2: {
    x: 67,
    y: 100,
    commandIndex: 1,
    pointIndex: 1,
    anchor: { x: 100, y: 100 },
    isControl: true,
  },
  position: { x: 100, y: 100 }
}
```

#### Close Path (Z)

Closes the current subpath by drawing a line back to the start.

```typescript
{ type: 'Z' }
```

**Note:** Vectornest only supports M, L, C, and Z commands. Quadratic Bézier (Q) and Arc (A) commands are not supported.

### SubPath

A sequence of commands forming a contiguous path:

```typescript
type SubPath = Command[];
```

**Example:**

```typescript
const subPath: SubPath = [
  { type: 'M', position: { x: 0, y: 0 } },
  { type: 'L', position: { x: 100, y: 0 } },
  { type: 'L', position: { x: 100, y: 100 } },
  { type: 'L', position: { x: 0, y: 100 } },
  { type: 'Z' },
];
```

## Curve Tool Types

Types specific to the Curves plugin for creating Bézier curves interactively.

### CurvePointType

Type of curve point determining handle behavior:

```typescript
type CurvePointType = 'corner' | 'smooth' | 'asymmetric';
```

- **corner**: Handles are independent, allows sharp corners
- **smooth**: Handles are aligned and mirrored (symmetric)
- **asymmetric**: Handles are aligned but have different lengths

### CurvePoint

Interactive point in curve creation mode:

```typescript
interface CurvePoint {
  id: string;                // Unique identifier
  x: number;
  y: number;
  type: CurvePointType;
  handleIn?: Point;          // Incoming handle (before point)
  handleOut?: Point;         // Outgoing handle (after point)
  selected?: boolean;        // Selection state
}
```

### CurveMode

State of the curve tool:

```typescript
type CurveMode = 
  | 'inactive' 
  | 'creating' 
  | 'editing' 
  | 'dragging_point' 
  | 'dragging_handle';
```

### CurveDragState

State during drag operations:

```typescript
interface CurveDragState {
  pointId: string;
  dragType: 
    | 'point' 
    | 'handle_in' 
    | 'handle_out' 
    | 'adjust_curvature' 
    | 'adjust_last_segment' 
    | 'adjust_closing_segment';
  startPoint: Point;
  startHandleIn?: Point;
  startHandleOut?: Point;
}
```

### CurveState

Complete state for curve tool:

```typescript
interface CurveState {
  mode: CurveMode;
  isActive: boolean;
  points: CurvePoint[];
  selectedPointId?: string;
  dragState?: CurveDragState;
  previewPoint?: Point;
  previewHandle?: Point;
  isClosingPath?: boolean;
}
```

## Viewport Types

### Viewport

Represents the current view state of the canvas.

```typescript
interface Viewport {
  zoom: number;      // Zoom level (1.0 = 100%)
  panX: number;      // Horizontal pan offset in pixels
  panY: number;      // Vertical pan offset in pixels
}
```

**Example:**

```typescript
const viewport: Viewport = {
  zoom: 1.5,   // 150% zoom
  panX: -100,  // Panned 100px left
  panY: -50,   // Panned 50px up
};
```

## Constants

### PATH_DECIMAL_PRECISION

Configurable decimal precision for path coordinates:

```typescript
const PATH_DECIMAL_PRECISION = 2;
```

Path coordinates are rounded to this many decimal places to prevent floating-point drift and reduce file size.

## Usage Examples

### Creating a Simple Path

```typescript
const rectanglePath: SubPath = [
  { type: 'M', position: { x: 0, y: 0 } },
  { type: 'L', position: { x: 100, y: 0 } },
  { type: 'L', position: { x: 100, y: 100 } },
  { type: 'L', position: { x: 0, y: 100 } },
  { type: 'Z' },
];
```

### Creating a Bézier Curve

```typescript
const curvePath: SubPath = [
  { type: 'M', position: { x: 0, y: 50 } },
  {
    type: 'C',
    controlPoint1: {
      x: 33,
      y: 0,
      commandIndex: 1,
      pointIndex: 0,
      anchor: { x: 0, y: 50 },
      isControl: true,
    },
    controlPoint2: {
      x: 67,
      y: 100,
      commandIndex: 1,
      pointIndex: 1,
      anchor: { x: 100, y: 50 },
      isControl: true,
    },
    position: { x: 100, y: 50 },
  },
];
```

## See Also

- [Canvas Elements](./canvas-elements.md) - How paths are stored in elements
- [Selection Types](./selection.md) - Selecting points and commands
- [Edit Plugin](../plugins/catalog/edit.md) - Interactive point editing
