---
id: grid
title: Grid Plugin
sidebar_label: Grid
---

# Grid Plugin

**Purpose**: Display reference grids with optional snapping

## Overview

A comprehensive grid visualization and snapping system supporting multiple grid types, from classic square grids to advanced parametric warped grids.

**Features**:
- Grid types: square, dots, isometric, triangular, hexagonal, polar, diagonal, parametric
- Customizable grid spacing and visual properties
- Parametric warp effects: sine2d, perlin2d, radial
- Optional snapping to grid with type-specific algorithms
- Show/hide toggle with opacity control
- Coordinate rulers

## Plugin Interaction Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as Grid Panel
    participant GP as Grid Plugin
    participant Store as Canvas Store
    participant Overlay as Grid Overlay
    participant Canvas
    
    Note over User,Canvas: 1. Plugin Initialization
    GP->>Store: Initialize grid slice
    GP->>Store: Set defaults (enabled, square, 20px, snap enabled, rulers shown)
    
    Note over User,Canvas: 2. Enable Grid Display
    User->>UI: Toggle "Show" checkbox
    UI->>GP: updateGridState({ enabled: true })
    GP->>Store: Update grid.enabled = true
    Store->>Overlay: Trigger re-render
    Overlay->>Overlay: Generate grid lines
    Overlay->>Canvas: Draw grid (background layer)
    
    Note over User,Canvas: 3. Change Grid Type
    User->>UI: Select "Hexagonal" from dropdown
    UI->>GP: updateGridState({ type: 'hexagonal' })
    GP->>Store: Update grid.type
    Store->>Overlay: Trigger re-render
    Overlay->>Overlay: Generate hexagonal pattern
    Overlay->>Canvas: Redraw grid
    
    Note over User,Canvas: 4. Adjust Spacing
    User->>UI: Move spacing slider to 40px
    UI->>GP: updateGridState({ spacing: 40 })
    GP->>Store: Update grid.spacing
    Store->>Overlay: Trigger re-render
    Overlay->>Canvas: Redraw with new spacing
    
    Note over User,Canvas: 5. Enable Snap to Grid
    User->>UI: Toggle "Snap" checkbox
    UI->>GP: updateGridState({ snapEnabled: true })
    GP->>Store: Update grid.snapEnabled = true
    
    Note over User,Canvas: 6. Drawing with Grid Snap
    User->>Canvas: Move pointer while drawing
    Canvas->>GP: snapToGrid(x, y)
    
    alt Snap Enabled
        GP->>GP: Calculate nearest grid point
        GP->>GP: Apply grid-type-specific algorithm
        GP->>Canvas: Return snapped coordinates
        Canvas->>Canvas: Use snapped position
    else Snap Disabled
        GP->>Canvas: Return original coordinates
    end
    
    Note over User,Canvas: 7. Apply Parametric Warp
    User->>UI: Select "Parametric" grid type
    UI->>GP: updateGridState({ type: 'parametric' })
    User->>UI: Select "Sine2D" warp kind
    UI->>GP: Update parametricWarp.kind
    User->>UI: Adjust amplitude sliders
    UI->>GP: Update parametricWarp.ampX, ampY
    GP->>Store: Update warp parameters
    Store->>Overlay: Trigger re-render
    Overlay->>Overlay: Calculate displacement field
    Overlay->>Overlay: Apply warp to grid
    Overlay->>Canvas: Draw warped grid
    
    Note over User,Canvas: 8. Viewport Changes
    User->>Canvas: Zoom or pan
    Canvas->>Overlay: Pass new viewport state
    Overlay->>Overlay: Recalculate visible grid area
    Overlay->>Canvas: Redraw optimized grid
