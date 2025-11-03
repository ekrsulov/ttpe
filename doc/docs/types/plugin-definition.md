# Plugin Definition

Plugin definitions describe the complete structure and behavior of a TTPE plugin, including metadata, handlers, UI contributions, and state management.

## Core Plugin Interface

### PluginDefinition

The main plugin registration interface:

```typescript
interface PluginDefinition<TStore extends object = object> {
  id: string;
  metadata: {
    label: string;
    icon?: ComponentType<{ size?: number }>;
    cursor?: string;
  };
  handler?: (
    event: PointerEvent,
    point: Point,
    target: Element,
    context: PluginHandlerContext<TStore>
  ) => void;
  keyboardShortcuts?: CanvasShortcutMap;
  overlays?: PluginUIContribution[];
  canvasLayers?: CanvasLayerContribution[];
  panels?: PluginUIContribution[];
  actions?: PluginActionContribution[];
  slices?: PluginSliceFactory<TStore>[];
  createApi?: PluginApiFactory<TStore>;
}
```

## Metadata

### Plugin Metadata

Describes the plugin's visual representation:

```typescript
{
  metadata: {
    label: string;                              // Display name
    icon?: ComponentType<{ size?: number }>;    // Optional icon component
    cursor?: string;                            // CSS cursor when active
  }
}
```

**Example:**

```typescript
import { Pencil } from 'lucide-react';

{
  metadata: {
    label: 'Pencil Tool',
    icon: Pencil,
    cursor: 'crosshair',
  }
}
```

## Handler Function

### Pointer Event Handler

The main interaction handler for pointer events:

```typescript
handler?: (
  event: PointerEvent,
  point: Point,
  target: Element,
  context: PluginHandlerContext<TStore>
) => void;
```

**Parameters:**

- **event**: Raw PointerEvent from the browser
- **point**: Canvas-space coordinates (accounting for zoom/pan)
- **target**: DOM element under the pointer
- **context**: Plugin context with store access and APIs

**Example:**

```typescript
handler: (event, point, target, context) => {
  if (event.type === 'pointerdown') {
    const { addPath } = context.api;
    addPath({
      subPaths: [[
        { type: 'M', position: point },
      ]],
      strokeColor: '#000000',
      strokeWidth: 2,
    });
  }
}
```

## State Management

### PluginSliceFactory

Factory function for creating plugin state slices:

```typescript
type PluginSliceFactory<TStore extends object = object> = (
  set: StoreApi<TStore>['setState'],
  get: StoreApi<TStore>['getState'],
  api: StoreApi<TStore>
) => {
  state: Partial<TStore>;
  cleanup?: (
    set: StoreApi<TStore>['setState'],
    get: StoreApi<TStore>['getState'],
    api: StoreApi<TStore>
  ) => void;
};
```

**Returns:**

- **state**: Initial state to merge into the store
- **cleanup**: Optional cleanup function called when plugin is unregistered

**Example:**

```typescript
slices: [
  (set, get, api) => ({
    state: {
      pencilPoints: [],
      isPencilDrawing: false,
    },
    cleanup: (set) => {
      set({ pencilPoints: [], isPencilDrawing: false });
    },
  }),
]
```

## Public API

### PluginApiFactory

Factory for creating the plugin's public API:

```typescript
type PluginApiFactory<TStore extends object> = (
  context: PluginApiContext<TStore>
) => Record<string, (...args: never[]) => unknown>;
```

**Purpose:**

Exposes plugin functionality to other parts of the application without coupling to the store structure.

**Example:**

```typescript
createApi: (context) => ({
  startDrawing: () => {
    context.store.setState({ isPencilDrawing: true });
  },
  endDrawing: () => {
    context.store.setState({ isPencilDrawing: false });
  },
  getPoints: () => {
    return context.store.getState().pencilPoints;
  },
})
```

## Keyboard Shortcuts

### CanvasShortcutMap

Map of keyboard shortcuts to handlers:

```typescript
type CanvasShortcutMap = Record<
  string, 
  CanvasShortcutDefinition | CanvasShortcutHandler
>;
```

**Example:**

```typescript
keyboardShortcuts: {
  'p': {
    handler: (event, context) => {
      context.controller.setActiveTool('pencil');
    },
    options: {
      preventDefault: true,
    },
  },
  'Escape': (event, context) => {
    context.controller.clearSelection();
  },
}
```

## UI Contributions

### PluginUIContribution

Generic UI component contribution:

