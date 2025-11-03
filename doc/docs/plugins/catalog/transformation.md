---
id: transformation
title: Transformation Plugin
sidebar_label: Transformation
---

# Transformation Plugin

**Purpose**: Resize, rotate, and transform selected elements

## Overview

- Bounding box with resize handles
- Proportional scaling (Shift key)
- Center scaling (Alt/Option key)
- Rotation handle
- Visual rulers and coordinate display

## Plugin Interaction Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as UI/Toolbar
    participant Store as Canvas Store
    participant TP as Transform Plugin
    participant Canvas as Canvas Renderer
    participant TM as Transform Math
    
    Note over User,Canvas: 1. Tool Activation
    User->>UI: Click Transform Tool
    UI->>Store: setActivePlugin('transformation')
    Store->>Store: Update activePlugin
    Store->>Store: Get selected elements
    TP->>TM: calculateBoundingBox(elements)
    TM->>TP: Return bounds + handles
    Store->>Store: Set transform handles
    Canvas->>Canvas: Draw bounding box & handles
    
    Note over User,Canvas: 2. Resize via Corner Handle
    User->>Canvas: Click corner handle
    Canvas->>TP: Internal handle down handling
    TP->>Store: Set activeHandle = 'corner-se'
    TP->>Store: Store initial bounds
    TP->>Store: Check modifier keys
    
    User->>Canvas: Drag handle
    Canvas->>TP: Internal handle move handling
    TP->>Store: Get activeHandle position
    TP->>Store: Calculate delta [dx, dy]
    
    alt Shift Key (Proportional)
        TP->>TM: calculateProportionalScale(delta)
        TM->>TP: Return constrained dimensions
    else Alt or Option Key (Center)
        TP->>TM: calculateCenterScale(delta)
        TM->>TP: Return mirrored dimensions
    else Normal
        TP->>TM: calculateFreeScale(delta)
        TM->>TP: Return free dimensions
    end
    
    TP->>TM: applyTransform(elements, newBounds)
    TM->>TM: Calculate scale factors
    TM->>TM: Transform element positions
    TM->>TM: Transform element dimensions
    TM->>TP: Return transformed elements
    
    TP->>Store: Update elements (preview)
    Store->>Canvas: Re-render elements
    Store->>Canvas: Update handle positions
    TP->>UI: Display dimensions tooltip
    
    loop While Dragging
        Canvas->>TP: handleHandleMove
        TP->>TM: Calculate transform
        TM->>Canvas: Update preview
    end
    
    User->>Canvas: Release handle
    Canvas->>TP: handleHandleUp(event)
    TP->>Store: Set activeHandle = null
    TP->>Store: Commit transformed elements
    Store->>EB: Publish 'elements:transformed'
    EB->>Store: Add to undo stack
    EB->>Canvas: Final render
    
    Note over User,Canvas: 3. Rotation via Rotation Handle
    User->>Canvas: Click rotation handle
    Canvas->>TP: handleRotationDown(event)
    TP->>Store: Set activeHandle = 'rotation'
    TP->>TM: Calculate center point
    TM->>TP: Return rotation center
    
    User->>Canvas: Drag rotation handle
    Canvas->>TP: handleRotationMove(event)
    TP->>TM: calculateAngle(center, mousePos)
    TM->>TP: Return angle in degrees
    
    alt Shift Key (15° increments)
        TP->>TP: Snap angle to 15° intervals
    else Normal
        TP->>TP: Use exact angle
    end
    
    TP->>TM: rotateElements(elements, angle, center)
    TM->>TM: Apply rotation matrix
    TM->>TP: Return rotated elements
    
    TP->>Store: Update elements (preview)
    Store->>Canvas: Re-render rotated elements
    TP->>UI: Display angle tooltip
    
    User->>Canvas: Release rotation handle
    Canvas->>TP: handleRotationUp(event)
    TP->>Store: Commit rotation
    Store->>EB: Publish 'elements:rotated'
    EB->>Store: Add to undo stack
    
    Note over User,Canvas: 4. Edge Handle (Width/Height only)
    User->>Canvas: Drag top edge handle
    Canvas->>TP: handleEdgeMove(event)
    TP->>TM: scaleHeight(delta)
    TM->>TP: Return scaled elements
    TP->>Store: Update elements
    Store->>Canvas: Re-render
    
    Note over User,Canvas: 5. Direct Input via Panel
    User->>UI: Enter width value in panel
    UI->>TP: setWidth(newWidth)
    TP->>TM: scaleToWidth(elements, newWidth)
    TM->>TP: Return scaled elements
    TP->>Store: updateElements(scaled)
    Store->>Canvas: Re-render
