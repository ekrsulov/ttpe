---
id: path-simplification
title: Path Simplification Plugin
sidebar_label: Path Simplification
---

# Path Simplification Plugin

**Purpose**: Reduce the number of points in a path while preserving its shape

## Overview

The Path Simplification plugin optimizes complex paths by removing redundant points while maintaining the essential visual characteristics. This is particularly useful for paths created by freehand drawing, tracing, or import operations that often contain far more points than necessary.

**Key Features:**
- Interactive simplification with real-time preview
- Adjustable tolerance slider
- Ramer-Douglas-Peucker (RDP) algorithm
- Shape preservation guarantee
- Undo/redo support
- Significant file size reduction

## Plugin Interaction Flow

```mermaid
sequenceDiagram
    participant User
    participant Panel as Simplification Panel
    participant PS as PathSimp Plugin
    participant RDP as RDP Algorithm
    participant Store as Canvas Store
    
    Note over User,Store: 1. Select Path \u0026 Activate
    User->>Store: Select path element
    User->>Panel: Open Path Simplification
    Panel->>Store: Show simplification UI
    
    Note over User,Store: 2. Adjust Tolerance
    User->>Panel: Move tolerance slider
    Panel->>PS: updateTolerance(value)
    PS->>PS: Get original path data
    PS->>RDP: simplify(points, tolerance)
    
    RDP->>RDP: Find furthest point from line
    RDP->>RDP: Recursive divide \u0026 conquer
    
    alt Point distance > tolerance
        RDP->>RDP: Keep point, split segment
        RDP->>RDP: Recurse on subsegments
    else Point distance <= tolerance
        RDP->>RDP: Discard point
    end
    
    RDP->>PS: Return simplified points
    PS->>Store: Update preview path
    Store->>Panel: Show before/after comparison
    Panel->>User: Display point count reduction
    
    Note over User,Store: 3. Apply Simplification
    User->>Panel: Click "Apply"
    Panel->>PS: applySimplification()
    PS->>Store: Update element path data
    Store->>Store: Add to undo stack
    Store->>Panel: Simplification complete
```

## Simplification Process (RDP Algorithm)

```mermaid
flowchart TD
    A[Original Path Points] --> B{Select Points}
    B --> C[Start Point]
    B --> D[End Point]
    
    C --> E[Draw Line from Start to End]
    D --> E
    
    E --> F[Find Furthest Point from Line]
    F --> G{Distance > Tolerance?}
    
    G -->|No| H[Discard all intermediate points]
    G -->|Yes| I[Keep furthest point]
    
    I --> J[Split into two segments]
    J --> K[Recursively simplify<br/>Start to Furthest]
    J --> L[Recursively simplify<br/>Furthest to End]
    
    K --> M{More points to check?}
    L --> N{More points to check?}
    
    M -->|Yes| F
    M -->|No| O[Simplified Segment 1]
    N -->|Yes| F
    N -->|No| P[Simplified Segment 2]
    
    H --> Q[Keep only endpoints]
    O --> R[Combine Results]
    P --> R
    Q --> R
    
    R --> S[Simplified Path]
    
    style F fill:#e1f5ff
    style G fill:#fff4e1
    style I fill:#e1ffe1
    style H fill:#ffe1e1
    style S fill:#e1ffe1
```

## Tolerance Comparison

```mermaid
graph TB
    subgraph "Original Path 100 points"
        O[●●●●●●●●●●●]
    end
    
    subgraph "Low Tolerance 1.0px"
        L[●●●●●●●●]
        LN[75 points<br/>High detail]
    end
    
    subgraph "Medium Tolerance 5.0px"
        M[●●●●●]
        MN[35 points<br/>Balanced]
    end
    
    subgraph "High Tolerance 15.0px"
        H[●●●]
        HN[12 points<br/>Simplified]
    end
    
    O --> L
    O --> M
    O --> H
    
    style O fill:#ffe1e1
    style M fill:#e1ffe1
```

## Handler

