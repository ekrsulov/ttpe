---
id: pen
title: Pen Plugin
sidebar_label: Pen
---

# Pen Plugin

**Purpose**: Precision vector path creation and editing with Bézier curves

## Overview

The Pen plugin provides professional-grade vector path creation and editing capabilities, similar to tools found in Adobe Illustrator or Figma.

**Core Features**:
- Create straight and curved path segments
- Edit existing paths (anchors, handles, segments)
- Support for compound paths (multiple subpaths)
- Smooth, cusp, and corner anchor types
- Real-time preview with rubber band
- Path closing with continuity preservation
- Mobile-friendly controls (Close/Finish/Cancel buttons)
- Snap-to-close for touch devices
- 45° angle constraints with Shift
- Move last anchor while drawing

## Plugin Interaction Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as UI/Toolbar
    participant Store as Canvas Store
    participant PP as Pen Plugin
    participant Hook as usePenDrawingHook
    participant Actions as Pen Actions
    participant Canvas as Canvas Renderer
    
    Note over User,Canvas: 1. Tool Activation
    User->>UI: Click Pen Tool
    UI->>Store: setActivePlugin('pen')
    Store->>Store: Update activePlugin
    Store->>PP: Initialize pen state
    Canvas->>Canvas: Set cursor to pen+asterisk
    
    Note over User,Canvas: 2. Start Drawing (Click)
    User->>Canvas: Click on canvas
    Canvas->>Hook: handlePointerDown(event)
    Hook->>Actions: startPath(point)
    Actions->>Store: Create currentPath with first anchor
    Store->>Canvas: Render anchor (circle)
    
    Note over User,Canvas: 3. Add Curved Segment (Click-Drag)
    User->>Canvas: Click and drag
    Canvas->>Hook: handlePointerDown → handlePointerMove
    Hook->>Hook: Track drag gesture
    Hook->>Store: Update dragState
    Canvas->>Canvas: Show handle preview
    
    User->>Canvas: Release pointer
    Canvas->>Hook: handlePointerUp(event)
    Hook->>Actions: addCurvedAnchor(point, handleVector)
    Actions->>Store: Add anchor with symmetric handles
    Store->>Canvas: Render anchor + handles
    
    Note over User,Canvas: 4. Close Path
    User->>Canvas: Click near first anchor
    Canvas->>Hook: Detect proximity to start
    Hook->>Actions: closePath()
    Actions->>Hook: Preserve first anchor reflex handle
    Actions->>Actions: Convert PenPath to Commands
    Actions->>Store: addElement(pathElement)
    Store->>Canvas: Render final closed path
    
    Note over User,Canvas: 5. Edit Existing Path
    User->>Canvas: Click on path anchor
    Canvas->>Hook: findPathAtPoint()
    Hook->>Actions: startEditingPath(pathId, subPathIndex)
    Actions->>Actions: Convert Commands to PenPath
    Actions->>Store: Set editing mode
    Store->>Canvas: Show anchor/handle overlays
    
    User->>Canvas: Drag anchor
    Canvas->>Hook: handlePointerMove(dragging)
    Hook->>Actions: moveAnchor(index, newPosition)
    Actions->>Actions: updatePathOnCanvas()
    Store->>Canvas: Update element in real-time
```

## Drawing State Machine

```mermaid
stateDiagram-v2
    [*] --> Idle: Plugin activated
    
    Idle --> Drawing: Click on empty canvas
    Idle --> Editing: Click on existing path
    Idle --> Continuing: Click on path endpoint
    
    Drawing --> Drawing: Add anchor (click/drag)
    Drawing --> Idle: Close path (click first anchor)
    Drawing --> Idle: Finish path (Enter/Finish button)
    Drawing --> Idle: Cancel path (Esc/Cancel button)
    
    Editing --> Editing: Modify anchor/handle
    Editing --> Editing: Add/delete anchor
    Editing --> Editing: Switch subpath (compound paths)
    Editing --> Idle: Click away / tool switch
    
    Continuing --> Drawing: Continue from endpoint
    Continuing --> Idle: Cancel
    
    note right of Drawing
        Modes:
        - Click: Straight segment
        - Click-Drag: Curved segment
        - Shift: Constrain angle (45°)
        - Alt: Create cusp
    end note
    
    note right of Editing
        Operations:
        - Move anchor
        - Adjust handles
        - Add anchor to segment
        - Delete anchor
        - Convert anchor type
    end note
