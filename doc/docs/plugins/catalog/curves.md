---
id: curves
title: Curves Plugin
sidebar_label: Curves
---

# Curves Plugin

**Purpose**: Advanced curve manipulation with lattice deformation

## Overview

- Lattice-based curve deformation
- Adjustable grid resolution
- Tension/smoothness controls
- Preview lattice grid
- Apply deformation to selected paths

## Plugin Interaction Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as UI/Panel
    participant CP as Curves Plugin
    participant Store as Canvas Store
    participant LG as Lattice Grid
    participant DM as Deformation Math
    participant EB as Event Bus
    participant Canvas
    
    User->>UI: Activate Curves Tool
    UI->>Store: setMode('curves')
    Store->>CP: activate()
    CP->>Store: Get selected paths
    CP->>LG: createLattice(bounds, resolution)
    LG->>CP: Return lattice control points
    CP->>Canvas: Draw lattice overlay
    
    User->>UI: Drag lattice point
    UI->>CP: handleLatticeMove(pointId, pos)
    CP->>DM: calculateDeformation(lattice, paths)
    DM->>CP: Return deformed paths
    CP->>Canvas: Update preview
    
    User->>UI: Apply deformation
    UI->>CP: applyDeformation()
    CP->>Store: updateElements(deformed)
    Store->>EB: Publish 'elements:deformed'
    EB->>Canvas: Final render
```

## Lattice System

```mermaid
graph TB
    L[Lattice Grid] --> CP[Control Points]
    CP --> R1[Row 1]
    CP --> R2[Row 2]
    CP --> R3[Row 3]
    R1 --> P1[Point 1,1]
    R1 --> P2[Point 1,2]
    R2 --> P3[Point 2,1]
    R2 --> P4[Point 2,2]
    
    CP --> DM[Deformation Math]
    DM --> BI[Bilinear Interpolation]
    DM --> BZ[Bezier Curves]
    BI --> AP[Apply to Paths]
    BZ --> AP
```

## Handler

## Handler

N/A (uses UI controls)

## Keyboard Shortcuts

No plugin-specific shortcuts.

## UI Contributions

### Panels

- Lattice grid controls, tension settings

### Overlays

No overlays.

### Canvas Layers

- Lattice visualization grid

## Public APIs

No public APIs exposed.

## Usage Examples

```typescript
// Activate the plugin
const state = useCanvasStore.getState();
state.setMode('curves');

// Access plugin state
const curvesState = useCanvasStore(state => state.curves);
```



## Implementation Details

**Location**: `src/plugins/curves/`

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


