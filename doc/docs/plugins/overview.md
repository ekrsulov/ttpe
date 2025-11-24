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
    label: string;
    icon?: ComponentType<{ size?: number }>;
    cursor?: string;
    disablePathInteraction?: boolean;
    pathCursorMode?: 'select' | 'default' | 'pointer';
  };
  
  // Optional: Canvas mode configuration
  modeConfig?: {
    description: string;
    entry?: ('clearGuidelines' | 'clearSubpathSelection' | 'clearSelectedCommands')[];
    exit?: ('clearGuidelines' | 'clearSubpathSelection' | 'clearSelectedCommands')[];
    transitions?: Record<string, { description: string }>;
    toggleTo?: string;
  };
  
  // Optional: Behavior flags
  behaviorFlags?: (store: TStore) => PluginBehaviorFlags;
  
  // Optional: Events to subscribe to
  subscribedEvents?: ('pointerdown' | 'pointermove' | 'pointerup')[];
  
  // Optional: Pointer event handler
  handler?: (
    event: PointerEvent,
    point: Point,
    target: Element,
    context: PluginHandlerContext<TStore>
  ) => void;
  
  // Optional: Double-click handlers
  onElementDoubleClick?: (
    elementId: string,
    event: MouseEvent<Element>,
    context: PluginHandlerContext<TStore>
  ) => void;
  onSubpathDoubleClick?: (
    elementId: string,
    subpathIndex: number,
    event: MouseEvent<Element>,
    context: PluginHandlerContext<TStore>
  ) => void;
  onCanvasDoubleClick?: (
    event: MouseEvent<Element>,
    context: PluginHandlerContext<TStore>
  ) => void;
  
  // Optional: Keyboard shortcuts
  keyboardShortcuts?: CanvasShortcutMap;
  
  // Optional: UI contributions
  overlays?: PluginUIContribution[];
  canvasLayers?: CanvasLayerContribution[];
  panels?: PluginUIContribution[];
  sidebarPanels?: PanelConfig[];
  actions?: PluginActionContribution[];
  relatedPluginPanels?: PluginPanelContribution[];
  
  // Optional: State management
  slices?: PluginSliceFactory<TStore>[];
  
  // Optional: Public API
  createApi?: PluginApiFactory<TStore>;
  
  // Optional: Hooks
  hooks?: PluginHookContribution[];
  
  // Optional: Expandable panel
  expandablePanel?: ComponentType;
  
  // Optional: Tool definition
  toolDefinition?: {
    order: number;
    visibility?: 'always-shown' | 'dynamic';
  };
  
  // Optional: Initialization
  init?: (context: PluginHandlerContext<TStore>) => (() => void) | void;
  
  // Optional: Helper functions
  registerHelpers?: (context: PluginHandlerContext<TStore>) => Record<string, any>;
  
  // Optional: Context menu actions
  contextMenuActions?: PluginContextMenuActionContribution[];
}
```

### UI Contribution Types

```typescript
// Panels and Overlays
interface PluginUIContribution<TProps = Record<string, unknown>> {
  id: string;                         // Required: Unique identifier
  component: ComponentType<TProps>;   // Required: React component
  placement?: 'tool' | 'global';      // Optional: When to show
  props?: TProps;                     // Optional: Props to pass
}

// Toolbar Actions
interface PluginActionContribution {
  id: string;
  component: ComponentType;
  placement: 'top' | 'bottom';
}

