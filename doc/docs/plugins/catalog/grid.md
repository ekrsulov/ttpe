---
id: grid
title: Grid Plugin
sidebar_label: Grid
---

# Grid Plugin

**Purpose**: Display reference grids with optional snapping

## Overview

- Grid types: square, isometric, triangular, hexagonal, polar, diagonal, warped
- Customizable grid size and spacing
- Warp effects: sine2d, perlin2d, radial
- Optional snapping to grid
- Show/hide toggle

## Plugin Interaction Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as UI/Panel
    participant GP as Grid Plugin
    participant Store as Canvas Store
    participant EB as Event Bus
    participant Canvas as Canvas Renderer
    participant GG as Grid Generator
    participant SM as Snap Manager
    
    Note over User,Canvas: 1. Plugin Initialization (Always Active)
    activate GP
    GP->>Store: Initialize grid slice
    GP->>Store: Set default grid type (square)
    GP->>Store: Set visible = false
    GP->>EB: Subscribe to canvas events
    
    Note over User,Canvas: 2. Enable Grid Display
    User->>UI: Toggle "Show Grid" checkbox
    UI->>GP: setVisible(true)
    GP->>Store: Update grid.visible = true
    Store->>GG: requestGridGeneration()
    
    GG->>Store: Get canvas bounds
    GG->>Store: Get grid settings (type, size, spacing)
    
    alt Grid Type: Square
        GG->>GG: generateSquareGrid()
    else Grid Type: Isometric
        GG->>GG: generateIsometricGrid()
    else Grid Type: Hexagonal
        GG->>GG: generateHexagonalGrid()
    else Grid Type: Polar
        GG->>GG: generatePolarGrid()
    else Grid Type: Warped
        GG->>GG: generateWarpedGrid(warpType)
    end
    
    GG->>GP: Return grid line coordinates
    GP->>Store: Set grid lines data
    Store->>EB: Publish 'grid:updated'
    EB->>Canvas: Draw grid layer (behind elements)
    
    Note over User,Canvas: 3. Change Grid Type
    User->>UI: Select "Hexagonal" from dropdown
    UI->>GP: setGridType('hexagonal')
    GP->>Store: Update grid.type
    Store->>GG: Regenerate grid
    GG->>GG: generateHexagonalGrid()
    GG->>GP: Return new grid data
    GP->>Store: Update grid lines
    Store->>Canvas: Re-render grid
    
    Note over User,Canvas: 4. Adjust Grid Size
    User->>UI: Change grid size slider to 50px
    UI->>GP: setGridSize(50)
    GP->>Store: Update grid.size = 50
    Store->>GG: Regenerate with new size
    GG->>GP: Return scaled grid
    GP->>Store: Update grid lines
    Store->>Canvas: Re-render grid
    
    Note over User,Canvas: 5. Enable Snap to Grid
    User->>UI: Toggle "Snap to Grid" checkbox
    UI->>GP: setSnapEnabled(true)
    GP->>Store: Update grid.snapEnabled = true
    GP->>SM: Enable snap calculations
    
    Note over User,Canvas: 6. Drawing with Grid Snap
    User->>Canvas: Draw shape (e.g., with Pencil)
    Canvas->>EB: Publish 'pointer:move' event
    EB->>GP: Receive pointer position
    
    alt Snap Enabled
        GP->>SM: snapToGrid(position)
        SM->>SM: Find nearest grid point
        SM->>GP: Return snapped position
        GP->>EB: Publish 'position:snapped'
        EB->>Canvas: Update cursor to snapped pos
    else Snap Disabled
        GP->>Canvas: Use raw position
    end
    
    Note over User,Canvas: 7. Apply Warp Effect
    User->>UI: Select "Sine2D" warp effect
    UI->>GP: setWarpType('sine2d')
    GP->>Store: Update grid.warpType
    
    User->>UI: Adjust warp amplitude slider
    UI->>GP: setWarpAmplitude(value)
    GP->>Store: Update grid.warpAmplitude
    
    Store->>GG: Regenerate warped grid
    GG->>GG: Apply sine wave transformation
    GG->>GG: Calculate warped coordinates
    GG->>GP: Return warped grid data
    GP->>Store: Update grid lines
    Store->>Canvas: Re-render warped grid
    
    Note over User,Canvas: 8. Viewport Change (Auto-regenerate)
    User->>Canvas: Zoom or pan canvas
    Canvas->>EB: Publish 'viewport:changed'
    EB->>GP: Handle viewport change
    GP->>Store: Get new viewport bounds
    GP->>GG: Regenerate for visible area
    GG->>GP: Return optimized grid
    GP->>Store: Update grid lines
    Store->>Canvas: Re-render grid
    
    Note over User,Canvas: 9. Disable Grid
    User->>UI: Toggle "Show Grid" off
    UI->>GP: setVisible(false)
    GP->>Store: Update grid.visible = false
    Store->>Canvas: Clear grid layer
    
    deactivate GP
