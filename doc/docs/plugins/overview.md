---
id: overview
title: Plugin System Overview
sidebar_label: Overview
---

# Plugin System Overview

The plugin system is VectorNest's core extensibility mechanism. Every interactive tool and feature is implemented as a plugin, making the editor highly modular and maintainable.

## Philosophy

**Core provides infrastructure; plugins provide functionality.**

The canvas, event bus, store, and plugin manager are infrastructure. Selection, drawing tools, transforms, and even the grid are all plugins that can be added, removed, or replaced without touching core code.

## What is a Plugin?

A plugin is a module that:

1. **Handles user interactions** when active (pointer events)
2. **Contributes UI** (panels, overlays, toolbar actions)
3. **Manages state** via Zustand slices
4. **Exposes APIs** for other plugins to call
5. **Responds to shortcuts** when active
6. **Renders on canvas** via layer contributions

## Plugin Definition Structure

Located in `src/types/plugins.ts`:

```typescript
interface PluginDefinition<TStore> {
  // Required: Unique identifier
  id: string;
  
  // Required: Display metadata
  metadata: {
    label: string;           // Human-readable name
    icon?: ComponentType<{ size?: number }>;    // Icon component
    cursor?: string;         // CSS cursor (e.g., 'crosshair')
  };
  
  // Optional: Pointer event handler
  handler?: (
    event: PointerEvent,
    point: Point,
    target: Element,
    context: PluginHandlerContext<TStore>
  ) => void;
  
  // Optional: Keyboard shortcuts
  keyboardShortcuts?: CanvasShortcutMap;
  
  // Optional: UI contributions
  overlays?: PluginUIContribution[];
  canvasLayers?: CanvasLayerContribution[];
  panels?: PluginUIContribution[];
  actions?: PluginActionContribution[];
  
  // Optional: State management
  slices?: PluginSliceFactory<TStore>[];
  
  // Optional: Public API
  createApi?: PluginApiFactory<TStore>;
  
  // Optional: Expandable panel for bottom toolbar
  expandablePanel?: ComponentType;
}
```

### UI Contribution Types

```typescript
// Panels and Overlays
interface PluginUIContribution<TProps = Record<string, unknown>> {
  id: string;                         // Required: Unique identifier
  component: ComponentType<TProps>;   // Required: React component
  placement?: 'tool' | 'global';      // Optional: When to show
}

// Actions (Toolbar buttons)
interface PluginActionContribution<TProps = Record<string, unknown>> {
  id: string;                         // Required: Unique identifier
  component: ComponentType<TProps>;   // Required: React component
  placement: 'top' | 'bottom';        // Required: Toolbar position
}

// Canvas Layers
interface CanvasLayerContribution {
  id: string;                         // Required: Unique identifier
  placement?: 'background' | 'midground' | 'foreground';
  render: (context: CanvasLayerContext) => ReactNode;
}

// Expandable Panel (optional)
// Provides quick access to tool controls at the bottom when sidebar is unpinned
expandablePanel?: ComponentType;
```

### Expandable Panels

Expandable panels provide quick access to tool-specific controls when the sidebar is not pinned. They appear at the bottom center of the canvas with an expand/collapse toggle.

**Key Features:**
- Automatically hidden when sidebar is pinned
- Smooth expand/collapse animation
- Centered at bottom of canvas
- Accessible via chevron toggle button
- Reuses existing sidebar panels to avoid duplication

**Recommended Pattern (No Duplicated Components):**

Reuse the same sidebar panel component in the expandable area with its header hidden. This keeps a single source of truth for a tool's UI.

```ts
// In plugin definition (.ts file): prefer createElement to avoid JSX parsing issues
export const shapePlugin: PluginDefinition<CanvasStore> = {
  id: 'shape',
  metadata: { label: 'Shape', icon: ShapeIcon },
  // Sidebar uses <ShapePanel /> normally
  // Expandable uses the same component without the header/title
  expandablePanel: () => React.createElement(ShapePanel, { hideTitle: true }),
};

// Special case (Edit): create a tiny wrapper that maps store to props
export const editPlugin: PluginDefinition<CanvasStore> = {
  id: 'edit',
  metadata: { label: 'Edit', icon: EditIcon },
  expandablePanel: EditExpandablePanelWrapper, // returns <EditPanel {...props} />
};

// Select and Subpath show the transversal Editor panel in expandable mode
export const selectPlugin: PluginDefinition<CanvasStore> = {
  id: 'select',
  metadata: { label: 'Select', icon: CursorIcon },
  expandablePanel: EditorPanel,
};
export const subpathPlugin: PluginDefinition<CanvasStore> = {
  id: 'subpath',
  metadata: { label: 'Subpath', icon: NodeIcon },
  expandablePanel: EditorPanel,
};
```