// Canvas Layers
interface CanvasLayerContribution {
  id: string;
  placement?: 'background' | 'midground' | 'foreground';
  render: (context: CanvasLayerContext) => ReactNode;
}
```

#### Overlays

Plugins can contribute overlays that appear on top of the canvas:

- **Tool Overlays**: Shown only when the plugin is active (`placement: 'tool'`)
- **Global Overlays**: Always visible regardless of active plugin (`placement: 'global'`)

Global overlays are useful for persistent UI elements like grids, guides, or status indicators that should remain visible across different tools.

#### Panels

Plugins can contribute panels to the sidebar or toolbar:

- **Sidebar Panels**: Declarative configuration via `sidebarPanels`
- **Toolbar Panels**: Via `panels` array with placement
- **Related Plugin Panels**: Panels contributed to other specific plugins via `relatedPluginPanels`

#### Actions

Toolbar actions appear in the top or bottom toolbar areas.

### Canvas Layers

Plugins can render directly on the canvas at different depths:

- **Background**: Behind all elements (grids, guides)
- **Midground**: Between elements and foreground (selection indicators)
- **Foreground**: On top of everything (cursors, tool previews)

## State Management

Plugins manage state through Zustand slices. Each plugin can define multiple slices that are dynamically added to the store.

```typescript
interface PluginSliceFactory<TStore> {
  key: string;
  factory: (set: SetState<TStore>, get: GetState<TStore>) => Record<string, unknown>;
}
```

Slices are registered when the plugin loads and can be accessed via `useCanvasStore(state => state[sliceKey])`.

## Plugin APIs

Plugins can expose public APIs for other plugins to use:

```typescript
interface PluginApiFactory<TStore> {
  (context: PluginHandlerContext<TStore>): Record<string, any>;
}
```

APIs are accessible via `pluginManager.getPluginApi(pluginId)` after all plugins are registered and the store is set.

## Lifecycle Management

### Initialization

The `init` method runs once when the plugin is registered:

```typescript
init: (context) => {
  // Setup code
  return () => {
    // Cleanup code
  };
}
```

### Hooks

Plugins can register React hooks that run during their lifecycle:

```typescript
interface PluginHookContribution {
  id: string;
  hook: (context: PluginHooksContext) => void;
  global?: boolean; // Run regardless of active plugin
}
```

Hooks receive canvas utilities and can manage DOM listeners or complex behavior.

## Sidebar Panels

Plugins can declaratively configure sidebar panels:

```typescript
interface PanelConfig {
  key: string;
  condition: (context: PanelContext) => boolean;
  component: ComponentType;
}
```

Panels appear when their condition is met, typically based on active plugin or mode.

## Helper Functions

Plugins can register helper functions accessible to other plugins:

```typescript
registerHelpers: (context) => ({
  helperName: (args) => { /* implementation */ }
})
```

Helpers are available in plugin contexts for cross-plugin communication.

## Behavior Flags

Plugins can control interactions with other systems:

```typescript
interface PluginBehaviorFlags {
  preventsSelection?: boolean;
  preventsSubpathInteraction?: boolean;
}
```

Flags dynamically modify core behavior based on plugin state.

## Event Subscription

By default, plugins receive `pointerdown` events. Additional events can be subscribed to:

```typescript
subscribedEvents: ['pointerdown', 'pointermove', 'pointerup']
```

## Context Menu Actions

Plugins can contribute actions to the floating context menu:

```typescript
interface PluginContextMenuActionContribution {
  id: string;
  action: (context: ContextMenuContext) => ContextMenuAction | null;
}
```

Actions can be conditional based on current selection or state.

## Mode Configuration

Plugins can define canvas mode behavior and transitions:

```typescript
modeConfig: {
  description: 'Drawing mode for creating shapes',
  entry: ['clearGuidelines', 'clearSubpathSelection'], // Actions on mode entry
  exit: ['clearGuidelines'], // Actions on mode exit
  transitions: {
    'select': { description: 'Switch to selection mode' }
  },
  toggleTo: 'select' // Mode to toggle to
}
```

## Double-Click Handlers

Plugins can handle double-click events at different levels:

```typescript
onElementDoubleClick: (elementId, event, context) => {
  // Handle double-click on specific element
},
onSubpathDoubleClick: (elementId, subpathIndex, event, context) => {
  // Handle double-click on subpath
},
onCanvasDoubleClick: (event, context) => {
  // Handle double-click on empty canvas
}
```

## Tool Definition

Plugins that appear as tools in the toolbar define their properties:

```typescript
toolDefinition: {
  order: 10, // Position in toolbar
  visibility: 'always-shown' // or 'dynamic' for adaptive visibility
}
```

## Keyboard Shortcuts

Plugins define shortcuts that are active when the plugin is active:

```typescript
keyboardShortcuts: {
  'KeyZ': {
    handler: (event, context) => { /* undo */ },
    options: { preventDefault: true }
  }
}
```

Shortcuts are scoped to the active plugin to avoid conflicts.

## Pitfalls & Gotchas

### 1. Handler Scope

Handlers should check if the plugin is active, though the plugin manager handles this automatically when using the event bus.

### 2. Store Access

Always get fresh state from the store, not from closures:

```typescript
// ❌ Stale closure
const elements = context.store.getState().elements;
setTimeout(() => console.log(elements), 1000); // Stale!

// ✅ Fresh state
setTimeout(() => {
  const elements = context.store.getState().elements;
  console.log(elements);
}, 1000);
```

### 3. Slice Registration Timing

Slices are registered during plugin registration. Access state after registration.

### 4. API Initialization

APIs are available after `pluginManager.setStoreApi()` is called.

## Next Steps

- **[Plugin Lifecycle](./lifecycle)**: Detailed lifecycle states and transitions
- **[Plugin Registration](./registration)**: How to register and discover plugins
- **[Plugin Configuration](./configuration)**: Advanced configuration options
- **[Plugin Catalog](./catalog/pencil)**: Reference for all built-in plugins

```typescript
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

