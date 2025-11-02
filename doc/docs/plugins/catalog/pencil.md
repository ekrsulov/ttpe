---
id: pencil
title: Pencil Plugin
sidebar_label: Pencil
---

# Pencil Plugin

**Purpose**: Freehand drawing tool for creating paths

## Overview

- Freehand drawing
- Point filtering to reduce noise
- Minimum distance threshold
- Stroke customization (color, width, opacity)
- Marks paths as "freehand" for special handling

## Plugin Interaction Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as UI/Toolbar
    participant PM as PluginManager
    participant PP as Pencil Plugin
    participant Store as Canvas Store
    participant EB as Event Bus
    participant Canvas as Canvas Renderer
    
    Note over User,Canvas: 1. Plugin Activation
    User->>UI: Click Pencil Tool
    UI->>Store: setMode('pencil')
    Store->>PM: Plugin mode changed
    PM->>PP: activate()
    PP->>Store: Initialize pencil slice
    PP->>Store: Set default brush settings
    PP->>EB: Publish 'plugin:activated'
    EB->>Canvas: Set cursor to crosshair
    
    Note over User,Canvas: 2. Start Drawing
    User->>Canvas: Press pointer down
    Canvas->>PP: handlePointerDown(event)
    PP->>Store: Create temp path state
    PP->>Store: Set isDrawing = true
    PP->>Store: Add first point [x, y]
    PP->>Store: Get brush settings (color, width, opacity)
    
    Note over User,Canvas: 3. Drawing Motion
    User->>Canvas: Move pointer (drawing)
    Canvas->>PP: handlePointerMove(event)
    PP->>PP: Check if isDrawing
    PP->>PP: Calculate distance from last point
    
    alt Distance > minDistance threshold
        PP->>PP: Filter point (noise reduction)
        PP->>Store: Add point to temp path
        PP->>Canvas: Draw line segment
    else Distance too small
        PP->>PP: Skip point (reduce noise)
    end
    
    loop While Drawing
        Canvas->>PP: handlePointerMove
        PP->>Store: Accumulate points
        PP->>Canvas: Update preview path
    end
    
    Note over User,Canvas: 4. Finish Drawing
    User->>Canvas: Release pointer
    Canvas->>PP: handlePointerUp(event)
    PP->>Store: Set isDrawing = false
    PP->>PP: Process accumulated points
    PP->>PP: Apply smoothing algorithm
    PP->>PP: Convert points to SVG path data
    PP->>Store: Create CanvasElement
    PP->>Store: Mark as "freehand" type
    PP->>Store: addElement(pathElement)
    Store->>EB: Publish 'element:created'
    EB->>Canvas: Render final path
    EB->>Store: Add to undo stack
    
    Note over User,Canvas: 5. Brush Settings Change
    User->>UI: Adjust brush width slider
    UI->>PP: setBrushWidth(newWidth)
    PP->>Store: Update pencil.brushWidth
    Store->>UI: Update slider value
    
    User->>UI: Change brush color
    UI->>PP: setBrushColor(newColor)
    PP->>Store: Update pencil.brushColor
    Store->>UI: Update color picker
    
    Note over User,Canvas: 6. Plugin Deactivation
    User->>UI: Select different tool
    UI->>Store: setMode('select')
    Store->>PM: Plugin mode changed
    PM->>PP: deactivate()
    PP->>PP: Clear temp drawing state
    PP->>EB: Publish 'plugin:deactivated'
    EB->>Canvas: Reset cursor
```

## Drawing Process Diagram

```mermaid
flowchart TD
    A[User Press Pointer] --> B{Plugin Active?}
    B -->|No| Z[Ignore Event]
    B -->|Yes| C[Initialize Drawing State]
    
    C --> D[Store First Point]
    D --> E[Start Point Accumulation]
    
    E --> F[Pointer Move Event]
    F --> G{Is Drawing?}
    G -->|No| Z
    G -->|Yes| H[Calculate Distance]
    
    H --> I{Distance > Threshold?}
    I -->|No| F
    I -->|Yes| J[Apply Point Filtering]
    
    J --> K[Add Point to Path]
    K --> L[Draw Preview Segment]
    L --> F
    
    F --> M[Pointer Up Event]
    M --> N[Stop Drawing]
    N --> O[Process Point Array]
    
    O --> P[Apply Smoothing]
    P --> Q[Convert to SVG Path]
    Q --> R[Create Canvas Element]
    
    R --> S{Valid Path?}
    S -->|No| T[Discard]
    S -->|Yes| U[Add to Store]
    
    U --> V[Publish element:created]
    V --> W[Render Final Path]
    W --> X[Add to Undo Stack]
    X --> Y[Clear Temp State]
    
    style C fill:#e1f5ff
    style K fill:#ffe1e1
    style U fill:#e1ffe1
```

## State Management

```mermaid
graph TB
    subgraph "Pencil Plugin Slice"
        PS[Pencil State]
        PS --> BC[brushColor: string]
        PS --> BW[brushWidth: number]
        PS --> BO[brushOpacity: number]
        PS --> ID[isDrawing: boolean]
        PS --> TP[tempPoints: Point array]
        PS --> MD[minDistance: number]
    end
    
    subgraph "Drawing State Machine"
        SM[State Machine]
        SM --> IDLE[Idle]
        SM --> DRAW[Drawing]
        SM --> PROC[Processing]
        
        IDLE -->|pointerdown| DRAW
        DRAW -->|pointermove| DRAW
        DRAW -->|pointerup| PROC
        PROC -->|complete| IDLE
    end
    
    subgraph "Point Processing Pipeline"
        PP[Point Pipeline]
        PP --> RAW[Raw Points]
        RAW --> FILT[Filter Noise]
        FILT --> SMTH[Smooth Curve]
        SMTH --> SVG[SVG Path Data]
    end
    
    PS --> SM
    SM --> PP
    PP --> PS
```

## Handler

Captures pointer movements and creates SVG paths

## Keyboard Shortcuts

No plugin-specific shortcuts.

## UI Contributions

### Panels

- Stroke color, width, and opacity controls

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
state.setMode('pencil');

// Access plugin state
const pencilState = useCanvasStore(state => state.pencil);
```



## Implementation Details

**Location**: `src/plugins/pencil/`

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


