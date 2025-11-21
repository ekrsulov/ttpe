---
id: configuration
title: Plugin Configuration
sidebar_label: Configuration
---

# Plugin Configuration

Advanced configuration options for plugins, including settings persistence, versioning, and security.

## Plugin Settings Pattern

Store plugin-specific settings in the plugin's slice:

```typescript
export interface MyPluginSlice {
  settings: {
    threshold: number;
    enabled: boolean;
    mode: 'fast' | 'accurate';
  };
  updateSettings: (partial: Partial<MyPluginSlice['settings']>) => void;
}

export const createMyPluginSlice: PluginSliceFactory = (set) => ({
  state: {
    settings: {
      threshold: 10,
      enabled: true,
      mode: 'fast',
    },
    updateSettings: (partial) => set((state) => ({
      settings: { ...state.settings, ...partial },
    })),
  },
});
```

## Persistence

Settings are automatically persisted if included in the base slice's persistence logic:

```typescript
// In baseSlice.ts
const persistedState = localStorage.getItem('ttpe-state');
if (persistedState) {
  const parsed = JSON.parse(persistedState);
  // Plugin slices are included if they were persisted
}
```

**What's persisted**:
- Plugin slice state (if plugin adds to persistence)
- Global settings
- User preferences

**Not persisted**:
- Transient UI state
- Event subscriptions
- Canvas services state

## Versioning

### Plugin Version Field (Optional)

```typescript
export const myPlugin: PluginDefinition = {
  id: 'my-plugin',
  version: '1.2.0', // Optional, for documentation
  metadata: { /* ... */ },
  // ...
};
```

### State Migration

Handle breaking changes in plugin state:

```typescript
export const createMyPluginSlice: PluginSliceFactory = (set, get, api) => {
  // Migrate old state if needed
  const currentState = get() as any;
  if (currentState.myPlugin && !currentState.myPlugin.version) {
    // Old version detected, migrate
    const migratedData = migrateV1ToV2(currentState.myPlugin.data);
    set({ myPlugin: { data: migratedData, version: 2 } });
  }
  
  return {
    state: {
      version: 2,
      data: [],
      // ...
    },
  };
};
```

## Security & Sandboxing

### Current State

All plugins run in the same JavaScript context with full access to:
- Zustand store
- DOM
- Window APIs
- Other plugin APIs

**Assumption**: Only trusted, vetted plugins are included in `CORE_PLUGINS`.

### Third-Party Plugin Considerations

If loading external plugins in the future:

1. **Web Worker Sandboxing**
   ```typescript
   const worker = new Worker('/plugins/third-party.js');
   worker.postMessage({ type: 'INIT', storeSnapshot });
   worker.onmessage = (event) => {
     if (event.data.type === 'UPDATE_STATE') {
       store.setState(event.data.payload);
     }
   };
   ```

2. **API Whitelist**
   ```typescript
   const safeContext: PluginApiContext = {
     store: {
       getState: () => pick(store.getState(), ['elements', 'selectedIds']),
       setState: (state) => {
         // Validate state before applying
         if (isValidState(state)) {
           store.setState(state);
         }
       },
       subscribe: store.subscribe,
     },
   };
   ```

3. **CSP Headers**
   ```html
   <meta http-equiv="Content-Security-Policy" 
         content="script-src 'self' https://trusted-cdn.com;">
   ```

## Performance Configuration

### Debounce/Throttle Settings

```typescript
export const createMyPluginSlice: PluginSliceFactory = (set) => {
  let timeoutId: number | null = null;
  
  return {
    state: {
      debouncedUpdate: (value: string) => {
        if (timeoutId !== null) clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => {
          set({ value });
          timeoutId = null;
        }, 300);
      },
    },
    cleanup: () => {
      if (timeoutId !== null) clearTimeout(timeoutId);
    },
  };
};
```

### Memoization

```typescript
canvasLayers: [
  {
    id: 'expensive-layer',
    placement: 'foreground',
    render: (context) => {
      // Memoize expensive calculations
      const computed = useMemo(() => {
        return expensiveComputation(context.elements);
      }, [context.elements]);
      
      return <g>{/* render using computed */}</g>;
    },
  },
],
```

## Plugin Hooks Configuration

Hooks allow plugins to execute React hooks when active or globally.

### Hook Definition

```typescript
import type { PluginHookContribution, PluginHooksContext } from '../../types/plugins';

export const usePencilDrawing = (context: PluginHooksContext) => {
  const { svgRef, emitPointerEvent, activePlugin, screenToCanvas } = context;
  
  useEffect(() => {
    if (activePlugin !== 'pencil') return;
    
    const handlePointerMove = (e: PointerEvent) => {
      if (e.buttons !== 1) return;
      const point = screenToCanvas(e.clientX, e.clientY);
      emitPointerEvent('pointermove', e, point);
    };
    
    window.addEventListener('pointermove', handlePointerMove);
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, [activePlugin, screenToCanvas, emitPointerEvent]);
};

// In plugin definition
export const pencilPlugin: PluginDefinition<CanvasStore> = {
  id: 'pencil',
  hooks: [
    {
      id: 'pencil-drawing',
      hook: usePencilDrawing,
      global: false, // Only when plugin is active
    },
  ],
};
```

### Global vs Tool-Scoped Hooks