## New Plugin Capabilities (Decoupled Architecture)

### Plugin Hooks

Plugins can now register React hooks that execute when the plugin is active. These hooks receive a context with canvas utilities and are ideal for managing DOM listeners or complex lifecycle behavior.

```typescript
import type { PluginHookContribution } from '../../types/plugins';

export const usePencilDrawingHook = (context: PluginHooksContext) => {
  const { svgRef, emitPointerEvent, activePlugin } => context;
  
  useEffect(() => {
    if (activePlugin !== 'pencil') return;
    
    const handlePointerMove = (e: PointerEvent) => {
      if (e.buttons !== 1) return;
      const point = screenToCanvas(e.clientX, e.clientY);
      emitPointerEvent('pointermove', e, point);
    };
    
    window.addEventListener('pointermove', handlePointerMove);
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, [activePlugin]);
};

// In plugin definition
export const pencilPlugin: PluginDefinition<CanvasStore> = {
  id: 'pencil',
  metadata: { label: 'Pencil', icon: Pen },
  hooks: [
    {
      id: 'pencil-drawing',
      hook: usePencilDrawingHook,
      global: false, // Only runs when plugin is active
    },
  ],
};
```

**Global Hooks**: Set `global: true` to run hooks regardless of active plugin:

```typescript
hooks: [
  {
    id: 'global-gesture-detector',
    hook: useGestureDetector,
    global: true, // Always runs
  },
],
```

### Sidebar Panels

Plugins can now declaratively configure sidebar panels without manual registration:

```typescript
import type { PanelConfig } from '../../types/panel';
import { PencilPanel } from './PencilPanel';

export const pencilPlugin: PluginDefinition<CanvasStore> = {
  id: 'pencil',
  metadata: { label: 'Pencil', icon: Pen },
  sidebarPanels: [
    {
      key: 'pencil',
      condition: (ctx) => !ctx.isInSpecialPanelMode && ctx.activePlugin === 'pencil',
      component: PencilPanel,
    },
  ],
};
```

**PanelConfig Interface**:
```typescript
interface PanelConfig {
  key: string;
  condition: (context: PanelContext) => boolean;
  component: ComponentType;
}
```

### Init Lifecycle

The `init` method runs once when the plugin is registered, and can return a cleanup function:

```typescript
export const transformationPlugin: PluginDefinition<CanvasStore> = {
  id: 'transformation',
  metadata: { label: 'Transform', icon: Move },
  
  init: (context) => {
    // Register global modifiers, listeners, etc.
    const modifier = {
      name: 'transformation',
      modify: () => { /* ... */ },
    };
    registerGlobalModifier(modifier);
    
    console.log('Transformation plugin initialized');
    
    // Return cleanup function
    return () => {
      unregisterGlobalModifier(modifier.name);
      console.log('Transformation plugin cleaned up');
    };
  },
};
```

**Use Cases**:
- Register global event listeners
- Initialize third-party libraries
- Set up canvas modifiers
- Configure external services

### Register Helpers

Plugins can expose helper functions that other plugins or core can use:

```typescript
export const shapePlugin: PluginDefinition<CanvasStore> = {
  id: 'shape',
  metadata: { label: 'Shape', icon: Square },
  
  registerHelpers: (context) => ({
    startShapeCreation: (point: Point) => {
      const state = context.store.getState();
      state.shape?.startCreation(point);
    },
    updateShapeCreation: (point: Point, shiftPressed: boolean) => {
      const state = context.store.getState();
      state.shape?.updateCreation(point, shiftPressed);
    },
    endShapeCreation: () => {
      const state = context.store.getState();
      state.shape?.endCreation();
    },
  }),
};
```

**Accessing Helpers**:
```typescript
// In another plugin's handler
handler: (event, point, target, context) => {
  if (context.helpers.startShapeCreation) {
    context.helpers.startShapeCreation(point);
  }
}
```

### Behavior Flags

Plugins can dynamically control interactions with other plugins:

```typescript
export interface PluginBehaviorFlags {
  preventsSelection?: boolean;
  preventsSubpathInteraction?: boolean;
}

export const measurePlugin: PluginDefinition<CanvasStore> = {
  id: 'measure',
  metadata: { label: 'Measure', icon: Ruler },
  
  behaviorFlags: (store) => ({
    preventsSelection: store.measure?.isActive ?? false,
    preventsSubpathInteraction: store.measure?.isActive ?? false,
  }),
};
```

