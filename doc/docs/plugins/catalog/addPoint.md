---
id: add-point
title: Add Point Plugin
sidebar_label: Add Point
---

# Add Point Plugin

**Purpose**: Add new control points to existing paths with precision

## Overview

The Add Point plugin allows users to insert new control points into existing path segments. This is essential for refining shapes, adding detail, or preparing paths for further manipulation. The plugin intelligently splits bezier curves while maintaining the visual appearance of the original shape.

**Key Features:**
- Click to add points anywhere on a path segment
- Automatic bezier curve splitting with shape preservation
- Visual feedback showing where the point will be inserted
- Supports both straight lines and curved segments
- Works on any selected path element

## Plugin Interaction Flow

```mermaid
sequenceDiagram
    participant User
    participant Canvas
    participant AP as AddPoint Plugin
    participant Store as Canvas Store
    participant Split as Curve Splitter
    
    Note over User,Split: 1. Activate Tool
    User->>Canvas: Click AddPoint tool (+)
    Canvas->>Store: setActivePlugin('addPoint')
    Store->>AP: Plugin activated
    AP->>Canvas: Change cursor to crosshair
    
    Note over User,Split: 2. Hover Over Path
    User->>Canvas: Move cursor over path
    Canvas->>AP: pointermove(pathElement, point)
    AP->>AP: Find closest segment
    AP->>AP: Calculate insertion point
    AP->>Canvas: Highlight segment
    
    Note over User,Split: 3. Add Point
    User->>Canvas: Click on segment
    Canvas->>AP: pointerdown(point)
    AP->>AP: Get segment data
    AP->>AP: Calculate t parameter (0-1)
    AP->>Split: splitCubicCurve(segment, t)
    Split->>Split: Apply De Casteljau's algorithm
    Split->>AP: Return two new segments
    AP->>Store: Update path commands
    Store->>Store: Add to undo stack
    Store->>Canvas: Re-render path with new point
    Canvas->>User: Visual update complete
```

## Point Insertion System

```mermaid
flowchart TD
    A[Click on Path Segment] --> B{Segment Type?}
    
    B -->|Cubic Bezier C| C1[Get control points P0 P1 P2 P3]
    B -->|Line L| L1[Get endpoints P0 P3]
    
    C1 --> C2[Calculate t parameter<br/>from click position]
    L1 --> L2[t = distance ratio]
    
    C2 --> C3[Apply De Casteljau Algorithm]
    L2 --> L3[Linear interpolation]
    
    C3 --> C4[Compute intermediate points:<br/>Q0 Q1 Q2 R0 R1 S0]
    L3 --> L4[Compute midpoint M]
    
    C4 --> C5[Split into two curves]
    L4 --> L5[Split into two lines]
    
    C5 --> C6[Curve 1: P0 Q0 R0 S0]
    C5 --> C7[Curve 2: S0 R1 Q2 P3]
    
    L5 --> L6[Line 1: P0 to M]
    L5 --> L7[Line 2: M to P3]
    
    C6 --> U[Update Path Data]
    C7 --> U
    L6 --> U
    L7 --> U
    
    U --> V[New control point at S0 or M]
    V --> W[Path visually unchanged]
    
    style C3 fill:#e1f5ff
    style C4 fill:#e1f5ff
    style U fill:#e1ffe1
    style W fill:#e1ffe1
```

## Handler

The AddPoint plugin uses a custom handler that:
- Only responds when the plugin is active
- Detects clicks on path segments
- Calculates the precise insertion point
- Triggers the curve splitting algorithm

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `+` (Plus) | Activate Add Point tool |
| `Esc` | Return to Select tool |

## UI Contributions

### Panels

**AddPointPanel**: Information and instructions
- Shows currently selected path
- Displays hover state when over a valid segment
- Usage instructions
- "Click on any segment to add a point" guidance

### Overlays

**AddPointFeedbackOverlay**: Visual guidance
- Highlights the segment under cursor
- Shows insertion point preview
- Displays closest point indicator

### Canvas Layers

**add-point-preview**: Interactive preview layer
- Shows where the point will be inserted
- Highlights the target segment
- Renders in midground layer

## Technical Details

### Curve Splitting Algorithm

The plugin uses **De Casteljau's algorithm** to split cubic Bezier curves:

```typescript
function splitCubicCurve(
  p0: Point, p1: Point, p2: Point, p3: Point, 
  t: number
): { curve1: CubicCurve; curve2: CubicCurve } {
  // First level interpolation
  const q0 = lerp(p0, p1, t);
  const q1 = lerp(p1, p2, t);
  const q2 = lerp(p2, p3, t);
  
  // Second level interpolation
  const r0 = lerp(q0, q1, t);
  const r1 = lerp(q1, q2, t);
  
  // Third level - split point
  const s0 = lerp(r0, r1, t);
  
  return {
    curve1: { p0, p1: q0, p2: r0, p3: s0 },
    curve2: { p0: s0, p1: r1, p2: q2, p3 }
  };
}
```

### T Parameter Calculation

The `t` parameter (0 to 1) represents the position along the curve where the split occurs:
- **t = 0**: Start of segment
- **t = 0.5**: Midpoint
- **t = 1**: End of segment

The plugin calculates `t` based on the click position's distance along the curve.

## State Management

```typescript
interface AddPointSlice {
  addPoint: {
    hoveredSegment: {
      elementId: string;
      segmentIndex: number;
      tParameter: number;
    } | null;
    isActive: boolean;
  };
}
```

## Usage Examples

### Activating the Tool

```typescript
const state = useCanvasStore.getState();
state.setActivePlugin('addPoint');
```

### Programmatic Point Addition

```typescript
import { addPointToPath } from '@/plugins/addPoint/actions';

// Add point at 50% along segment 2 of a path
addPointToPath({
  elementId: 'path-123',
  segmentIndex: 2,
  t: 0.5
});
```

## Implementation Details

**Location**: `src/plugins/addPoint/`

**Files**:
- `index.tsx`: Plugin definition
- `slice.ts`: Zustand state management
- `AddPointPanel.tsx`: UI panel
- `AddPointFeedbackOverlay.tsx`: Visual feedback
- `hooks/useAddPointHook.ts`: Core logic
- `utils/curveSplitting.ts`: Math utilities

## Edge Cases & Limitations

- **Path Selection**: Must have a path element selected
- **Minimum Distance**: Won't add points too close to existing points (< 2px)
- **Closed Paths**: Works on both open and closed paths
- **Complex Paths**: Performance may vary with very complex multi-segment paths
- **Undo/Redo**: Each point addition creates one undo entry

## Sidebar Configuration

```typescript
sidebarPanels: [
  {
    key: 'addPoint',
    condition: (ctx) => !ctx.isInSpecialPanelMode && ctx.activePlugin === 'addPoint',
    component: AddPointPanel,
  },
]
```

## Related

- [Edit Plugin](./edit) - For manipulating existing points
- [Curves Plugin](./curves) - For creating new curved paths
- [Path Plugin](./path) - For basic path creation
