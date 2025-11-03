---
id: shape
title: Shape Plugin
sidebar_label: Shape
---

# Shape Plugin

**Purpose**: Create parametric shapes (circle, square, triangle, etc.)

## Overview

- Shapes: square, rectangle, circle, triangle, line, diamond, heart
- Two-point creation (drag to define size)
- Shift key for proportional shapes
- Preview during creation
- Converts to editable paths

## Plugin Interaction Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as UI/Toolbar
    participant Store as Canvas Store
    participant SHP as Shape Plugin
    participant Canvas as Canvas Renderer
    participant SG as Shape Generator
    
    Note over User,Canvas: 1. Tool Activation & Shape Selection
    User->>UI: Click Shape Tool
    UI->>Store: setActivePlugin('shape')
    Store->>Store: Update activePlugin
    Store->>Store: Set default shape type (circle)
    Canvas->>Canvas: Set cursor to crosshair
    
    User->>UI: Select Triangle from shape panel
    UI->>Store: Update currentShapeType
    Store->>UI: Update panel selection
    
    Note over User,Canvas: 2. Start Shape Creation
    User->>Canvas: Press pointer down
    Canvas->>SHP: handler(event, point)
    SHP->>Store: Set isCreating = true
    SHP->>Store: Store startPoint [x, y]
    SHP->>Store: Check Shift key state
    SHP->>Store: Initialize preview shape
    
    Note over User,Canvas: 3. Shape Preview During Drag
    User->>Canvas: Drag pointer
    Canvas->>SHP: Internal pointermove handling
    SHP->>SHP: Check isCreating
    SHP->>Store: Get startPoint
    SHP->>SHP: Calculate endPoint [x, y]
    
    alt Shift Key Pressed
        SHP->>SHP: Calculate proportional dimensions
        SHP->>SHP: Constrain to 1:1 aspect ratio
    else Normal Drag
        SHP->>SHP: Use actual dimensions
    end
    
    SHP->>SG: generateShape(type, startPoint, endPoint)
    SG->>SG: Calculate shape parameters
    
    alt Circle
        SG->>SG: radius = distance / 2
        SG->>SG: Create circle path
    else Rectangle
        SG->>SG: width, height from points
        SG->>SG: Create rect path
    else Triangle
        SG->>SG: Calculate 3 vertices
        SG->>SG: Create triangle path
    else Other shapes
        SG->>SG: Shape-specific calculations
    end
    
    SG->>SHP: Return preview SVG path
    SHP->>Store: Update preview shape data
    Store->>Canvas: Draw preview shape (dashed)
    
    loop While Dragging
        Canvas->>SHP: Process pointermove
        SHP->>SG: generateShape
        SG->>Canvas: Update preview
    end
    
    Note over User,Canvas: 4. Complete Shape Creation
    User->>Canvas: Release pointer
    Canvas->>SHP: Internal pointerup handling
    SHP->>Store: Set isCreating = false
    SHP->>SG: generateShape(final dimensions)
    SG->>SHP: Return final SVG path
    
    SHP->>SHP: Validate shape (min size check)
    
    alt Valid Shape
        SHP->>Store: Create CanvasElement
        SHP->>Store: Set element type = 'path'
        SHP->>Store: Add shape metadata
        SHP->>Store: addElement(shapeElement)
        Store->>Canvas: Render final shape
        Store->>Store: Add to undo stack
    else Too Small
        SHP->>SHP: Discard shape
    end
    
    SHP->>Store: Clear preview state
    
    Note over User,Canvas: 5. Shape Type Change
    User->>UI: Select Heart shape
    UI->>Store: Update currentShapeType
    Store->>UI: Highlight heart button
```

## Shape Generation Process

```mermaid
flowchart TD
    A[User Starts Drag] --> B[Store Start Point]
    B --> C{Shape Type?}
    
    C -->|Circle| D1[Calculate Radius]
    C -->|Rectangle| D2[Calculate Width/Height]
    C -->|Triangle| D3[Calculate Vertices]
    C -->|Line| D4[Two Points]
    C -->|Diamond| D5[Calculate 4 Points]
    C -->|Heart| D6[Heart Bezier Curves]
    
    D1 --> E1{Shift Key?}
    D2 --> E2{Shift Key?}
    D3 --> E3{Shift Key?}
    
    E1 -->|Yes| F1[Perfect Circle]
    E1 -->|No| F1b[Ellipse]
    E2 -->|Yes| F2[Square]
    E2 -->|No| F2b[Rectangle]
    E3 -->|Yes| F3[Equilateral Triangle]
    E3 -->|No| F3b[Scalene Triangle]
    
    D4 --> G4[Line Path]
    D5 --> G5[Diamond Path]
    D6 --> G6[Heart Path]
    
    F1 --> H[Generate SVG Path]
    F1b --> H
    F2 --> H
    F2b --> H
    F3 --> H
    F3b --> H
    G4 --> H
    G5 --> H
    G6 --> H
    
    H --> I[Update Preview]
    I --> J{Still Dragging?}
    J -->|Yes| K[Wait for Move Event]
    K --> C
    J -->|No| L[Pointer Up]
    
    L --> M{Valid Size?}
    M -->|Yes| N[Create Element]
    M -->|No| O[Discard]
    
    N --> P[Add to Canvas]
    P --> Q[Clear Preview]
    
    style D1 fill:#e1f5ff
    style D2 fill:#e1f5ff
    style D3 fill:#e1f5ff
    style N fill:#e1ffe1
    style O fill:#ffe1e1
```

## State Management

```mermaid
graph TB
    subgraph "Shape Plugin Slice"
        SS[Shape State]
        SS --> CT[currentType: ShapeType]
        SS --> IC[isCreating: boolean]
        SS --> SP[startPoint: Point]
        SS --> EP[endPoint: Point]
        SS --> PS[previewShape: PathData]
        SS --> SK[shiftKey: boolean]
    end
    
    subgraph "Shape Types"
        ST[Available Shapes]
        ST --> C[circle]
        ST --> R[rectangle]
        ST --> T[triangle]
        ST --> L[line]
        ST --> D[diamond]
        ST --> H[heart]
        ST --> S[star]
    end
    
    subgraph "Shape Generator Utilities"
        SG[Shape Generators]
        SG --> CG[CircleGenerator]
        SG --> RG[RectGenerator]
        SG --> TG[TriangleGenerator]
        SG --> DG[DiamondGenerator]
        SG --> HG[HeartGenerator]
    end
    
    SS --> ST
    ST --> SG
    SG --> SS
```

## Handler

Two-point shape creation with preview

## Keyboard Shortcuts

No plugin-specific shortcuts.

## UI Contributions

### Panels

- Shape type selector

### Overlays

No overlays.

### Canvas Layers

- Preview layer showing shape during creation

## Public APIs

The Shape plugin exposes the following public API:

### `createShape(startPoint: Point, endPoint: Point)`

Creates a shape between two points.

**Parameters**:
- `startPoint`: A `Point` object with `x` and `y` coordinates for the start position
- `endPoint`: A `Point` object with `x` and `y` coordinates for the end position

**Usage**:
```typescript
const api = useCanvasStore.getState().getPluginApi('shape');
api.createShape(
  { x: 50, y: 50 },
  { x: 150, y: 150 }
);
```

## Usage Examples

```typescript
// Activate the plugin
const state = useCanvasStore.getState();
state.setMode('shape');

// Access plugin state
const shapeState = useCanvasStore(state => state.shape);
```



## Implementation Details

**Location**: `src/plugins/shape/`

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