```

## Grid Type System

```mermaid
graph TB
    subgraph "Grid Types"
        GT[Grid Type Selection]
        GT --> T1[Square/Dots]
        GT --> T2[Isometric]
        GT --> T3[Triangular]
        GT --> T4[Hexagonal]
        GT --> T5[Polar]
        GT --> T6[Diagonal]
        GT --> T7[Parametric]
    end
    
    subgraph "Square/Dots"
        T1 --> S1[Orthogonal lines]
        S1 --> S2[Spacing interval]
        S2 --> S3[Snap: Round to multiples]
    end
    
    subgraph "Isometric"
        T2 --> I1[3 line families]
        I1 --> I2[Vertical + 60° + 120°]
        I2 --> I3[Snap: 3-line intersection]
    end
    
    subgraph "Triangular"
        T3 --> TR1[Equilateral triangles]
        TR1 --> TR2[Horizontal + diagonals]
        TR2 --> TR3[Snap: Triangle vertices]
    end
    
    subgraph "Hexagonal"
        T4 --> H1{Orientation}
        H1 -->|Pointy| H2[Pointed top/bottom]
        H1 -->|Flat| H3[Flat top/bottom]
        H2 --> H4[Snap: Hex centers]
        H3 --> H4
    end
    
    subgraph "Polar"
        T5 --> P1[Concentric circles]
        P1 --> P2[Radial divisions]
        P2 --> P3[Snap: Radial + angular]
    end
    
    subgraph "Diagonal"
        T6 --> D1[45° + 135° lines]
        D1 --> D2[Rotated grid]
        D2 --> D3[Snap: Diagonal intersections]
    end
    
    subgraph "Parametric"
        T7 --> PA1[Orthogonal base grid]
        PA1 --> PA2{Warp Type}
        PA2 --> W1[Sine2D]
        PA2 --> W2[Perlin2D]
        PA2 --> W3[Radial]
        W1 --> PA3[Snap: Inverse warp]
        W2 --> PA3
        W3 --> PA3
    end
    
    style T7 fill:#e1f5ff
    style PA3 fill:#ffe1e1
```

## Parametric Warp System

```mermaid
graph TB
    subgraph "Warp Configuration"
        WC[Warp Parameters]
        WC --> WK[Warp Kind: sine2d/perlin2d/radial]
        WC --> AMP[Amplitudes: ampX, ampY]
        WC --> FREQ[Frequencies: freqX, freqY]
        WC --> PHASE[Phases: phaseX, phaseY]
        WC --> SEED[Seed: for noise]
        WC --> CENTER[Center: for radial]
        WC --> SWIRL[Swirl: rotation turns]
    end
    
    subgraph "Forward Warp"
        FW["Forward Warp: Apply displacement"]
        FW --> CD[Calculate Displacement D of x,y]
        
        CD --> SW{Warp Kind?}
        SW -->|Sine2D| S1[dx = ampX × sin × cos]
        SW -->|Sine2D| S2[dy = ampY × cos × sin]
        SW -->|Perlin2D| P1[Combined sine waves]
        SW -->|Radial| R1[Radial + swirl]
        
        S1 --> AP[Apply to grid points]
        S2 --> AP
        P1 --> AP
        R1 --> AP
    end
    
    subgraph "Inverse Warp (for snapping)"
        IW["Inverse Warp: Find base coords"]
        IW --> FP[Fixed-Point Iteration]
        FP --> IT1[u = q - D of u]
        IT1 --> IT2[Iterate 4 times]
        IT2 --> IT3[Converge to solution]
        IT3 --> SNAP[Snap in base grid]
        SNAP --> RW[Re-apply warp]
        RW --> FINAL[Return snapped position]
    end
    
    style CD fill:#ffe1e1
    style FP fill:#e1f5ff
    style FINAL fill:#e1ffe1
