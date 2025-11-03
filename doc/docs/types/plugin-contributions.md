# Plugin Contributions

Plugin contributions define how plugins extend the UI and rendering layers of the canvas application.

## UI Contributions

### PluginUIContribution

Generic UI component contribution that can be placed in overlays or panels.

```typescript
interface PluginUIContribution<TProps = Record<string, unknown>> {
  id: string;                          // Unique identifier
  component: ComponentType<TProps>;    // React component
  placement?: 'tool' | 'global';       // When to show
}
```

**Placement Options:**

- **tool**: Component shown only when this plugin is the active tool
- **global**: Component always visible regardless of active tool

**Example:**

```typescript
import { Settings } from './components/Settings';

const uiContribution: PluginUIContribution = {
  id: 'pencil-settings',
  component: Settings,
  placement: 'tool',  // Only shown when pencil tool is active
};
```

### Overlays

Overlays are UI elements rendered on top of the canvas (e.g., settings panels, controls).

```typescript
overlays: [
  {
    id: 'transform-handles',
    component: TransformHandles,
    placement: 'tool',
  },
  {
    id: 'cursor-info',
    component: CursorInfo,
    placement: 'global',
  },
]
```

### Panels

Panels are UI elements in the sidebar or other panel areas.

```typescript
panels: [
  {
    id: 'layer-list',
    component: LayerList,
    placement: 'global',
  },
]
```

## Action Contributions

### PluginActionContribution

Action bar buttons for plugin-specific actions.

```typescript
interface PluginActionContribution<TProps = Record<string, unknown>> {
  id: string;                          // Unique identifier
  component: ComponentType<TProps>;    // React component (typically a button)
  placement: 'top' | 'bottom';         // Action bar position
}
```

**Placement:**

- **top**: Top action bar (primary actions)
- **bottom**: Bottom action bar (secondary actions)

**Example:**

```typescript
import { ClearButton } from './components/ClearButton';
import { ExportButton } from './components/ExportButton';

actions: [
  {
    id: 'clear-canvas',
    component: ClearButton,
    placement: 'top',
  },
  {
    id: 'export-svg',
    component: ExportButton,
    placement: 'bottom',
  },
]
```

## Canvas Layer Contributions

### CanvasLayerContribution

Custom rendering layers that draw directly on the SVG canvas.

```typescript
interface CanvasLayerContribution {
  id: string;
  placement?: CanvasLayerPlacement;
  render: (context: CanvasLayerContext) => ReactNode;
}
```

### CanvasLayerPlacement

Defines the z-order of the layer:

```typescript
type CanvasLayerPlacement = 'background' | 'midground' | 'foreground';
```

**Layer Order (back to front):**

1. **background**: Behind all canvas elements (e.g., grid, guides)
2. Canvas elements (paths, groups)
3. **midground**: Between canvas elements (rarely used)
4. **foreground**: In front of all elements (e.g., selection boxes, handles)

### CanvasLayerContext

Context provided to layer render functions:

```typescript
interface CanvasLayerContext extends CanvasControllerValue {
  canvasSize: { width: number; height: number };
  isSelecting: boolean;
  selectionStart: Point | null;
  selectionEnd: Point | null;
  selectedGroupBounds: Array<{ id: string; bounds: Bounds }>;
  dragPosition: Point | null;
  isDragging: boolean;
  getElementBounds: (element: CanvasElement) => Bounds | null;
  setDragStart: (point: Point | null) => void;
  pointPositionFeedback?: PointPositionFeedback;
}
```

## Canvas Layer Examples

### Background Layer (Grid)

```typescript
canvasLayers: [
  {
    id: 'grid',
    placement: 'background',
    render: (context) => {
      const { canvasSize, viewport } = context;
      const gridSize = 20;
      
      const lines = [];
      for (let x = 0; x < canvasSize.width; x += gridSize) {
        lines.push(
          <line
            key={`v${x}`}
            x1={x}
            y1={0}
            x2={x}
            y2={canvasSize.height}
            stroke="#ddd"
            strokeWidth={1 / viewport.zoom}
          />
        );
      }
      for (let y = 0; y < canvasSize.height; y += gridSize) {
        lines.push(
          <line
            key={`h${y}`}
            x1={0}
            y1={y}
            x2={canvasSize.width}
            y2={y}
            stroke="#ddd"
            strokeWidth={1 / viewport.zoom}
          />
        );
      }
      
      return <g>{lines}</g>;
    },
  },
]
```

### Foreground Layer (Selection Box)

```typescript
canvasLayers: [
  {
    id: 'selection-box',
    placement: 'foreground',
    render: (context) => {
      if (!context.isSelecting || !context.selectionStart || !context.selectionEnd) {
        return null;
      }
      
      const x = Math.min(context.selectionStart.x, context.selectionEnd.x);
      const y = Math.min(context.selectionStart.y, context.selectionEnd.y);
      const width = Math.abs(context.selectionEnd.x - context.selectionStart.x);
      const height = Math.abs(context.selectionEnd.y - context.selectionStart.y);
      
      return (
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          stroke="blue"
          strokeWidth={1}
          fill="blue"
          fillOpacity={0.1}
          pointerEvents="none"
        />
      );
    },
  },
]
```

### Foreground Layer (Transform Handles)