```

## Path Creation Process

```mermaid
flowchart TD
    A[User Clicks Canvas] --> B{Mode?}
    
    B -->|Drawing| C{First Point?}
    B -->|Idle| D[Start New Path]
    B -->|Editing| E[Handle Edit Operation]
    
    C -->|Yes| F[Create PenPath]
    C -->|No| G{Drag Detected?}
    
    F --> H[Add First Anchor<br/>type: corner]
    H --> I[Set mode: drawing]
    
    G -->|No Drag| J{Near First Anchor?}
    G -->|Drag| K{Alt Key?}
    
    J -->|Yes & >=3 anchors| L[Close Path]
    J -->|No| M[Add Straight Anchor]
    
    K -->|Yes| N[Add Cusp Anchor<br/>independent handles]
    K -->|No| O[Add Smooth Anchor<br/>symmetric handles]
    
    L --> P[Preserve reflex handle]
    P --> Q[Convert to PathElement]
    
    M --> R[Continue drawing]
    N --> R
    O --> R
    
    Q --> S[Add to canvas store]
    S --> T[Clear pen state]
    T --> U[Return to idle]
    
    R --> V{Path Complete?}
    V -->|No| W[Wait for next point]
    V -->|Yes| Q
    
    style F fill:#e1f5ff
    style L fill:#ffe1e1
    style Q fill:#e1ffe1
```

## Compound Path Support

```mermaid
graph TB
    subgraph "Compound Path Element"
        PE[PathElement]
        PE --> SP1[SubPath 0]
        PE --> SP2[SubPath 1]
        PE --> SP3[SubPath 2]
    end
    
    subgraph "Detection Layer"
        FP[findPathAtPoint]
        FP --> IT[Iterate all subpaths]
        IT --> D0[Check SubPath 0]
        IT --> D1[Check SubPath 1]
        IT --> D2[Check SubPath 2]
    end
    
    subgraph "Editing State"
        ES[PenState]
        ES --> EPI[editingPathId]
        ES --> ESPI[editingSubPathIndex]
        ES --> CP[currentPath<br/>PenPath for active subpath]
    end
    
    D1 -.hit.-> ES
    ES --> U[updatePathOnCanvas]
    U --> PR[Preserve other subpaths]
    PR --> R[Replace only edited subpath]
    R --> PE
    
    style D1 fill:#ffe1e1
    style ESPI fill:#e1f5ff
    style CP fill:#e1ffe1
```

## State Management

The Pen plugin uses a comprehensive state slice with multiple operational modes:

```mermaid
graph TB
    subgraph "Pen Plugin Slice (Store)"
        PS[Pen State]
        
        PS --> MODE[mode: PenMode]
        PS --> PATH[currentPath: PenPath]
        PS --> EDIT[editingPathId: string]
        PS --> SIDX[editingSubPathIndex: number]
        
        MODE --> IDLE[idle]
        MODE --> DRAW[drawing]
        MODE --> EDITING[editing]
        MODE --> CONT[continuing]
        
        PS --> DRAG[dragState: PenDragState]
        PS --> CURSOR[cursorState: PenCursorState]
        PS --> HOVER[hoverTarget: PenHoverTarget]
        
        PS --> PREFS[Preferences]
        PREFS --> AAD[autoAddDelete: boolean]
        PREFS --> RB[rubberBandEnabled: boolean]
    end
    
    subgraph "PenPath Structure"
        PP[PenPath]
        PP --> ANCH["anchors: PenAnchorPoint array"]
        PP --> CLOSED[closed: boolean]
        PP --> TID[tempId: string]
        
        ANCH --> A1[Anchor 0]
        ANCH --> A2[Anchor 1]
        ANCH --> AN[Anchor n]
        
        A1 --> POS[position: Point]
        A1 --> TYPE[type: corner/smooth/cusp]
        A1 --> INH["inHandle?: Point<br/>relative"]
        A1 --> OUTH["outHandle?: Point<br/>relative"]
    end
    
    PS -.current path.-> PP
    
    style MODE fill:#e1f5ff
    style EDITING fill:#ffe1e1
    style PP fill:#e1ffe1
