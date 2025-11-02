---
id: create-api
title: createApi Pattern
sidebar_label: createApi
---

# createApi Pattern

The `createApi` function allows plugins to expose public methods to other plugins.

## Basic Example

```typescript
createApi: (context) => ({
  calculateBounds: (elementId: string): Bounds | null => {
    const state = context.store.getState();
    const element = state.elements.find(e => e.id === elementId);
    return element ? computeBounds(element) : null;
  },
}),
```

## Accessing APIs

```typescript
const api = pluginManager.getPluginApi<MyAPI>('my-plugin');
if (api) {
  const result = api.calculateBounds('element-1');
}
```

## Best Practices

- Keep APIs minimal and focused
- Return immutable data
- Handle errors gracefully
- Document types thoroughly

See [Plugin Manager API](./plugin-manager) for more methods.
