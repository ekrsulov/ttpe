---
id: guidelines
title: Guidelines Plugin
sidebar_label: Guidelines
---

# Guidelines Plugin

**Purpose**: Smart guides for snapping elements to edges and centers

## Overview

- Smart edge and center guides
- Distance repetition detection
- Sticky mode for automatic snapping
- Zoom-scaled snap threshold
- Visual feedback lines

## Plugin Interaction Flow

```mermaid
sequenceDiagram
    participant User
    participant Canvas
    participant GP as Guidelines Plugin
    participant Store
    
    User->>Canvas: Start dragging element
    Canvas->>GP: findAlignmentGuidelines(elementId, bounds)
    GP->>Store: Read other elements
    Store->>GP: Return element bounds
    GP->>GP: Calculate edge/center matches
    GP->>Canvas: Return guideline matches
    Canvas->>Canvas: Draw guideline visuals
    
    User->>Canvas: Continue dragging
    Canvas->>GP: findDistanceGuidelines(elementId, bounds)
    GP->>GP: Detect repeated distances
    GP->>Canvas: Return distance matches
    Canvas->>Canvas: Draw distance indicators
    
    User->>Canvas: Release element (sticky snap enabled)
    Canvas->>GP: checkStickySnap(delta, projectedBounds)
    GP->>GP: Apply snap if within threshold
    GP->>Canvas: Return snapped position
    Canvas->>Store: Update element position
    
    User->>Canvas: Stop dragging
    Canvas->>GP: clearGuidelines()
    GP->>GP: Clear matches
    Canvas->>Canvas: Hide all guidelines
```

## Handler

## Handler

N/A (passive system)

## Keyboard Shortcuts

No plugin-specific shortcuts.

## UI Contributions

### Panels

- Guide settings, snap threshold, sticky mode

### Overlays

- **GuidelinesOverlay**: Visual guideline rendering showing alignment and distance guides during element drag

### Canvas Layers

- Visual guide lines

## Public APIs

No public APIs exposed.

## Usage Examples

```typescript
// Activate the plugin
const state = useCanvasStore.getState();
state.setMode('guidelines');

// Access plugin state
const guidelinesState = useCanvasStore(state => state.guidelines);
```



## Implementation Details

**Location**: `src/plugins/guidelines/`

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