**Usage Notes:**
- Keep the UI concise and focused on primary actions
- Use Chakra UI components for consistent theming
- Access tool state via Zustand store hooks
- The `ExpandableToolPanel` wrapper handles positioning and animation automatically
```

## Minimal Plugin Example

```typescript
// src/plugins/my-tool/index.ts
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { MyIcon } from 'lucide-react';

export const myToolPlugin: PluginDefinition<CanvasStore> = {
  id: 'my-tool',
  metadata: {
    label: 'My Tool',
    icon: MyIcon,
    cursor: 'crosshair',
  },
  handler: (event, point, target, context) => {
    console.log('User clicked at', point);
    // Update state via context.store
    const state = context.store.getState();
    state.someAction?.(point);
  },
};
```

## Complete Plugin Example

```typescript
// src/plugins/advanced-tool/index.ts
import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { AdvancedIcon } from 'lucide-react';
import { AdvancedPanel } from './AdvancedPanel';
import { AdvancedOverlay } from './AdvancedOverlay';
import { createAdvancedSlice } from './slice';

export const advancedToolPlugin: PluginDefinition<CanvasStore> = {
  id: 'advanced-tool',
  
  metadata: {
    label: 'Advanced Tool',
    icon: AdvancedIcon,
    cursor: 'pointer',
  },
  
  handler: (event, point, target, context) => {
    const { store, api, helpers } = context;
    const state = store.getState();
    
    // Access plugin's own slice
    if (state.advancedTool) {
      state.advancedTool.processPoint(point);
    }
    
    // Use helpers provided by canvas
    if (helpers.beginSelectionRectangle) {
      helpers.beginSelectionRectangle(point);
    }
  },
  
  keyboardShortcuts: {
    a: (event, context) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        const state = context.store.getState();
        state.advancedTool?.selectAll();
      }
    },
    Escape: (_event, context) => {
      const state = context.store.getState();
      state.advancedTool?.reset();
    },
  },
  
  overlays: [
    {
      id: 'advanced-tool-overlay',
      placement: 'tool', // Only shows when this tool is active
      component: AdvancedOverlay,
    },
  ],
  
  panels: [
    {
      id: 'advanced-tool-panel',
      placement: 'tool',
      component: AdvancedPanel,
    },
  ],
  
  canvasLayers: [
    {
      id: 'advanced-tool-layer',
      placement: 'foreground',
      render: (context) => {
        // Custom SVG rendering
        return (
          <g id="advanced-layer">
            <circle cx={100} cy={100} r={50} fill="blue" opacity={0.3} />
          </g>
        );
      },
    },
  ],
  
  actions: [
    {
      id: 'advanced-action',
      placement: 'bottom',  // 'top' or 'bottom' only
      component: AdvancedActionButton,
    },
  ],
  
  slices: [createAdvancedSlice],
  
  createApi: (context) => ({
    doSomething: (arg: string) => {
      console.log('Public API called with', arg);
      const state = context.store.getState();
      state.advancedTool?.doSomething(arg);
    },
    getSomething: () => {
      const state = context.store.getState();
      return state.advancedTool?.data ?? null;
    },
  }),
};
```

## Handler Context

When a plugin's handler is called, it receives a `PluginHandlerContext`:

```typescript
interface PluginHandlerContext<TStore> {
  // Zustand store access
  store: {
    getState: () => TStore;
    setState: (partial: Partial<TStore>) => void;
    subscribe: (listener: (state: TStore) => void) => () => void;
  };
  
  // Plugin's own public API (from createApi)
  api: Record<string, (...args: any[]) => any>;
  
  // Canvas helpers
  helpers: {
    beginSelectionRectangle?: (point: Point, shiftKey?: boolean) => void;
    updateSelectionRectangle?: (point: Point) => void;
    completeSelectionRectangle?: () => void;
    startShapeCreation?: (point: Point) => void;
    updateShapeCreation?: (point: Point, shiftPressed: boolean) => void;
    endShapeCreation?: () => void;
    isSmoothBrushActive?: boolean;
    // Extensible: other helpers can be added
  };
}
```

## Plugin Slice Pattern

Plugins contribute state via slices:

```typescript
// src/plugins/my-tool/slice.ts
import type { StateCreator } from 'zustand';
import type { PluginSliceFactory } from '../../types/plugins';