```

## Snap Algorithm Flow

```mermaid
flowchart TD
    A[snapToGrid x, y] --> B{Snap Enabled?}
    B -->|No| Z[Return original x, y]
    B -->|Yes| C{Grid Type?}
    
    C -->|Square/Dots| D1[Round to spacing multiples]
    D1 --> D2[snappedX = round x/spacing × spacing]
    D2 --> D3[snappedY = round y/spacing × spacing]
    D3 --> RET[Return snapped point]
    
    C -->|Isometric| E1[Calculate 3 line families]
    E1 --> E2[Vertical: x = n×spacing]
    E1 --> E3[60°: y - tan30×x = const]
    E1 --> E4[120°: y + tan30×x = const]
    E2 --> E5[Find 3 intersection candidates]
    E3 --> E5
    E4 --> E5
    E5 --> E6[Pick closest intersection]
    E6 --> RET
    
    C -->|Triangular| F1[Horizontal lines + diagonals]
    F1 --> F2[Find 3 intersection candidates]
    F2 --> F3[Pick closest intersection]
    F3 --> RET
    
    C -->|Hexagonal| G1{Orientation?}
    G1 -->|Pointy| G2[width = spacing×√3]
    G1 -->|Flat| G3[width = spacing×2]
    G2 --> G4[Calculate hex row/col]
    G3 --> G4
    G4 --> G5[Apply offset for alternating rows]
    G5 --> RET
    
    C -->|Polar| H1[Convert to polar coords]
    H1 --> H2[Round radius to spacing]
    H1 --> H3[Round angle to divisions]
    H2 --> H4[Convert back to Cartesian]
    H3 --> H4
    H4 --> RET
    
    C -->|Diagonal| I1[Calculate diff = y-x]
    I1 --> I2[Calculate sum = y+x]
    I2 --> I3[Round to nearest line]
    I3 --> I4[Find intersection]
    I4 --> RET
    
    C -->|Parametric| J1[Inverse warp to base coords]
    J1 --> J2[Fixed-point iteration]
    J2 --> J3[Snap in base grid]
    J3 --> J4[Re-apply warp]
    J4 --> RET
    
    style D2 fill:#e1ffe1
    style E6 fill:#e1ffe1
    style J2 fill:#ffe1e1
    style RET fill:#e1f5ff
```

## Handler

N/A (visual aid - no interactive handler)

## Keyboard Shortcuts

No plugin-specific shortcuts.

## UI Contributions

### Panels

**GridPanel**: Comprehensive grid configuration with:
- **Grid Type Dropdown**: Select from 8 grid types
- **Toggles**:
  - Show: Enable/disable grid visibility
  - Snap: Enable/disable snap-to-grid
  - Rulers: Show/hide coordinate labels
- **Spacing Slider**: Adjust grid cell size (5-100px)
- **Opacity Slider**: Control grid transparency (0-1)
- **Emphasize Every N**: Emphasize every Nth line
- **Parametric Settings** (when type = parametric):
  - Step Y: Vertical spacing
  - Warp Type: sine2d/perlin2d/radial
  - Amplitude X/Y
  - Frequency X/Y
  - Phase X/Y (sine2d)
  - Swirl Turns (radial)
  - Seed (perlin2d)

### Overlays

**GridOverlay**: Renders all grid types with:
- SVG-based rendering for crisp lines
- Viewport culling for performance
- Theme-aware colors
- Optional rulers with numeric labels

### Canvas Layers

Background layer (rendered behind all elements)

## Public APIs

```typescript
interface GridPluginSlice {
  grid: {
    enabled: boolean;
    snapEnabled: boolean;
    type: GridType;
    spacing: number;
    showRulers: boolean;
    
    // Type-specific
    polarDivisions?: number;
    hexOrientation?: 'pointy' | 'flat';
    
    // Visual
    opacity?: number;
    color?: string;
    emphasizeEvery?: number;
    
    // Parametric
    parametricStepY?: number;
    parametricWarp?: WarpParams;
  };
  
  updateGridState: (state: Partial<...>) => void;
  snapToGrid: (x: number, y: number) => { x: number; y: number };
}

