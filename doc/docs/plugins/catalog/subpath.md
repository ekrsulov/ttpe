---
id: subpath
title: Subpath Plugin
sidebar_label: Subpath
---

# Subpath Plugin

**Purpose**: Manage individual subpaths within complex paths

## Overview

- Select individual subpaths
- Multi-select subpaths (constrained to single element)
- Delete subpaths
- Reorder subpaths
- Align and distribute subpaths
- Split subpaths into separate paths
- Reverse subpath direction
- Join selected subpaths into a single subpath

## Plugin Interaction Flow

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant SP as Subpath Plugin
    participant Store
    participant PP as Path Parser
    participant Canvas
    
    User->>UI: Select path with subpaths
    UI->>Store: setActivePlugin('subpath')
    SP->>PP: parseSubpaths(pathData)
    PP->>SP: Return subpath list
    SP->>Canvas: Highlight subpaths
    
    User->>UI: Click subpath
    UI->>SP: selectSubpath(index)
    SP->>Store: Set selectedSubpath
    Store->>Canvas: Highlight selected
    
    User->>UI: Extract subpath
    UI->>SP: extractSubpath()
    SP->>Store: Create new element
    Store->>Canvas: Render as separate path
```

## Handler

## Handler

Select subpaths within paths

## Keyboard Shortcuts

| Key | Action |
| --- | ------ |
| `Delete` | Delete selected subpath(s) |

## UI Contributions

### Panels

- Subpath list, align/distribute controls

### Overlays

- **SubpathOverlay**: Visual rendering of individual subpaths with selection highlights and manipulation controls

### Canvas Layers

- Subpath highlights and selection indicators

## Public APIs

The Subpath plugin exposes the following public APIs:

### `performPathSimplify()`

Simplifies the current path by reducing the number of points while maintaining the shape.

**Usage**:
```typescript
const api = useCanvasStore.getState().getPluginApi('subpath');
api.performPathSimplify();
```

### `performSubPathReverse()`

Reverses the direction of the current subpath.

**Usage**:
```typescript
const api = useCanvasStore.getState().getPluginApi('subpath');
api.performSubPathReverse();
```

### `performSubPathJoin()`

Joins selected subpaths together into a single subpath (within their element) or joins eligible adjacent subpaths inside a path element.

**Usage**:
```typescript
const api = useCanvasStore.getState().getPluginApi('subpath');
api.performSubPathJoin();
```

## Usage Examples

```typescript
// Activate the plugin
const state = useCanvasStore.getState();
state.setMode('subpath');

// Access plugin state
const subpathState = useCanvasStore(state => state.subpath);
```



## Implementation Details

**Location**: `src/plugins/subpath/`

**Files**:
- `index.ts`: Plugin definition
- `slice.ts`: Zustand slice (if applicable)
- `*Panel.tsx`: UI panels (if applicable) (reused for expandable variant when needed)
- `*Overlay.tsx`: Overlays (if applicable)

## Edge Cases & Limitations

- Implementation-specific constraints
- Performance considerations for large datasets
- Browser compatibility notes (if any)

## Related

- [Plugin System Overview](../overview)
- [Event Bus](../../event-bus/overview)

## Expandable Panel Behavior

When the sidebar is unpinned and Subpath mode is active, the bottom expandable panel shows the transversal `EditorPanel` content (shared stroke/fill/opacity controls). This avoids duplicating Subpath-specific UI while still giving quick access to styling properties. The plugin registers:

```ts
export const subpathPlugin: PluginDefinition<CanvasStore> = {
    id: 'subpath',
    metadata: { label: 'Subpath', icon: NodeIcon },
    expandablePanel: EditorPanel, // Reuse universal panel
    // other properties...
};
```