export interface MyToolSlice {
  myData: string[];
  mySettings: { enabled: boolean };
  addData: (item: string) => void;
  clearData: () => void;
}

export const createMyToolSlice: PluginSliceFactory = (set, get, api) => ({
  state: {
    myData: [],
    mySettings: { enabled: true },
    addData: (item) => set((state) => ({ 
      myData: [...state.myData, item] 
    })),
    clearData: () => set({ myData: [] }),
  },
  cleanup: (set, get, api) => {
    // Optional: cleanup when plugin is unregistered
    console.log('Cleaning up my tool slice');
  },
});
```

## Public API Pattern

Plugins can expose APIs for other plugins to call:

```typescript
// In plugin definition
createApi: (context) => ({
  // Public method
  calculateSomething: (input: number): number => {
    const state = context.store.getState();
    return input * 2 + (state.myTool?.multiplier ?? 1);
  },
  
  // Public getter
  isReady: (): boolean => {
    const state = context.store.getState();
    return state.myTool?.initialized ?? false;
  },
});

// In another plugin or component
const api = pluginManager.getPluginApi<MyToolAPI>('my-tool');
if (api) {
  const result = api.calculateSomething(42);
  console.log(result);
}

// Or via plugin manager proxy
pluginManager.callPluginApi('my-tool', 'calculateSomething', 42);
```

## Canvas Layer Contributions

Plugins can render custom SVG layers:

```typescript
canvasLayers: [
  {
    id: 'my-layer',
    placement: 'midground', // 'background' | 'midground' | 'foreground'
    render: (context: CanvasLayerContext) => {
      const { 
        elements, 
        selectedIds, 
        activePlugin, 
        viewport, 
        isElementHidden, 
        getElementBounds 
      } = context;
      
      // Only render if this plugin is active
      if (activePlugin !== 'my-tool') return null;
      
      return (
        <g id="my-custom-layer">
          {selectedIds.map(id => {
            const el = elements.find(e => e.id === id);
            if (!el) return null;
            
            const bounds = getElementBounds(el);
            return (
              <rect
                key={id}
                x={bounds.x}
                y={bounds.y}
                width={bounds.width}
                height={bounds.height}
                fill="none"
                stroke="blue"
                strokeWidth={2 / viewport.zoom}
              />
            );
          })}
        </g>
      );
    },
  },
],
```

## UI Contributions

### Panels

Sidebar panels that appear when the tool is active:

```typescript
panels: [
  {
    placement: 'tool', // or 'global' for always-visible
    component: MyToolPanel,
  },
],

// MyToolPanel.tsx
export const MyToolPanel: React.FC = () => {
  const myData = useCanvasStore(state => state.myTool?.myData);
  
  return (
    <Panel title="My Tool Settings">
      <div>Data count: {myData?.length ?? 0}</div>
    </Panel>
  );
};
```

### Overlays

React components rendered above the canvas:

```typescript
overlays: [
  {
    placement: 'global', // or 'tool'
    component: MyToolOverlay,
  },
],

// MyToolOverlay.tsx
export const MyToolOverlay: React.FC = () => {
  const isActive = useCanvasStore(state => state.activePlugin === 'my-tool');
  if (!isActive) return null;
  
  return (
    <div style={{ position: 'absolute', top: 10, right: 10 }}>
      <Badge>My Tool Active</Badge>
    </div>
  );
};
```

### Actions

Toolbar buttons and menu items:

```typescript
actions: [
  {
    id: 'my-action',
    placement: 'top', // 'top' or 'bottom'
    component: MyActionButton,
  },
],

// MyActionButton.tsx
const MyActionButton: React.FC = () => {
  const doSomething = useCanvasStore(state => state.myTool?.doSomething);
  const canDoSomething = useCanvasStore(state => state.myTool?.canDoSomething);
  
  return (
    <IconButton
      aria-label="Do Something"
      icon={<MyIcon />}
      onClick={doSomething}
      isDisabled={!canDoSomething}
    />
  );
};
```

## Keyboard Shortcuts

Plugins can register shortcuts that only work when the plugin is active:

```typescript
keyboardShortcuts: {
  // Simple key
  a: (event, context) => {
    if (event.ctrlKey) {
      event.preventDefault();
      // Select all logic
    }
  },
  
  // Named keys
  Delete: (event, context) => {
    const state = context.store.getState();
    state.myTool?.deleteSelected();
  },
  
  Escape: (event, context) => {
    const state = context.store.getState();
    state.myTool?.reset();
  },
  
  // Arrow keys
  ArrowUp: (event, context) => {
    if (event.shiftKey) {
      // Move faster
    } else {
      // Move normal
    }
  },
},
```

## Best Practices

### 1. Single Responsibility

Each plugin should do one thing well. Don't combine selection + drawing in one plugin.

### 2. State Isolation

Plugin state should live in the plugin's slice, not pollute the base slice.

```typescript
// ✅ Good
const myData = useCanvasStore(state => state.myPlugin?.myData);