```

## Grid Generation Process

```mermaid
flowchart TD
    A[Grid Configuration] --> B{Grid Type?}
    
    B -->|Square| C1[Calculate Rows & Columns]
    B -->|Isometric| C2[Calculate Diamond Pattern]
    B -->|Triangular| C3[Calculate Triangle Vertices]
    B -->|Hexagonal| C4[Calculate Hex Cells]
    B -->|Polar| C5[Calculate Circles & Radials]
    B -->|Diagonal| C6[Calculate Diagonal Lines]
    
    C1 --> D1[Generate Vertical Lines]
    C1 --> D2[Generate Horizontal Lines]
    
    C2 --> E1[Calculate 30° Angles]
    C2 --> E2[Generate Diagonal Grid]
    
    C4 --> F1[Calculate Hex Centers]
    F1 --> F2[Generate Hex Edges]
    
    C5 --> G1[Generate Concentric Circles]
    G1 --> G2[Generate Radial Lines]
    
    D1 --> H{Warp Effect?}
    D2 --> H
    E1 --> H
    F2 --> H
    G1 --> H
    C3 --> H
    C6 --> H
    
    H -->|None| I[Use Original Coordinates]
    H -->|Sine2D| J[Apply Sine Wave]
    H -->|Perlin2D| K[Apply Perlin Noise]
    H -->|Radial| L[Apply Radial Distortion]
    
    I --> M[Generate Line Segments]
    J --> M
    K --> M
    L --> M
    
    M --> N{Visible Area Only?}
    N -->|Yes| O[Cull Off-Screen Lines]
    N -->|No| P[Keep All Lines]
    
    O --> Q[Return Grid Data]
    P --> Q
    
    Q --> R[Store in Plugin State]
    R --> S[Render to Canvas]
    
    style C4 fill:#e1f5ff
    style J fill:#ffe1e1
    style S fill:#e1ffe1
```

## Snap System

```mermaid
graph TB
    subgraph "Snap Manager"
        SM[Snap System]
        SM --> SE[snapEnabled: boolean]
        SM --> ST[snapThreshold: number]
        SM --> GC[gridCache: GridPoints]
    end
    
    subgraph "Snap Calculation"
        SC[Snap Process]
        SC --> GP[Get Pointer Position]
        GP --> FN[Find Nearest Grid Point]
        FN --> CD[Calculate Distance]
        CD --> CT{Distance < Threshold?}
        CT -->|Yes| SP[Return Snapped Point]
        CT -->|No| OP[Return Original Point]
    end
    
    subgraph "Grid State"
        GS[Grid Slice]
        GS --> GT[gridType: string]
        GS --> GZ[gridSize: number]
        GS --> SP2[spacing: number]
        GS --> WA[warpAmplitude: number]
        GS --> VI[visible: boolean]
    end
    
    SM --> SC
    GS --> SM
    SC --> GS
```

## Handler

N/A (visual aid)

## Keyboard Shortcuts

No plugin-specific shortcuts.

## UI Contributions

### Panels

- Grid type, size, warping parameters, snap settings

### Overlays

No overlays.

### Canvas Layers

- Grid visualization

## Public APIs

No public APIs exposed.

## Usage Examples

```typescript
// Activate the plugin
const state = useCanvasStore.getState();
state.setMode('grid');

// Access plugin state
const gridState = useCanvasStore(state => state.grid);
```



## Implementation Details

**Location**: `src/plugins/grid/`

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