```

**Key State Fields**:
- **mode**: Current operational mode (idle/drawing/editing/continuing)
- **currentPath**: Active path being drawn or edited
- **editingPathId**: ID of the canvas element being edited
- **editingSubPathIndex**: Which subpath in a compound path is being edited
- **hoverTarget**: What the cursor is hovering over (anchor/segment/etc.)
- **dragState**: Information about current drag operation
- **cursorState**: Visual cursor state for feedback

## Anchor Types

```mermaid
graph LR
    subgraph "Corner"
        C[No handles<br/>or broken handles]
        C --> C1[Sharp transitions]
    end
    
    subgraph "Smooth"
        S[Collinear handles]
        S --> S1[Equal opposing angles]
        S --> S2[Continuous tangent]
    end
    
    subgraph "Cusp"
        CU[Independent handles]
        CU --> CU1[Different angles]
        CU --> CU2[Discontinuous tangent]
    end
    
    style C fill:#e1f5ff
    style S fill:#e1ffe1
    style CU fill:#ffe1e1
```

## Keyboard Shortcuts

| Key | Action | Mode |
|-----|--------|------|
| `Enter` | Finish current path | Drawing |
| `Escape` | Cancel current path | Drawing |
| `Shift` (hold) | Constrain angle to 45° | Drawing/Editing |
| `Shift` (before drag) | Move last anchor | Drawing |
| `Alt` (during drag) | Create cusp (independent handles) | Drawing |
| `Delete` | Delete selected anchor | Editing |

:::tip Mobile Support
For touch devices without keyboards, use the **Close**, **Finish**, and **Cancel** buttons in the Pen Panel.
:::

## UI Contributions

### Panels

**Pen Panel** provides:
- **Auto Add/Delete Toggle**: Automatically add anchors to segments or delete anchors on click
- **Close Path Button**: Close the current path (mobile-friendly)
- **Finish Path Button**: Finish the path as an open path (mobile-friendly)
- **Cancel Path Button**: Cancel and discard the current path (mobile-friendly)

:::note
The panel buttons are only visible when actively drawing a path.
:::

### Overlays

**PenPathOverlay** renders:
- Anchor points (circles) for the current path
- Direction handles (lines with circles) for curved anchors
- Handle manipulation controls
- Hover feedback for existing paths
- Visual close indicator (pulsing ring) near start point

### Canvas Layers

**RubberBandPreview** provides:
- Real-time preview of the next segment
- Dashed line for straight segments
- Curved preview for drag operations
- Handle preview during drag

## Public APIs

The Pen plugin exposes comprehensive path manipulation APIs:

```typescript
interface PenPluginAPI {
  // Path Creation
  startPath: (point: Point) => void;
  addStraightAnchor: (point: Point) => void;
  addCurvedAnchor: (point: Point, handleOut: Point) => void;
  closePath: () => void;
  finalizePath: () => void;
  cancelPath: () => void;
  
  // Path Editing
  startEditingPath: (pathId: string, subPathIndex: number) => void;
  moveAnchor: (index: number, newPosition: Point) => void;
  updateHandle: (index: number, handleType: 'in' | 'out', position: Point) => void;
  
  // Anchor Operations
  addAnchorToSegment: (segmentIndex: number, t: number) => void;
  deleteAnchor: (index: number) => void;
  convertAnchorType: (index: number, newType: AnchorPointType) => void;
  
  // Path Continuation
  continueFromEndpoint: (pathId: string, anchorIndex: number) => void;
}
```

**Usage**:
```typescript
const api = pluginManager.getPluginApi<PenPluginAPI>('pen');

// Start drawing
api?.startPath({ x: 100, y: 100 });
api?.addCurvedAnchor({ x: 200, y: 100 }, { x: 50, y: 0 });
api?.closePath();

