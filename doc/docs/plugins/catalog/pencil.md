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
    PP->>Store: Set default settings
    Canvas->>Canvas: Set cursor to crosshair
    
    Note over User,Canvas: 2. Start Drawing
    User->>Canvas: Press pointer down
    Canvas->>PP: handler(event, point)
    PP->>PP: startPath(point)
    PP->>PP: Create PencilDrawingService
    PP->>PP: Start point collection
    
    Note over User,Canvas: 3. Drawing Motion
    User->>Canvas: Move pointer (drawing)
    Canvas->>PP: Service handles pointermove
    PP->>PP: Check drawing state
    PP->>PP: Calculate distance from last point
    
    alt Distance > minDistance threshold
        PP->>PP: Filter point (noise reduction)
        PP->>PP: Add point to local array
        Canvas->>Canvas: Draw line segment (DOM)
    else Distance too small
        PP->>PP: Skip point (reduce noise)
    end
    
    loop While Drawing
        Canvas->>PP: Service captures points
        PP->>PP: Accumulate in local state
        Canvas->>Canvas: Update preview path
    end
    
    Note over User,Canvas: 4. Finish Drawing
    User->>Canvas: Release pointer
    Canvas->>PP: Service handles pointerup
    PP->>PP: finalizePath(points)
    PP->>PP: Apply smoothing algorithm
    PP->>PP: Convert points to SVG path data
    PP->>Store: addElement(pathElement)
    Store->>Store: Add to undo stack
    Canvas->>Canvas: Render final path
    
    Note over User,Canvas: 5. Settings Change
    User->>UI: Adjust tolerance slider
    UI->>Store: updatePencilState({ simplificationTolerance })
    Store->>UI: Update slider value
    
    User->>UI: Toggle path mode
    UI->>Store: updatePencilState({ reusePath })
    Store->>UI: Update toggle state
    
    Note over User,Canvas: 6. Plugin Deactivation
    User->>UI: Select different tool
    UI->>Store: setMode('select')
    Store->>PM: Plugin mode changed
    PM->>PP: deactivate()
    PP->>PP: Clear drawing service
    Canvas->>Canvas: Reset cursor
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

The Pencil plugin manages drawing state through **PencilDrawingService**, which handles point collection and path creation internally using local state and DOM manipulation, not through the Zustand store.

```mermaid
graph TB
    subgraph "Pencil Plugin Slice (Store)"
        PS[Pencil State]
        PS --> RP[reusePath: boolean]
        PS --> ST[simplificationTolerance: number]
    end
    
    subgraph "PencilDrawingService (Local State)"
        DS[Drawing Service]
        DS --> DRAW[isDrawing: boolean]
        DS --> PTS[points: Point array]
        DS --> DOM[DOM manipulation]
    end
    
    subgraph "Point Processing Pipeline"
        PP[Point Pipeline]
        PP --> RAW[Raw Points]
        RAW --> FILT[Filter Noise]
        FILT --> SMTH[Smooth Curve]
        SMTH --> SVG[SVG Path Data]
    end
    
    PS -.settings.-> DS
    DS --> PP
    PP -.final path.-> Store[Canvas Store]
```

**Note**: The drawing state (`isDrawing`, temporary points) is NOT stored in Zustand. It's managed locally by PencilDrawingService for performance reasons.

## Handler

Captures pointer events and delegates to PencilDrawingService for path creation.

## Keyboard Shortcuts

- **Delete**: Delete selected elements

## UI Contributions

### Panels

**Pencil Panel** provides:
- **Path Mode Toggle**: Switch between "New Path" and "Add Subpath" modes
- **Tolerance Slider**: Adjust path simplification (0-10, step 0.1)

:::note
The panel does NOT provide color, width, or opacity controls. These are managed through the global style system.
:::

### Overlays

No overlays.

### Canvas Layers

No canvas layers.

## Public APIs

The Pencil plugin exposes the following public APIs:

```typescript
interface PencilPluginAPI {
  startPath: (point: Point) => void;
  addPointToPath: (point: Point) => void;
  finalizePath: (points: Point[]) => void;
}
```

**Usage**:
```typescript
const api = pluginManager.getPluginApi<PencilPluginAPI>('pencil');
api?.startPath({ x: 0, y: 0 });
api?.addPointToPath({ x: 10, y: 10 });
api?.finalizePath(collectedPoints);
```

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