```typescript
hooks: [
  {
    id: 'tool-specific',
    hook: useToolBehavior,
    global: false, // Only when this plugin is active (default)
  },
  {
    id: 'global-listener',
    hook: useGlobalGesture,
    global: true, // Always active, regardless of current plugin
  },
],
```

## Sidebar Panels Configuration

Declaratively configure sidebar panels.

### Basic Panel Configuration

```typescript
import type { PanelConfig } from '../../types/panel';
import { MyToolPanel } from './MyToolPanel';

export const myPlugin: PluginDefinition<CanvasStore> = {
  id: 'my-tool',
  sidebarPanels: [
    {
      key: 'my-tool',
      condition: (ctx) => !ctx.isInSpecialPanelMode && ctx.activePlugin === 'my-tool',
      component: MyToolPanel,
    },
  ],
};
```

### Panel Context

```typescript
interface PanelContext {
  activePlugin: string | null;
  isInSpecialPanelMode: boolean;
  // Additional context properties
}
```

## Behavior Flags Configuration

Control plugin interactions dynamically.

### Example: Preventing Selection

```typescript
export const drawingPlugin: PluginDefinition<CanvasStore> = {
  id: 'drawing',
  
  behaviorFlags: (store) => ({
    preventsSelection: store.drawing?.isActive ?? false,
    preventsSubpathInteraction: store.drawing?.isActive ?? false,
  }),
};
```

### Available Flags

```typescript
interface PluginBehaviorFlags {
  preventsSelection?: boolean;          // Prevents selection rectangle
  preventsSubpathInteraction?: boolean; // Prevents subpath overlays
}
```

## Subscribed Events Configuration

Control which pointer events a plugin receives.

### Default Behavior

By default, plugins only receive `pointerdown` events:

```typescript
// Implicit default
export const selectPlugin: PluginDefinition<CanvasStore> = {
  id: 'select',
  handler: (event, point, target, context) => {
    // Only receives pointerdown
  },
};
```

### Subscribe to Multiple Events

```typescript
export const pencilPlugin: PluginDefinition<CanvasStore> = {
  id: 'pencil',
  subscribedEvents: ['pointerdown', 'pointermove', 'pointerup'],
  
  handler: (event, point, target, context) => {
    switch (event.type) {
      case 'pointerdown':
        context.api.startPath(point);
        break;
      case 'pointermove':
        context.api.addPoint(point);
        break;
      case 'pointerup':
        context.api.finalizePath();
        break;
    }
  },
};
```

### Performance Considerations

- `pointermove`: Fires very frequently, can impact performance
- `pointerup`: Generally low frequency
- Only subscribe to events you actively use

## Context Menu Actions Configuration

Contribute actions to the floating context menu.

### Basic Action

```typescript
import { Copy } from 'lucide-react';

export const editPlugin: PluginDefinition<CanvasStore> = {
  id: 'edit',
  
  contextMenuActions: [
    {
      id: 'duplicate',
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
  ],
};
```

### Conditional Visibility

Return `null` to hide an action:

```typescript
contextMenuActions: [
  {
    id: 'advanced-action',
    action: (context) => {
      // Only show if certain conditions are met
      if (!context.hasSelection || context.selectedIds.length < 2) {
        return null;
      }
      
      return {
        id: 'advanced',
        label: 'Advanced Action',
        icon: Zap,
        onClick: () => { /* ... */ },
      };
    },
  },
],
```

### Danger Variant

```typescript
contextMenuActions: [
  {
    id: 'delete',
    action: (context) => ({
      id: 'delete',
      label: 'Delete',
      icon: Trash,
      variant: 'danger', // Red text/icon
      onClick: () => { /* ... */ },
    }),
  },
],
```

## Feature Flags

Conditional plugin features:

```typescript
export const createMyPluginSlice: PluginSliceFactory = (set, get, api) => ({
  state: {
    features: {
      experimentalMode: false,
      betaFeature: false,
    },
    toggleFeature: (feature: keyof Features) => {
      set((state) => ({
        features: { 
          ...state.features, 
          [feature]: !state.features[feature] 
        },
      }));
    },
  },
});
```

## Backward Compatibility

When changing plugin APIs:

### Deprecation Pattern

```typescript
createApi: (context) => ({
  // New method
  processData: (data: Data[]) => { /* ... */ },
  
  // Deprecated method (still works)
  /** @deprecated Use processData instead */
  process: (data: Data[]) => {
    console.warn('process() is deprecated, use processData()');
    return processData(data);
  },
});
```

### Version Detection

```typescript
const api = pluginManager.getPluginApi('other-plugin');
if (api && 'newMethod' in api) {
  api.newMethod();
} else if (api && 'oldMethod' in api) {
  api.oldMethod();
}
```

## Environment-Specific Configuration

```typescript
const isDev = process.env.NODE_ENV !== 'production';

export const myPlugin: PluginDefinition = {
  id: 'my-plugin',
  metadata: { label: 'My Plugin' },
  handler: (event, point, target, context) => {
    if (isDev) {
      console.log('Debug:', { event, point });
    }
    // ... normal handler logic
  },
};
```

## Next Steps

## Related

- **[Plugin Registration](./registration)**: Register plugins with the system
- **[Plugin Lifecycle](./lifecycle)**: Lifecycle hooks
- **[Plugin Catalog](./catalog/pencil)**: Examples from built-in plugins
- **[Event Bus](../event-bus/overview)**: Cross-plugin communication
- **[API Reference](../api/create-api)**: Public API patterns
