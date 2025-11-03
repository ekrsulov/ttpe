# Viewport Types

Viewport types define the camera view and transformation state of the canvas.

## Viewport Interface

### Viewport

Represents the current view state of the canvas.

```typescript
interface Viewport {
  zoom: number;      // Zoom level (1.0 = 100%)
  panX: number;      // Horizontal pan offset in pixels
  panY: number;      // Vertical pan offset in pixels
}
```

## Properties

### zoom

The current zoom level as a multiplier.

**Type:** `number`

**Values:**
- `1.0` = 100% (actual size)
- `2.0` = 200% (zoomed in 2x)
- `0.5` = 50% (zoomed out to half)

**Range:** Typically constrained between `0.1` (10%) and `10.0` (1000%)

**Example:**

```typescript
const viewport: Viewport = {
  zoom: 1.5,  // 150% zoom
  panX: 0,
  panY: 0,
};
```

### panX

Horizontal pan offset in pixels (canvas space).

**Type:** `number`

**Values:**
- Positive: Canvas shifted right (view moved left)
- Negative: Canvas shifted left (view moved right)
- `0`: No horizontal offset

**Example:**

```typescript
const viewport: Viewport = {
  zoom: 1.0,
  panX: -200,  // View is panned 200px to the right
  panY: 0,
};
```

### panY

Vertical pan offset in pixels (canvas space).

**Type:** `number`

**Values:**
- Positive: Canvas shifted down (view moved up)
- Negative: Canvas shifted up (view moved down)
- `0`: No vertical offset

**Example:**

```typescript
const viewport: Viewport = {
  zoom: 1.0,
  panX: 0,
  panY: -100,  // View is panned 100px down
};
```

## Coordinate Transformations

### Screen to Canvas

Convert screen coordinates to canvas coordinates:

```typescript
function screenToCanvas(
  screenPoint: Point, 
  viewport: Viewport
): Point {
  return {
    x: (screenPoint.x - viewport.panX) / viewport.zoom,
    y: (screenPoint.y - viewport.panY) / viewport.zoom,
  };
}
```

### Canvas to Screen

Convert canvas coordinates to screen coordinates:

```typescript
function canvasToScreen(
  canvasPoint: Point, 
  viewport: Viewport
): Point {
  return {
    x: canvasPoint.x * viewport.zoom + viewport.panX,
    y: canvasPoint.y * viewport.zoom + viewport.panY,
  };
}
```

## Viewport Operations

### Zoom

#### Zoom In

```typescript
function zoomIn(viewport: Viewport, factor: number = 1.2): Viewport {
  return {
    ...viewport,
    zoom: Math.min(viewport.zoom * factor, 10.0),
  };
}
```

#### Zoom Out

```typescript
function zoomOut(viewport: Viewport, factor: number = 1.2): Viewport {
  return {
    ...viewport,
    zoom: Math.max(viewport.zoom / factor, 0.1),
  };
}
```

#### Zoom to Level

```typescript
function setZoom(viewport: Viewport, zoom: number): Viewport {
  return {
    ...viewport,
    zoom: Math.max(0.1, Math.min(zoom, 10.0)),
  };
}
```

#### Zoom to Point

Zoom while keeping a specific point stationary:

```typescript
function zoomToPoint(
  viewport: Viewport,
  point: Point,
  newZoom: number
): Viewport {
  const clampedZoom = Math.max(0.1, Math.min(newZoom, 10.0));
  const ratio = clampedZoom / viewport.zoom;
  
  return {
    zoom: clampedZoom,
    panX: point.x - (point.x - viewport.panX) * ratio,
    panY: point.y - (point.y - viewport.panY) * ratio,
  };
}
```

### Pan

#### Pan by Delta

```typescript
function pan(viewport: Viewport, deltaX: number, deltaY: number): Viewport {
  return {
    ...viewport,
    panX: viewport.panX + deltaX,
    panY: viewport.panY + deltaY,
  };
}
```

#### Pan to Center Point

```typescript
function panToCenter(
  viewport: Viewport,
  point: Point,
  canvasWidth: number,
  canvasHeight: number
): Viewport {
  return {
    ...viewport,
    panX: canvasWidth / 2 - point.x * viewport.zoom,
    panY: canvasHeight / 2 - point.y * viewport.zoom,
  };
}
```

### Fit to View

#### Zoom to Fit All

Zoom and pan to show all content:

```typescript
function zoomToFit(
  bounds: Bounds,
  canvasWidth: number,
  canvasHeight: number,
  padding: number = 50
): Viewport {
  const availableWidth = canvasWidth - padding * 2;
  const availableHeight = canvasHeight - padding * 2;
  
  const scaleX = availableWidth / bounds.width;
  const scaleY = availableHeight / bounds.height;
  const zoom = Math.min(scaleX, scaleY, 10.0);
  
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  
  return {
    zoom,
    panX: canvasWidth / 2 - centerX * zoom,
    panY: canvasHeight / 2 - centerY * zoom,
  };
}
```

#### Zoom to Selection

```typescript
function zoomToSelection(
  selectedBounds: Bounds,
  canvasWidth: number,
  canvasHeight: number
): Viewport {
  return zoomToFit(selectedBounds, canvasWidth, canvasHeight, 100);
}
```

## Usage Examples

### Initial Viewport

```typescript
const initialViewport: Viewport = {
  zoom: 1.0,  // 100%
  panX: 0,
  panY: 0,
};
```

### Mouse Wheel Zoom

```typescript
function handleWheel(
  event: WheelEvent,
  viewport: Viewport,
  canvasRect: DOMRect
): Viewport {
  const delta = -event.deltaY / 1000;
  const factor = 1 + delta;
  
  const mouseX = event.clientX - canvasRect.left;
  const mouseY = event.clientY - canvasRect.top;
  
  return zoomToPoint(viewport, { x: mouseX, y: mouseY }, viewport.zoom * factor);
}
```

### Pan with Mouse Drag

```typescript
function handleMouseDrag(
  viewport: Viewport,
  startPos: Point,
  currentPos: Point
): Viewport {
  const deltaX = currentPos.x - startPos.x;
  const deltaY = currentPos.y - startPos.y;
  
  return pan(viewport, deltaX, deltaY);
}
```

### Reset View

```typescript
function resetViewport(): Viewport {
  return {
    zoom: 1.0,
    panX: 0,
    panY: 0,
  };
}
```

## Viewport Constraints

### Clamping Zoom

```typescript
const MIN_ZOOM = 0.1;   // 10%
const MAX_ZOOM = 10.0;  // 1000%

function clampZoom(zoom: number): number {
  return Math.max(MIN_ZOOM, Math.min(zoom, MAX_ZOOM));
}
```

### Clamping Pan

Prevent panning beyond content bounds:

```typescript
function clampPan(
  viewport: Viewport,
  contentBounds: Bounds,
  canvasWidth: number,
  canvasHeight: number
): Viewport {
  const scaledWidth = contentBounds.width * viewport.zoom;
  const scaledHeight = contentBounds.height * viewport.zoom;
  
  const minPanX = canvasWidth - scaledWidth - contentBounds.x * viewport.zoom;
  const maxPanX = -contentBounds.x * viewport.zoom;
  
  const minPanY = canvasHeight - scaledHeight - contentBounds.y * viewport.zoom;
  const maxPanY = -contentBounds.y * viewport.zoom;
  
  return {
    ...viewport,
    panX: Math.max(minPanX, Math.min(viewport.panX, maxPanX)),
    panY: Math.max(minPanY, Math.min(viewport.panY, maxPanY)),
  };
}
```

## Store Integration

### Viewport in Store

```typescript
interface CanvasStore {
  viewport: Viewport;
  setViewport: (viewport: Viewport) => void;
  zoom: (factor: number) => void;
  pan: (deltaX: number, deltaY: number) => void;
  resetView: () => void;
}
```

### Viewport Actions

```typescript
const useCanvasStore = create<CanvasStore>((set, get) => ({
  viewport: { zoom: 1.0, panX: 0, panY: 0 },
  
  setViewport: (viewport) => set({ viewport }),
  
  zoom: (factor) => set((state) => ({
    viewport: {
      ...state.viewport,
      zoom: clampZoom(state.viewport.zoom * factor),
    },
  })),
  
  pan: (deltaX, deltaY) => set((state) => ({
    viewport: {
      ...state.viewport,
      panX: state.viewport.panX + deltaX,
      panY: state.viewport.panY + deltaY,
    },
  })),
  
  resetView: () => set({
    viewport: { zoom: 1.0, panX: 0, panY: 0 },
  }),
}));
```

## Performance Considerations

1. **Transform Caching**: Cache transformed coordinates when possible
2. **Throttle Updates**: Throttle viewport updates during rapid pan/zoom
3. **Coordinate Precision**: Round coordinates to prevent sub-pixel rendering
4. **Culling**: Use viewport bounds to cull off-screen elements

## See Also

- [Geometry](./geometry.md) - Point and coordinate types
- [Canvas Elements](./canvas-elements.md) - Elements that get transformed
- [Minimap Plugin](../plugins/catalog/minimap.md) - Viewport visualization