```

## Transform Math Operations

```mermaid
flowchart TD
    A[Transform Operation] --> B{Operation Type?}
    
    B -->|Resize| C[Scale Transform]
    B -->|Rotate| D[Rotation Transform]
    B -->|Move| E[Translation Transform]
    
    C --> C1{Modifier Keys?}
    C1 -->|Shift| C2[Proportional Scale]
    C1 -->|Alt| C3[Center Scale]
    C1 -->|None| C4[Free Scale]
    
    C2 --> F1[Maintain Aspect Ratio]
    C3 --> F2[Scale from Center]
    C4 --> F3[Independent Width/Height]
    
    D --> D1{Snap Angle?}
    D1 -->|Shift| D2[15° Increments]
    D1 -->|None| D3[Free Rotation]
    
    D2 --> G1[Round to nearest 15°]
    D3 --> G2[Exact angle]
    
    E --> E1[Calculate Delta]
    E1 --> E2[Apply to all elements]
    
    F1 --> H[Calculate Transform Matrix]
    F2 --> H
    F3 --> H
    G1 --> H
    G2 --> H
    E2 --> H
    
    H --> I[Apply to Elements]
    I --> J[Update Positions]
    I --> K[Update Dimensions]
    I --> L[Update Rotation]
    
    J --> M[Commit Changes]
    K --> M
    L --> M
    
    M --> N{Valid Result?}
    N -->|Yes| O[Update Store]
    N -->|No| P[Revert]
    
    O --> Q[Re-render Canvas]
    P --> Q
    
    style C2 fill:#e1f5ff
    style C3 fill:#e1f5ff
    style D2 fill:#e1f5ff
    style O fill:#e1ffe1
```

## Handle System

```mermaid
graph TB
    subgraph "Transform Handles"
        BB[Bounding Box]
        BB --> TL[Top-Left Corner]
        BB --> TR[Top-Right Corner]
        BB --> BL[Bottom-Left Corner]
        BB --> BR[Bottom-Right Corner]
        BB --> T[Top Edge]
        BB --> B[Bottom Edge]
        BB --> L[Left Edge]
        BB --> R[Right Edge]
        BB --> ROT[Rotation Handle]
    end
    
    subgraph "Handle Behaviors"
        TL --> SCALE1[Diagonal Scale]
        TR --> SCALE2[Diagonal Scale]
        BL --> SCALE3[Diagonal Scale]
        BR --> SCALE4[Diagonal Scale]
        T --> VSCALE1[Vertical Scale]
        B --> VSCALE2[Vertical Scale]
        L --> HSCALE1[Horizontal Scale]
        R --> HSCALE2[Horizontal Scale]
        ROT --> ROTATE[Rotate Around Center]
    end
    
    subgraph "Transform State"
        TS[Transform Slice]
        TS --> AH[activeHandle: string]
        TS --> IB[initialBounds: Rect]
        TS --> CB[currentBounds: Rect]
        TS --> MK[modifierKeys: Set]
        TS --> CP[centerPoint: Point]
    end
    
    BB --> TS
    SCALE1 --> TS
    ROTATE --> TS
```

## Handler

N/A (uses direct manipulation of handles)

## Keyboard Shortcuts

No plugin-specific shortcuts.

## UI Contributions

### Panels

- Transform options, rulers, coordinates

### Overlays

- **TransformationOverlay**: Visual rendering of transformation handles, bounding box, and real-time transform feedback

### Canvas Layers

- Transform handles and bounding box

## Public APIs

No public APIs exposed.

## Usage Examples

```typescript
// Activate the plugin
const state = useCanvasStore.getState();
state.setMode('transformation');

// Access plugin state
const transformationState = useCanvasStore(state => state.transformation);
```



## Implementation Details

**Location**: `src/plugins/transformation/`

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

- [Transform Feature](../../features/transforms)