```typescript
interface PluginUIContribution<TProps = Record<string, unknown>> {
  id: string;
  component: ComponentType<TProps>;
  placement?: 'tool' | 'global';
}
```

**Placements:**

- **tool**: Shown when this plugin is active
- **global**: Always shown regardless of active tool

**Example:**

```typescript
overlays: [
  {
    id: 'pencil-settings',
    component: PencilSettings,
    placement: 'tool',
  },
]
```

### PluginActionContribution

Action bar contribution:

```typescript
interface PluginActionContribution<TProps = Record<string, unknown>> {
  id: string;
  component: ComponentType<TProps>;
  placement: 'top' | 'bottom';
}
```

**Example:**

```typescript
actions: [
  {
    id: 'pencil-clear',
    component: ClearButton,
    placement: 'top',
  },
]
```

## Canvas Layers

### CanvasLayerContribution

Custom rendering layer on the canvas:

```typescript
interface CanvasLayerContribution {
  id: string;
  placement?: CanvasLayerPlacement;
  render: (context: CanvasLayerContext) => ReactNode;
}
```

**Placements:**

```typescript
type CanvasLayerPlacement = 'background' | 'midground' | 'foreground';
```

- **background**: Behind all canvas elements
- **midground**: Between canvas elements
- **foreground**: In front of all canvas elements

**Example:**

```typescript
canvasLayers: [
  {
    id: 'pencil-preview',
    placement: 'foreground',
    render: (context) => {
      const { pencilPoints } = context;
      if (pencilPoints.length === 0) return null;
      
      return (
        <polyline
          points={pencilPoints.map(p => `${p.x},${p.y}`).join(' ')}
          stroke="#000000"
          fill="none"
        />
      );
    },
  },
]
```

## Complete Example

Here's a complete plugin definition:

```typescript
import { Pencil } from 'lucide-react';
import PencilSettings from './PencilSettings';
import PencilPreview from './PencilPreview';

const pencilPlugin: PluginDefinition = {
  id: 'pencil',
  
  metadata: {
    label: 'Pencil',
    icon: Pencil,
    cursor: 'crosshair',
  },
  
  handler: (event, point, target, context) => {
    if (event.type === 'pointerdown') {
      context.store.setState({ 
        isPencilDrawing: true,
        pencilPoints: [point],
      });
    } else if (event.type === 'pointermove') {
      const state = context.store.getState();
      if (state.isPencilDrawing) {
        context.store.setState({
          pencilPoints: [...state.pencilPoints, point],
        });
      }
    } else if (event.type === 'pointerup') {
      const state = context.store.getState();
      if (state.isPencilDrawing) {
        context.api.addPath({
          subPaths: [state.pencilPoints.map((p, i) => 
            i === 0 
              ? { type: 'M', position: p }
              : { type: 'L', position: p }
          )],
          strokeColor: '#000000',
          strokeWidth: 2,
        });
        context.store.setState({
          isPencilDrawing: false,
          pencilPoints: [],
        });
      }
    }
  },
  
  keyboardShortcuts: {
    'p': (event, context) => {
      context.controller.setActiveTool('pencil');
    },
    'Escape': (event, context) => {
      const state = context.store.getState();
      if (state.isPencilDrawing) {
        context.store.setState({
          isPencilDrawing: false,
          pencilPoints: [],
        });
      }
    },
  },
  
  overlays: [
    {
      id: 'pencil-settings',
      component: PencilSettings,
      placement: 'tool',
    },
  ],
  
  canvasLayers: [
    {
      id: 'pencil-preview',
      placement: 'foreground',
      render: PencilPreview,
    },
  ],
  
  slices: [
    (set, get, api) => ({
      state: {
        isPencilDrawing: false,
        pencilPoints: [],
        pencilStrokeWidth: 2,
        pencilStrokeColor: '#000000',
      },
      cleanup: (set) => {
        set({ 
          isPencilDrawing: false, 
          pencilPoints: [],
        });
      },
    }),
  ],
  
  createApi: (context) => ({
    startDrawing: () => {
      context.store.setState({ isPencilDrawing: true });
    },
    endDrawing: () => {
      context.store.setState({ isPencilDrawing: false });
    },
  }),
};
```

## See Also

- [Plugin Context](./plugin-context.md) - Context and APIs available to plugins
- [Plugin Contributions](./plugin-contributions.md) - Detailed contribution types
- [Shortcuts](./shortcuts.md) - Keyboard shortcut system
- [Plugin System Overview](../plugins/overview.md) - High-level architecture