// ❌ Bad
const myData = useCanvasStore(state => state.myPluginData);
```

### 3. Cleanup

If your plugin adds event listeners, intervals, or subscriptions, clean them up:

```typescript
slices: [
  (set, get, api) => ({
    state: { /* ... */ },
    cleanup: () => {
      // Remove event listeners, clear intervals, etc.
    },
  }),
],
```

### 4. Type Safety

Always type your plugin APIs and slices:

```typescript
export interface MyPluginAPI {
  doSomething: (arg: string) => void;
  getSomething: () => string | null;
}

createApi: (context): MyPluginAPI => ({ /* ... */ }),
```

### 5. Performance

- Memoize expensive computations in `render` functions
- Use `useCallback` and `useMemo` in panel components
- Debounce high-frequency updates

### 6. Accessibility

- Provide `aria-label` on UI elements
- Ensure keyboard navigation works
- Test with screen readers

## Common Patterns

### Pattern: Temporary State

For state that doesn't need persistence or undo:

```typescript
// Use React state in panels
const [tempValue, setTempValue] = useState(0);

// Or use a separate Zustand store
const useTempStore = create(() => ({ temp: 0 }));
```

### Pattern: Cross-Plugin Communication

```typescript
// Via shared store
const state = context.store.getState();
state.otherPlugin?.doSomething();

// Via plugin API
const api = pluginManager.getPluginApi('other-plugin');
api?.doSomething();

// Via event bus
pluginManager.registerInteractionHandler(
  'my-plugin',
  'pointermove',
  (payload) => {
    console.log('Pointer moved', payload.point);
  }
);
```

### Pattern: Conditional Rendering

```typescript
canvasLayers: [
  {
    id: 'conditional',
    placement: 'foreground',
    render: (context) => {
      const state = useCanvasStore.getState();
      
      // Only render when certain conditions are met
      if (!state.myPlugin?.showOverlay) return null;
      if (context.activePlugin !== 'my-plugin') return null;
      
      return <g>{/* ... */}</g>;
    },
  },
],
```

## Pitfalls & Gotchas

### 1. Handler Scope

Handlers receive the **active plugin ID** in the payload. Filter early:

```typescript
handler: (event, point, target, context) => {
  // This check is done by PluginManager when using event bus
  // But if you manually call executeHandler, ensure plugin is active
}
```

### 2. Store Access

Always use `context.store.getState()` for latest state, not closure variables:

```typescript
// ❌ Stale closure
const elements = context.store.getState().elements;
setTimeout(() => {
  console.log(elements); // Stale!
}, 1000);

// ✅ Fresh state
setTimeout(() => {
  const elements = context.store.getState().elements;
  console.log(elements); // Fresh!
}, 1000);
```

### 3. Slice Registration Timing

Slices are registered when `pluginManager.register()` is called. Access slice state **after** registration:

```typescript
pluginManager.register(myPlugin);

// ✅ Now you can access state
const state = useCanvasStore.getState();
console.log(state.myPlugin);
```

### 4. API Initialization

Plugin APIs are initialized **after** store is set. Don't call APIs during plugin registration:

```typescript
// ❌ API not ready yet
pluginManager.register(pluginA);
const api = pluginManager.getPluginApi('pluginA'); // undefined!

// ✅ Call after all plugins registered
pluginManager.register(pluginA);
pluginManager.setStoreApi(storeApi); // Initialize APIs
const api = pluginManager.getPluginApi('pluginA'); // ✅
```

## Next Steps

- **[Plugin Lifecycle](./lifecycle)**: Detailed lifecycle states and transitions
- **[Plugin Registration](./registration)**: How to register and discover plugins
- **[Plugin Configuration](./configuration)**: Advanced configuration options
- **[Plugin Catalog](./catalog/pencil)**: Reference for all built-in plugins
