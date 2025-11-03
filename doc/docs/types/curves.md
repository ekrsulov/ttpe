# Curves Types

Curves types define the data structures used by the Curves plugin for interactive Bézier curve creation and editing.

## Curve Point Types

### CurvePointType

Defines how a curve point handles its control handles:

```typescript
type CurvePointType = 'corner' | 'smooth' | 'asymmetric';
```

**Point Types:**

- **corner**: Handles are independent, allows sharp corners
- **smooth**: Handles are aligned and mirrored (symmetric)
- **asymmetric**: Handles are aligned but have different lengths

**Visual Comparison:**

```
Corner:           Smooth:           Asymmetric:
    ●─────           ●─────           ●─────
    │              ╱│╲               ╱│╲
  ──●           ──●  ●──          ──●   ●───
    │             ╲│╱               ╲│╱
    ●─────          ●─────            ●─────
```

### CurvePoint

Interactive point in curve creation/editing mode:

```typescript
interface CurvePoint {
  id: string;            // Unique identifier (UUID)
  x: number;             // X coordinate
  y: number;             // Y coordinate
  type: CurvePointType;  // Handle behavior
  handleIn?: Point;      // Incoming handle (before point)
  handleOut?: Point;     // Outgoing handle (after point)
  selected?: boolean;    // Selection state
}
```

**Properties:**

- **id**: Unique identifier for tracking during interactions
- **x, y**: Position of the anchor point
- **type**: Determines handle alignment behavior
- **handleIn**: Control point for incoming curve segment (optional)
- **handleOut**: Control point for outgoing curve segment (optional)
- **selected**: Whether this point is currently selected

**Example:**

```typescript
const curvePoint: CurvePoint = {
  id: crypto.randomUUID(),
  x: 100,
  y: 100,
  type: 'smooth',
  handleIn: { x: 75, y: 100 },
  handleOut: { x: 125, y: 100 },
  selected: true,
};
```

## Curve State

### CurveMode

Current state of the curve tool:

```typescript
type CurveMode = 
  | 'inactive'        // Tool not active
  | 'creating'        // Placing points to create new curve
  | 'editing'         // Editing existing curve
  | 'dragging_point'  // Dragging a point
  | 'dragging_handle' // Dragging a handle
```

**Mode Transitions:**

```
inactive ──(activate)──> creating
creating ──(finish)────> inactive
creating ──(select)────> editing
editing ──(drag)───────> dragging_point
editing ──(drag)───────> dragging_handle
dragging_* ──(release)-> editing
```

### CurveDragState

State during drag operations:

```typescript
interface CurveDragState {
  pointId: string;                    // ID of point being dragged
  dragType: CurveDragType;           // What is being dragged
  startPoint: Point;                  // Starting position
  startHandleIn?: Point;             // Original handleIn position
  startHandleOut?: Point;            // Original handleOut position
}
```

### CurveDragType

Type of drag operation:

```typescript
type CurveDragType = 
  | 'point'                    // Dragging the point itself
  | 'handle_in'                // Dragging incoming handle
  | 'handle_out'               // Dragging outgoing handle
  | 'adjust_curvature'         // Adjusting curve while creating
  | 'adjust_last_segment'      // Adjusting last segment
  | 'adjust_closing_segment'   // Adjusting closing segment
```

### CurveState

Complete state for the curve tool:

```typescript
interface CurveState {
  mode: CurveMode;               // Current mode
  isActive: boolean;             // Whether tool is active
  points: CurvePoint[];          // All points in current curve
  selectedPointId?: string;      // ID of selected point
  dragState?: CurveDragState;    // Current drag state (if dragging)
  previewPoint?: Point;          // Preview point under cursor
  previewHandle?: Point;         // Preview handle under cursor
  isClosingPath?: boolean;       // Whether closing the path
}
```

## Usage Examples

### Creating a New Curve

```typescript
// Initial state
const initialState: CurveState = {
  mode: 'inactive',
  isActive: false,
  points: [],
};

// Activate tool
const activeState: CurveState = {
  mode: 'creating',
  isActive: true,
  points: [],
};

// Add first point (click)
const firstPoint: CurvePoint = {
  id: crypto.randomUUID(),
  x: 100,
  y: 100,
  type: 'corner',
  selected: false,
};

// Add second point with handles (click-drag)
const secondPoint: CurvePoint = {
  id: crypto.randomUUID(),
  x: 200,
  y: 150,
  type: 'smooth',
  handleIn: { x: 175, y: 125 },
  handleOut: { x: 225, y: 175 },
  selected: false,
};

// State with points
const withPoints: CurveState = {
  mode: 'creating',
  isActive: true,
  points: [firstPoint, secondPoint],
};
```

### Editing a Point

```typescript
// Select a point
const editingState: CurveState = {
  mode: 'editing',
  isActive: true,
  points: [...existingPoints],
  selectedPointId: 'point-123',
};

// Start dragging handle
const draggingState: CurveState = {
  mode: 'dragging_handle',
  isActive: true,
  points: [...existingPoints],
  selectedPointId: 'point-123',
  dragState: {
    pointId: 'point-123',
    dragType: 'handle_out',
    startPoint: { x: 200, y: 150 },
    startHandleIn: { x: 175, y: 125 },
    startHandleOut: { x: 225, y: 175 },
  },
};
```

### Changing Point Type

