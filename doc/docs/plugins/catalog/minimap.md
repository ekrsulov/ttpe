---
id: minimap
title: Minimap Plugin
sidebar_label: Minimap
---

# Minimap Plugin

**Purpose**: Overview minimap for navigation in large canvases

## Overview

- Bird's-eye view of entire canvas
- Viewport indicator
- Click to jump to location
- Scales with canvas content
- Always visible (global panel)

## Plugin Interaction Flow

```mermaid
sequenceDiagram
    participant User
    participant MM as Minimap Plugin
    participant Store
    participant Canvas
    participant EB as Event Bus
    
    activate MM
    MM->>Store: Subscribe to viewport changes
    MM->>Store: Subscribe to elements changes
    MM->>Canvas: Create minimap overlay
    
    loop Continuous Updates
        Store->>MM: Viewport changed
        MM->>MM: Calculate thumbnail scale
        MM->>Canvas: Render minimap view
        MM->>Canvas: Draw viewport rectangle
    end
    
    User->>Canvas: Click minimap
    Canvas->>MM: handleMinimapClick(pos)
    MM->>Store: Calculate viewport position
    Store->>EB: Publish 'viewport:pan'
    EB->>Canvas: Update main canvas view
    MM->>Canvas: Update minimap viewport rect
    
    deactivate MM
```

## Handler

N/A (uses dedicated panel)

## Keyboard Shortcuts

No plugin-specific shortcuts.

## UI Contributions

### Panels

- Minimap view with viewport indicator

### Overlays

No overlays.

### Canvas Layers

No canvas layers.

## Public APIs

No public APIs exposed.

## Usage Examples

```typescript
// Activate the plugin
const state = useCanvasStore.getState();
state.setMode('minimap');

// Access plugin state
const minimapState = useCanvasStore(state => state.minimap);
```



## Implementation Details

**Location**: `src/plugins/minimap/`

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


