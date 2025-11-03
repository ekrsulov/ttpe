---
id: registration
title: Plugin Registration
sidebar_label: Registration
---

# Plugin Registration

This document details the plugin registration mechanism, discovery patterns, and boot sequence.

## Registration Process

### Boot Sequence

```typescript
// main.tsx
import { pluginManager } from './utils/pluginManager';
import { CORE_PLUGINS } from './plugins';
import { canvasStoreApi } from './store/canvasStore';

// 1. Set store API
pluginManager.setStoreApi(canvasStoreApi);

// 2. Register all core plugins
CORE_PLUGINS.forEach((plugin) => {
  pluginManager.register(plugin);
});

// 3. Application ready
```

### Core Plugins Export

```typescript
// src/plugins/index.tsx
export const CORE_PLUGINS: PluginDefinition<CanvasStore>[] = [
  selectPlugin,
  pencilPlugin,
  textPlugin,
  shapePlugin,
  transformationPlugin,
  editPlugin,
  subpathPlugin,
  curvesPlugin,
  opticalAlignmentPlugin,
  guidelinesPlugin,
  gridPlugin,
  gridFillPlugin,
  minimapPlugin,
];
```

## Registration API

### `register(plugin: PluginDefinition): void`

Registers a plugin with the system.

```typescript
pluginManager.register({
  id: 'my-plugin',
  metadata: { label: 'My Plugin' },
  handler: (event, point, target, context) => {
    // Handle interactions
  },
  slices: [createMySlice],
  createApi: (context) => ({
    doSomething: () => { /* ... */ },
  }),
});
```

**Behavior**:
- If plugin ID already exists, unregisters old version first
- Applies slices immediately if store API is set
- Initializes plugin API if `createApi` provided
- Binds keyboard shortcuts
- Subscribes handler to event bus (if event bus available)
- Registers canvas layers

### `unregister(pluginId: string): void`

Removes a plugin from the system.

```typescript
pluginManager.unregister('my-plugin');
```

**Behavior**:
- Removes from registry
- Calls slice cleanup functions
- Unbinds keyboard shortcuts
- Unsubscribes from event bus
- Deletes plugin API
- Removes canvas layers

## Discovery Pattern

### Static Discovery

All plugins are explicitly imported and listed in `CORE_PLUGINS`:

```typescript
import { pencilPlugin } from './pencil';
import { textPlugin } from './text';
// ... more imports

export const CORE_PLUGINS = [
  pencilPlugin,
  textPlugin,
  // ... more plugins
];
```

**Pros**: Type-safe, explicit, tree-shakeable
**Cons**: Manual maintenance, no dynamic loading

### Dynamic Discovery (Future)

Not currently supported, but could be implemented:

```typescript
// Hypothetical dynamic plugin loading
async function loadPlugin(url: string): Promise<PluginDefinition> {
  const module = await import(url);
  return module.default;
}

const externalPlugin = await loadPlugin('/plugins/third-party.js');
pluginManager.register(externalPlugin);
```

**Security considerations**:
- Requires sandboxing (Web Workers or iframes)
- Need to validate plugin schema
- Restrict API access

## Plugin Ordering

Plugins are registered in array order, affecting:

1. **Canvas layer Z-index**: Earlier plugins' layers appear below later ones
2. **Action toolbar order**: Actions appear in registration order
3. **Panel stacking**: Multiple panels follow registration order

```typescript
// Earlier plugins render below
const CORE_PLUGINS = [
  gridPlugin,         // Renders first (bottom)
  guidelinesPlugin,   // Above grid
  selectPlugin,       // Above guidelines
  // ...
];
```

## Conditional Registration

Register plugins based on feature flags or user preferences:

```typescript
const plugins: PluginDefinition[] = [selectPlugin, pencilPlugin];

if (featureFlags.experimentalCurves) {
  plugins.push(curvesPlugin);
}

if (user.preferences.showMinimap) {
  plugins.push(minimapPlugin);
}

plugins.forEach(p => pluginManager.register(p));
```

## Re-registration

Re-registering a plugin replaces the old version:

```typescript
pluginManager.register(pluginV1);
// ... time passes
pluginManager.register(pluginV2); // Unregisters v1, registers v2
```

**Use cases**:
- Hot module replacement (HMR) in development
- A/B testing different plugin implementations
- Applying user configuration changes

## Validation

### ID Uniqueness

Plugin IDs must be unique. PluginManager enforces this by unregistering the old version when re-registering.

### Required Fields

```typescript
interface PluginDefinition {
  id: string;           // Required
  metadata: {           // Required
    label: string;      // Required
    icon?: React.ComponentType;
    cursor?: string;
  };
  // All other fields optional
}
```

TypeScript enforces this at compile time.

## Plugin Discovery Tools

### List Registered Plugins

```typescript
const allPlugins = pluginManager.getAll();
console.log(allPlugins.map(p => p.id));
// ['select', 'pencil', 'text', ...]
```

### Check if Plugin Exists

```typescript
const hasText = pluginManager.hasTool('text');
console.log(hasText); // true or false
```

### Get Plugin Definition

```typescript
const pencil = pluginManager.getPlugin('pencil');
if (pencil) {
  console.log(pencil.metadata.label); // "Pencil"
}
```

## Next Steps

- **[Plugin Configuration](./configuration)**: Advanced options
- **[Plugin Catalog](./catalog/select)**: Browse built-in plugins
- **[Event Bus](../event-bus/overview)**: How plugins interact