type GridType = 'square' | 'dots' | 'isometric' | 'triangular' 
              | 'hexagonal' | 'polar' | 'diagonal' | 'parametric';

interface WarpParams {
  kind: 'sine2d' | 'perlin2d' | 'radial';
  ampX: number;
  ampY: number;
  freqX: number;
  freqY: number;
  phaseX?: number;
  phaseY?: number;
  seed?: number;
  centerX?: number;
  centerY?: number;
  swirlTurns?: number;
}
```

## Usage Examples

```typescript
// Enable grid with specific type
const updateGridState = useCanvasStore(state => state.updateGridState);
updateGridState({ 
  enabled: true, 
  snapEnabled: true,
  type: 'hexagonal',
  spacing: 30
});

// Access snap function
const snapToGrid = useCanvasStore(state => state.snapToGrid);
const snapped = snapToGrid(rawX, rawY);
// Use snapped.x and snapped.y for positioning

// Configure parametric warp
updateGridState({
  type: 'parametric',
  parametricWarp: {
    kind: 'sine2d',
    ampX: 20,
    ampY: 20,
    freqX: 3,
    freqY: 2,
    phaseX: 0,
    phaseY: Math.PI / 3
  }
});

// Toggle grid visibility
updateGridState({ enabled: !grid.enabled });
```

## Implementation Details

**Location**: `src/plugins/grid/`

**Files**:
- `index.tsx`: Plugin definition and canvas layer registration
- `slice.ts`: State management and snap algorithms (404 lines)
- `GridPanel.tsx`: Settings UI with all controls
- `GridOverlay.tsx`: Visual rendering of all grid types

**Key Algorithms**:

1. **Square/Dots**: Simple rounding to spacing multiples
   ```typescript
   snappedX = Math.round(x / spacing) * spacing
   ```

2. **Isometric**: Three-line family intersection
   - Vertical lines + 60° + 120° diagonals
   - Find three candidate intersections
   - Return closest to pointer

3. **Triangular**: Similar to isometric with different geometry
   - Horizontal lines + 60° + 120° diagonals
   - Triangle vertex snapping

4. **Hexagonal**: Offset grid calculation
   - Alternating row/column offsets
   - Different formulas for pointy vs flat orientation

5. **Polar**: Cylindrical coordinate snapping
   - Snap radius to spacing intervals
   - Snap angle to division increments

6. **Diagonal**: 45° grid intersection
   - Lines with slopes ±1
   - Solve using y-x and y+x constants

7. **Parametric**: Inverse warp + snap + forward warp
   - Fixed-point iteration for inverse (4 iterations)
   - Snap in unwarped space
   - Re-apply warp to snapped point

**Warp Mathematics**:

- **Sine2D**: `D(x,y) = (ampX×sin(...)×cos(...), ampY×cos(...)×sin(...))`
- **Radial**: Hann window with optional swirl: `0.5×(1-cos(π×r/maxR))`
- **Perlin2D**: Simplified multi-octave sine combination

## Edge Cases & Limitations

### Performance
- Grid rendered as canvas layer for optimal performance
- Viewport culling reduces rendering overhead
- Parametric grids have higher computational cost
- Snapping calculations are lightweight (per pointer event)

### Functional Limitations
- Parametric inverse warp uses 4 iterations (may not converge for extreme amplitudes)
- Polar grid assumes origin at (0, 0)
- Very small spacing (less than 5px) causes visual clutter
- Grid settings do not persist with saved files
- Snap accuracy for parametric grids decreases with high warp amplitudes

### Browser Compatibility
- Requires Canvas API and SVG support (all modern browsers)
- No known compatibility issues

## Related

- [Guidelines Plugin](./guidelines) - Alternative smart alignment system
- [Grid Fill Plugin](./grid-fill) - Fill grid cells with shapes
- [Plugin System Overview](../overview)
- [Selection System](../../features/selection) - Uses grid snapping during element manipulation