```typescript
canvasLayers: [
  {
    id: 'transform-handles',
    placement: 'foreground',
    render: (context) => {
      if (context.selectedGroupBounds.length === 0) {
        return null;
      }
      
      return context.selectedGroupBounds.map(({ id, bounds }) => {
        const handleSize = 8;
        const handles = [
          { x: bounds.x, y: bounds.y },                           // Top-left
          { x: bounds.x + bounds.width, y: bounds.y },            // Top-right
          { x: bounds.x, y: bounds.y + bounds.height },           // Bottom-left
          { x: bounds.x + bounds.width, y: bounds.y + bounds.height }, // Bottom-right
        ];
        
        return (
          <g key={id}>
            <rect
              x={bounds.x}
              y={bounds.y}
              width={bounds.width}
              height={bounds.height}
              stroke="blue"
              strokeWidth={2}
              fill="none"
            />
            {handles.map((handle, index) => (
              <rect
                key={index}
                x={handle.x - handleSize / 2}
                y={handle.y - handleSize / 2}
                width={handleSize}
                height={handleSize}
                fill="white"
                stroke="blue"
                strokeWidth={2}
                cursor="pointer"
              />
            ))}
          </g>
        );
      });
    },
  },
]
```

### Foreground Layer (Cursor Preview)

```typescript
canvasLayers: [
  {
    id: 'pencil-preview',
    placement: 'foreground',
    render: (context) => {
      const state = context.store?.getState();
      if (!state?.isPencilDrawing || !state?.pencilPoints?.length) {
        return null;
      }
      
      const points = state.pencilPoints.map(p => `${p.x},${p.y}`).join(' ');
      
      return (
        <polyline
          points={points}
          stroke="#000000"
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          pointerEvents="none"
        />
      );
    },
  },
]
```

## Component Props

### UI Component Props

Components in UI contributions typically receive these props:

```typescript
interface UIComponentProps {
  // Plugin-specific state from store
  [key: string]: any;
}
```

Components can access the store via hooks:

```typescript
function SettingsPanel() {
  const strokeWidth = useCanvasStore(state => state.strokeWidth);
  const setStrokeWidth = useCanvasStore(state => state.setStrokeWidth);
  
  return (
    <div>
      <label>Stroke Width</label>
      <input
        type="range"
        min="1"
        max="20"
        value={strokeWidth}
        onChange={(e) => setStrokeWidth(Number(e.target.value))}
      />
    </div>
  );
}
```

### Action Component Props

Action components are typically buttons with custom logic:

```typescript
function ClearButton() {
  const clearCanvas = useCanvasStore(state => state.clearCanvas);
  const elementCount = useCanvasStore(state => state.elements.length);
  
  return (
    <button
      onClick={clearCanvas}
      disabled={elementCount === 0}
      title="Clear Canvas"
    >
      Clear
    </button>
  );
}
```

## Contribution Patterns

### Conditional Rendering

Only render when relevant:

```typescript
canvasLayers: [
  {
    id: 'edit-handles',
    placement: 'foreground',
    render: (context) => {
      // Only render in edit mode
      if (context.mode !== 'edit') {
        return null;
      }
      
      // Render edit-specific UI
      return <EditHandles context={context} />;
    },
  },
]
```

### Performance Optimization

Memoize expensive renders:

```typescript
import { memo } from 'react';

const GridLayer = memo(({ canvasSize, viewport }: CanvasLayerContext) => {
  // Expensive grid generation
  const grid = generateGrid(canvasSize, viewport);
  return grid;
});

canvasLayers: [
  {
    id: 'grid',
    placement: 'background',
    render: (context) => <GridLayer {...context} />,
  },
]
```

### Multiple Layers

Plugins can contribute multiple layers:

```typescript
canvasLayers: [
  {
    id: 'grid-major',
    placement: 'background',
    render: renderMajorGrid,
  },
  {
    id: 'grid-minor',
    placement: 'background',
    render: renderMinorGrid,
  },
  {
    id: 'grid-axes',
    placement: 'background',
    render: renderAxes,
  },
]
```

## SVG Coordinate System

Canvas layers render in canvas coordinate space (not screen space):

```typescript
// Canvas coordinates (account for zoom/pan automatically)
<rect x={100} y={100} width={50} height={50} />

// Stroke width scaled by zoom (stays constant on screen)
// Note: For path elements, this behavior is controlled by the
// "Scale stroke with zoom" setting in Settings Panel
<rect strokeWidth={2 / viewport.zoom} />

// Hit testing (disable pointer events for overlays)
<rect pointerEvents="none" />
```

**Note on Stroke Scaling**: The application provides a user-configurable setting (`settings.scaleStrokeWithZoom`) that controls whether path element strokes scale with zoom. Plugin overlays typically use `strokeWidth / viewport.zoom` to maintain constant visual thickness, but path elements respect the user's preference.

## Best Practices

1. **Return null**: Return `null` when layer has nothing to render
2. **Memoize**: Use `memo()` for expensive layer renders
3. **Pointer Events**: Set `pointerEvents="none"` on non-interactive elements
4. **Scale Invariance**: Use `1 / viewport.zoom` for constant screen-space sizes
5. **Conditional Rendering**: Check context state before rendering
6. **Key Props**: Always provide `key` props in lists

## See Also

- [Plugin Definition](./plugin-definition.md) - Complete plugin structure
- [Plugin Context](./plugin-context.md) - Context available to layers
- [Canvas Elements](./canvas-elements.md) - Elements being rendered
- [Geometry](./geometry.md) - Coordinate types