// Edit existing path
api?.startEditingPath('path-123', 0);
api?.moveAnchor(2, { x: 150, y: 150 });
```

## Plugin Hooks

The Pen plugin uses a comprehensive hook system:

```typescript
hooks: [
  {
    id: 'pen-drawing',
    hook: usePenDrawingHook,
    global: false, // Only active when pen tool is active
  },
]
```

**usePenDrawingHook** manages:
- **Pointer Events**: Down, move, up gestures
- **Drag Detection**: Distinguish between click and drag
- **Path Detection**: Hover and click on existing paths/anchors
- **Cursor State**: Dynamic cursor changes based on context
- **Keyboard Modifiers**: Shift, Alt key handling
- **Snap Integration**: Grid and point snapping

## Sidebar Configuration

```typescript
sidebarPanels: [
  {
    key: 'pen',
    condition: (ctx) => !ctx.isInSpecialPanelMode && ctx.activePlugin === 'pen',
    component: PenPanel,
  },
]
```

Shows the PenPanel when:
- The pen tool is active
- Not in a special panel mode

## Path Conversion

The plugin converts between internal `PenPath` representation and SVG `Command[]`:

```mermaid
flowchart LR
    A["PenPath<br/>anchors: PenAnchorPoint array"] --> B[penPathToCommands]
    B --> C["Command array<br/>M, L, C, Z"]
    
    C --> D[pathDataToPenPath]
    D --> A
    
    E["Canvas PathElement<br/>subPaths: Command arrays"] --> D
    B --> F[Canvas PathElement]
    
    style A fill:#e1f5ff
    style C fill:#e1ffe1
```

**Conversion Process**:
1. **penPathToCommands**: Converts anchors with handles to SVG commands (M, L, C, Z)
2. **pathDataToPenPath**: Parses SVG commands back to anchor structure
3. Handles are stored as **relative** to anchor position
4. Supports both straight (L) and curved (C) segments

## Usage Examples

```typescript
// Activate the plugin
useCanvasStore.getState().setActivePlugin('pen');

// Access plugin state
const penState = useCanvasStore(state => state.pen);

// Programmatically create a path
const api = pluginManager.getPluginApi<PenPluginAPI>('pen');
api?.startPath({ x: 100, y: 100 });
api?.addCurvedAnchor({ x: 200, y: 150 }, { x: 50, y: 25 });
api?.addStraightAnchor({ x: 300, y: 100 });
api?.closePath();
```

## Implementation Details

**Location**: `src/plugins/pen/`

**Key Files**:
- `index.ts`: Plugin definition and registration
- `slice.ts`: Zustand state slice for pen tool
- `types.ts`: TypeScript type definitions
- `actions.ts`: Path creation and editing actions
- `hooks/usePenDrawingHook.ts`: Main interaction hook
- `components/PenPathOverlay.tsx`: Visual overlays
- `components/RubberBandPreview.tsx`: Real-time preview
- `PenPanel.tsx`: Tool panel UI
- `utils/pathConverter.ts`: Path ↔ SVG conversion
- `utils/anchorDetection.ts`: Hit testing for paths/anchors
- `utils/cursorState.ts`: Cursor state calculation

## Edge Cases & Limitations

**Handled Edge Cases**:
- ✅ First point handle preservation (reflex handle for smooth closing)
- ✅ Compound path editing (multiple subpaths)
- ✅ Subpath switching while editing
- ✅ Snap-to-close for touch devices
- ✅ Duplicate anchor prevention
- ✅ Handle continuity on path closing

**Current Limitations**:
- Path endpoints must be detected manually (no visual indicator beyond hover)
- `continueFromEndpoint` currently defaults to subpath 0 for compound paths
- No visual feedback for invalid operations

**Performance Considerations**:
- Anchor detection uses spatial threshold (8px / zoom)
- Bézier curve distance calculations for segment detection
- Real-time path updates during editing (no debouncing)

## Related

- [Plugin System Overview](../overview)
- [Pencil Plugin](./pencil) - Freehand drawing alternative
- [Path Plugin](./path) - Boolean operations
- [Edit Plugin](./edit) - General editing capabilities
