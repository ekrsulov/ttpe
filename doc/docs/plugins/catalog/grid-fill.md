---
id: grid-fill
title: Grid Fill Plugin
sidebar_label: Grid Fill
---

# Grid Fill Plugin

**Purpose**: Flood fill grid cells with shapes for tessellation

## Overview

- Fill individual grid cells
- Works with all grid types
- Rapid tessellation workflow
- Uses current fill color and opacity
- Multiple shape options

## Plugin Interaction Flow

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant GF as GridFill Plugin
    participant Store
    participant GG as Grid Generator
    participant Canvas
    
    User->>UI: Select element + GridFill tool
    UI->>GF: activate()
    GF->>UI: Show grid parameters panel
    
    User->>UI: Set rows=3, cols=3, spacing=10
    UI->>GF: setGridParams(params)
    GF->>GG: calculateGridPositions(element, params)
    GG->>GF: Return grid positions array
    GF->>Canvas: Draw preview grid
    
    User->>UI: Click "Apply"
    UI->>GF: applyGridFill()
    GF->>Store: cloneElement(count)
    GF->>Store: Position clones in grid
    Store->>Canvas: Render all instances
```

## Handler

## Handler

Click cells to fill with current shape/color

## Keyboard Shortcuts

No plugin-specific shortcuts.

## UI Contributions

### Panels

- Grid settings, fill color, shape selection

### Overlays

No overlays.

### Canvas Layers

- Grid overlay for cell identification

## Public APIs

The Grid Fill plugin exposes the following public API:

### `fillGridCell(point: Point)`

Fills a grid cell at the specified point with the current drawing tool.

**Parameters**:
- `point`: A `Point` object with `x` and `y` coordinates

**Usage**:
```typescript
const api = useCanvasStore.getState().getPluginApi('gridFill');
api.fillGridCell({ x: 100, y: 100 });
```

## Usage Examples

```typescript
// Activate the plugin
const state = useCanvasStore.getState();
state.setMode('grid-fill');

// Access plugin state
const grid-fillState = useCanvasStore(state => state.grid-fill);
```



## Implementation Details

**Location**: `src/plugins/grid-fill/`

**Files**:
- `index.ts`: Plugin definition
- `slice.ts`: Zustand slice (if applicable)
- `*Panel.tsx`: UI panels (if applicable)
- `*Overlay.tsx`: Overlays (if applicable)

## Edge Cases & Limitations

- Implementation-specific constraints
- Performance considerations for large datasets
- Browser compatibility notes (if any)

## Related

- [Plugin System Overview](../overview)
- [Event Bus](../../event-bus/overview)