No direct handler - works through UI panel interactions on selected paths.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Shift+S` | Open Path Simplification panel |
| `Enter` | Apply current simplification |
| `Esc` | Cancel / Close panel |

## UI Contributions

### Panels

**PathSimplificationPanel**: Interactive simplification interface
- Tolerance slider (0.1 - 50.0 pixels)
- Before/after point count display
- Real-time preview toggle
- "Apply" and "Reset" buttons
- Visual comparison metrics

### Overlays

No overlays.

### Canvas Layers

**path-simplification-preview**: Preview layer (optional)
- Shows simplified path overlaid on original
- Different color to distinguish
- Dashed stroke for preview

## Technical Details

### Ramer-Douglas-Peucker Algorithm

The RDP algorithm works recursively:

```typescript
function rdpSimplify(
  points: Point[], 
  tolerance: number
): Point[] {
  if (points.length <= 2) return points;
  
  const first = points[0];
  const last = points[points.length - 1];
  
  // Find the point with maximum distance from line
  let maxDistance = 0;
  let maxIndex = 0;
  
  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(
      points[i], 
      first, 
      last
    );
    
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }
  
  // If max distance exceeds tolerance, split and recurse
  if (maxDistance > tolerance) {
    const left = rdpSimplify(
      points.slice(0, maxIndex + 1), 
      tolerance
    );
    const right = rdpSimplify(
      points.slice(maxIndex), 
      tolerance
    );
    
    return [...left.slice(0, -1), ...right];
  }
  
  // Otherwise, just return endpoints
  return [first, last];
}
```

### Distance Calculation

Perpendicular distance from point to line:

```typescript
function perpendicularDistance(
  point: Point, 
  lineStart: Point, 
  lineEnd: Point
): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  
  const numerator = Math.abs(
    dy * point.x - dx * point.y + 
    lineEnd.x * lineStart.y - 
    lineEnd.y * lineStart.x
  );
  
  const denominator = Math.sqrt(dx * dx + dy * dy);
  
  return numerator / denominator;
}
```

## State Management

```typescript
interface PathSimplificationSlice {
  pathSimplification: {
    tolerance: number;           // 0.1 - 50.0
    showPreview: boolean;
    originalPoints: number;
    simplifiedPoints: number;
    isActive: boolean;
  };
}
```

## Usage Examples

### Simplifying a Path

```typescript
import { simplifyPath } from '@/plugins/pathSimplification/actions';

// Simplify with 5px tolerance
simplifyPath({
  elementId: 'path-123',
  tolerance: 5.0
});
```

### Get Simplification Stats

```typescript
const state = useCanvasStore.getState();
const stats = state.pathSimplification;

console.log(`Reduced from ${stats.originalPoints} to ${stats.simplifiedPoints}`);
console.log(`Reduction: ${((1 - stats.simplifiedPoints / stats.originalPoints) * 100).toFixed(1)}%`);
```

## Implementation Details

**Location**: `src/plugins/pathSimplification/`

**Files**:
- `index.tsx`: Plugin definition
- `slice.ts`: State management
- `PathSimplificationPanel.tsx`: UI panel
- `algorithms/rdp.ts`: RDP algorithm implementation
- `utils/pathUtils.ts`: Path manipulation utilities

## Benefits

### File Size Reduction
- **Complex freehand paths**: 60-90% reduction
- **Traced paths**: 50-80% reduction
- **Simple geometric paths**: 10-30% reduction

### Performance Improvements
- Faster rendering with fewer points
- Reduced memory usage
- Smoother canvas interactions

### Visual Quality
- Maintains essential shape characteristics
- Removes imperceptible details
- Cleaner, more professional appearance

## Edge Cases & Limitations

- **Minimum Points**: Requires at least 3 points
- **Closed Paths**: Preserves closure
- **Bezier Curves**: Converts to polyline for simplification
- **Very High Tolerance**: May over-simplify
- **Undo**: Creates single undo entry per simplification

## Sidebar Configuration

```typescript
sidebarPanels: [
  {
    key: 'pathSimplification',
    condition: (ctx) => 
      !ctx.isInSpecialPanelMode && 
      ctx.selectedElements.length === 1 &&
      ctx.selectedElements[0].type === 'path',
    component: PathSimplificationPanel,
  },
]
```

## Related

- [Smooth Brush](./smooth-brush) - Creates smoother paths from the start
- [Edit Plugin](./edit) - Manual point editing
- [Path Plugin](./path) - Basic path operations