**How It Works**: The core checks these flags before executing certain behaviors (e.g., starting a selection rectangle).

### Selection Strategies

Plugins can extend the selection system by registering custom selection strategies, enabling different selection behaviors like rectangular, lasso, or shape-based selection:

```typescript
import type { SelectionStrategy, SelectionData } from '../../canvas/selection/SelectionStrategy';

export class LassoSelectionStrategy implements SelectionStrategy {
  id = 'lasso';

  containsPoint(point: Point, selectionData: SelectionData): boolean {
    if (!selectionData.path || selectionData.path.length < 3) return false;
    return isPointInPolygon(point, selectionData.path);
  }

  intersectsBounds(bounds: Bounds, selectionData: SelectionData): boolean {
    if (!selectionData.path || selectionData.path.length < 3) return false;
    return isBoundsIntersectingPolygon(bounds, selectionData.path);
  }
}

export const lassoPlugin: PluginDefinition<CanvasStore> = {
  id: 'lasso',
  metadata: { label: 'Lasso', icon: Lasso },

  init: () => {
    // Register custom selection strategy
    selectionStrategyRegistry.register(new LassoSelectionStrategy());

    // Return cleanup function
    return () => {
      selectionStrategyRegistry.unregister('lasso');
    };
  },

  // Plugin continues with other configuration...
};
```

**SelectionStrategy Interface**:
```typescript
interface SelectionStrategy {
  id: string;
  containsPoint(point: Point, selectionData: SelectionData): boolean;
  intersectsBounds(bounds: Bounds, selectionData: SelectionData): boolean;
}

interface SelectionData {
  start: Point;
  end: Point;
  path?: Point[]; // For free-form selections
}
```

**How It Works**:
1. Plugins register strategies during `init()` lifecycle
2. Core selection system uses `selectionStrategyRegistry.get(strategyId)` to resolve strategies
3. Selection operations call strategy methods with `SelectionData`
4. Strategies implement custom logic (rectangular bounds, polygon containment, etc.)

**Use Cases**:
- **Lasso Selection**: Free-form path selection using ray-casting
- **Shape Selection**: Select elements within custom shapes
- **Magnetic Selection**: Snap-to-grid or snap-to-element selection
- **Color-based Selection**: Select elements by color properties

**Registry Pattern**:
```typescript
// Core provides default rectangular strategy
const selectionStrategyRegistry = new SelectionStrategyRegistry();

// Plugins can register additional strategies
selectionStrategyRegistry.register(new CustomSelectionStrategy());

// Core resolves strategies by ID
const strategy = selectionStrategyRegistry.get('lasso');
```

### Subscribed Events

By default, plugins only receive `pointerdown` events. Subscribe to additional events:

```typescript
export const pencilPlugin: PluginDefinition<CanvasStore> = {
  id: 'pencil',
  metadata: { label: 'Pencil', icon: Pen },
  
  subscribedEvents: ['pointerdown', 'pointermove', 'pointerup'],
  
  handler: (event, point, target, context) => {
    if (event.type === 'pointerdown') {
      context.api.startPath(point);
    } else if (event.type === 'pointermove') {
      context.api.addPointToPath(point);
    } else if (event.type === 'pointerup') {
      context.api.finalizePath();
    }
  },
};
```

**Performance Note**: Only subscribe to events you need. `pointermove` can fire frequently.

### Context Menu Actions

Plugins can contribute actions to the floating context menu:

```typescript
import type { PluginContextMenuActionContribution } from '../../types/plugins';
import { Copy, Trash } from 'lucide-react';

export const editPlugin: PluginDefinition<CanvasStore> = {
  id: 'edit',
  metadata: { label: 'Edit', icon: Edit },
  
  contextMenuActions: [
    {
      id: 'duplicate-selection',
      action: (context) => {
        if (!context.hasSelection) return null;
        
        return {
          id: 'duplicate',
          label: 'Duplicate',
          icon: Copy,
          onClick: () => {
            // Duplicate logic
          },
        };
      },
    },
    {
      id: 'delete-selection',
      action: (context) => {
        if (!context.hasSelection) return null;
        
        return {
          id: 'delete',
          label: 'Delete',
          icon: Trash,
          variant: 'danger',
          onClick: () => {
            // Delete logic
          },
        };
      },
    },
  ],
};
```

**Conditional Actions**: Return `null` from the action function to hide the action based on context.

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
