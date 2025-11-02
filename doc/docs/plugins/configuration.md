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

- **[Plugin Catalog](./catalog/select)**: Examples from built-in plugins
- **[Event Bus](../event-bus/overview)**: Cross-plugin communication
- **[API Reference](../api/create-api)**: Public API patterns