```typescript
function changePointType(
  point: CurvePoint,
  newType: CurvePointType
): CurvePoint {
  const updated = { ...point, type: newType };
  
  if (newType === 'smooth' && point.handleIn && point.handleOut) {
    // Make handles symmetric
    const inVector = {
      x: point.x - point.handleIn.x,
      y: point.y - point.handleIn.y,
    };
    const length = Math.sqrt(inVector.x ** 2 + inVector.y ** 2);
    
    updated.handleOut = {
      x: point.x + inVector.x,
      y: point.y + inVector.y,
    };
  } else if (newType === 'corner') {
    // Handles stay independent
    // No changes needed
  }
  
  return updated;
}
```

### Converting to Path Commands

```typescript
function curvePointsToCommands(points: CurvePoint[]): Command[] {
  if (points.length === 0) return [];
  
  const commands: Command[] = [];
  
  // First point is always a Move
  commands.push({
    type: 'M',
    position: { x: points[0].x, y: points[0].y },
  });
  
  // Subsequent points are Cubic Bézier curves
  for (let i = 1; i < points.length; i++) {
    const prevPoint = points[i - 1];
    const currPoint = points[i];
    
    const cp1 = prevPoint.handleOut || { x: prevPoint.x, y: prevPoint.y };
    const cp2 = currPoint.handleIn || { x: currPoint.x, y: currPoint.y };
    
    commands.push({
      type: 'C',
      controlPoint1: {
        ...cp1,
        commandIndex: i,
        pointIndex: 0,
        anchor: { x: prevPoint.x, y: prevPoint.y },
        isControl: true,
      },
      controlPoint2: {
        ...cp2,
        commandIndex: i,
        pointIndex: 1,
        anchor: { x: currPoint.x, y: currPoint.y },
        isControl: true,
      },
      position: { x: currPoint.x, y: currPoint.y },
    });
  }
  
  return commands;
}
```

## Handle Calculations

### Mirror Handles (Smooth)

For smooth points, handles are mirrored:

```typescript
function mirrorHandle(
  anchor: Point,
  sourceHandle: Point
): Point {
  return {
    x: anchor.x + (anchor.x - sourceHandle.x),
    y: anchor.y + (anchor.y - sourceHandle.y),
  };
}

// Usage
const point: CurvePoint = {
  id: 'point-1',
  x: 100,
  y: 100,
  type: 'smooth',
  handleIn: { x: 80, y: 90 },
  handleOut: mirrorHandle(
    { x: 100, y: 100 },
    { x: 80, y: 90 }
  ), // Results in { x: 120, y: 110 }
};
```

### Align Handles (Asymmetric)

For asymmetric points, handles stay aligned but can have different lengths:

```typescript
function alignHandle(
  anchor: Point,
  sourceHandle: Point,
  targetLength: number
): Point {
  const dx = sourceHandle.x - anchor.x;
  const dy = sourceHandle.y - anchor.y;
  const sourceLength = Math.sqrt(dx * dx + dy * dy);
  
  if (sourceLength === 0) return anchor;
  
  const ratio = targetLength / sourceLength;
  
  return {
    x: anchor.x - dx * ratio,
    y: anchor.y - dy * ratio,
  };
}
```

## Preview State

### Preview Point

Show preview of where next point will be placed:

```typescript
const stateWithPreview: CurveState = {
  mode: 'creating',
  isActive: true,
  points: [firstPoint],
  previewPoint: { x: 200, y: 150 }, // Cursor position
};
```

### Preview Handle

Show preview of handle while dragging:

```typescript
const stateWithPreviewHandle: CurveState = {
  mode: 'creating',
  isActive: true,
  points: [firstPoint, secondPoint],
  previewHandle: { x: 225, y: 175 }, // Drag position
};
```

## Closing Paths

### Close Path State

```typescript
const closingState: CurveState = {
  mode: 'creating',
  isActive: true,
  points: [point1, point2, point3],
  isClosingPath: true, // Hovering over first point
};
```

### Close Path Logic

```typescript
function shouldClosePath(
  points: CurvePoint[],
  mousePos: Point,
  threshold: number = 10
): boolean {
  if (points.length < 3) return false;
  
  const firstPoint = points[0];
  const distance = Math.sqrt(
    (mousePos.x - firstPoint.x) ** 2 +
    (mousePos.y - firstPoint.y) ** 2
  );
  
  return distance < threshold;
}
```

## Store Integration

### Curve State in Store

```typescript
interface CanvasStore {
  curveState: CurveState;
  setCurveMode: (mode: CurveMode) => void;
  addCurvePoint: (point: CurvePoint) => void;
  updateCurvePoint: (id: string, updates: Partial<CurvePoint>) => void;
  finishCurve: () => void;
}
```

## Best Practices

1. **Unique IDs**: Always use unique IDs for curve points
2. **Type Consistency**: Enforce handle alignment based on point type
3. **Preview Feedback**: Show clear preview of next point/handle
4. **Close Path Affordance**: Highlight first point when hovering to close
5. **Handle Visibility**: Show handles for selected points only

## See Also

- [Geometry](./geometry.md) - Point and command types
- [Curves Plugin](../plugins/catalog/curves.md) - Plugin implementation
- [Edit Plugin](../plugins/catalog/edit.md) - Point editing after creation
- [Canvas Elements](./canvas-elements.md) - How curves become path elements
