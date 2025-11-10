---
id: guidelines
title: Guidelines Plugin
sidebar_label: Guidelines
---

# Guidelines Plugin

**Purpose**: Smart guides for snapping elements to edges and centers

## Overview

Smart alignment guides that help you position elements precisely by detecting edges, centers, and distances during drag operations.

**Features**:
- Smart edge and center guides
- Distance repetition detection
- Sticky mode for automatic snapping
- Zoom-scaled snap threshold
- Visual feedback lines

## Plugin Interaction Flow

```mermaid
sequenceDiagram
    participant User
    participant Canvas
    participant GP as Guidelines Plugin
    participant Store
    participant Overlay
    
    Note over User,Canvas: 1. Plugin Initialization
    GP->>Store: Initialize guidelines slice
    GP->>Store: Set defaults (enabled, distance enabled)
    
    Note over User,Canvas: 2. Start Dragging Element
    User->>Canvas: Click and drag element
    Canvas->>GP: findAlignmentGuidelines(elementId, bounds)
    GP->>Store: Read other elements
    Store->>GP: Return element bounds
    GP->>GP: Calculate edge/center matches
    GP->>GP: Filter by priority (center > edge)
    GP->>Store: Update currentMatches[]
    Store->>Overlay: Render guideline visuals
    
    Note over User,Canvas: 3. Distance Detection (enabled by default)
    Canvas->>GP: findDistanceGuidelines(elementId, bounds)
    GP->>GP: Detect repeated distances
    GP->>GP: Find common spacing patterns
    GP->>Store: Update currentDistanceMatches[]
    Store->>Overlay: Render distance indicators
    
    Note over User,Canvas: 4. Sticky Snap
    Canvas->>GP: checkStickySnap(delta, projectedBounds)
    GP->>GP: Check if within snap threshold
    
    alt Within Snap Threshold
        GP->>GP: Calculate snap offset
        GP->>GP: Enter sticky mode
        GP->>Canvas: Return snapped position
        Canvas->>Store: Update element position (snapped)
    else Beyond Sticky Threshold
        GP->>GP: Break free from sticky
        GP->>Canvas: Return original position
    end
    
    Note over User,Canvas: 5. Stop Dragging
    User->>Canvas: Release mouse
    Canvas->>GP: clearGuidelines()
    GP->>Store: Clear currentMatches[]
    GP->>Store: Reset stickyState
    Overlay->>Overlay: Hide all guidelines
```

## Alignment Detection System

```mermaid
graph TB
    subgraph "Detection Process"
        A[Dragging Element] --> B[Get Current Bounds]
        B --> C[Calculate Centers]
        C --> D{Check All Elements}
        
        D --> E1[Left Edge]
        D --> E2[Right Edge]
        D --> E3[Top Edge]
        D --> E4[Bottom Edge]
        D --> E5[Center X]
        D --> E6[Center Y]
        
        E1 --> F{Within Threshold?}
        E2 --> F
        E3 --> F
        E4 --> F
        E5 --> F
        E6 --> F
        
        F -->|Yes| G[Add to Matches]
        F -->|No| H[Ignore]
        
        G --> I[Priority Filter]
        I --> J{Priority Level}
        J -->|1 - Center| K[Keep Center Match]
        J -->|2 - Edge| L[Keep if no Center]
        
        K --> M[Return Matches]
        L --> M
    end
    
    subgraph "Match Types"
        N1[Left: element.minX == ref.minX or ref.maxX]
        N2[Right: element.maxX == ref.maxX or ref.minX]
        N3[Top: element.minY == ref.minY or ref.maxY]
        N4[Bottom: element.maxY == ref.maxY or ref.minY]
        N5[CenterX: element.centerX == ref.centerX]
        N6[CenterY: element.centerY == ref.centerY]
    end
    
    style E5 fill:#e1f5ff
    style E6 fill:#e1f5ff
    style K fill:#e1ffe1
```

## Distance Repetition System

```mermaid
graph TB
    subgraph "Distance Detection"
        A[Get Element Bounds] --> B{Analyze Axis}
        
        B -->|Horizontal| C1[Calculate X distances]
        B -->|Vertical| C2[Calculate Y distances]
        
        C1 --> D1[Find element pairs]
        C2 --> D2[Find element pairs]
        
        D1 --> E1[Group by distance]
        D2 --> E2[Group by distance]
        
        E1 --> F1{Common Distance?}
        E2 --> F2{Common Distance?}
        
        F1 -->|Yes| G1[Create H distance match]
        F2 -->|Yes| G2[Create V distance match]
        
        G1 --> H[Check if current element maintains distance]
        G2 --> H
        
        H --> I{Match Found?}
        I -->|Yes| J[Show distance indicator]
        I -->|No| K[No indicator]
    end
    
    subgraph "Visual Feedback"
        L1[Brackets on reference pair]
        L2[Brackets on current element]
        L3[Distance label]
        L1 --> M[Render overlay]
        L2 --> M
        L3 --> M
    end
    
    style G1 fill:#ffe1e1
    style G2 fill:#ffe1e1
    style J fill:#e1ffe1
```

## Sticky Snap Behavior

```mermaid
stateDiagram-v2
    [*] --> NotSticky: No match
    [*] --> Snapped: Within threshold
    
    Snapped --> Sticky: Continue dragging
    Sticky --> Sticky: Delta < sticky threshold
    Sticky --> NotSticky: Delta > sticky threshold
    
    NotSticky --> Snapped: Re-enter threshold
    
    note right of Sticky
        Accumulated offset tracks
        intended vs actual movement
    end note
    
    note right of NotSticky
        Snap threshold = 5px
        Sticky threshold = 10px
        (zoom-adjusted)
    end note
```

## Handler

N/A (passive system - automatically active during drag operations)

## Keyboard Shortcuts

No plugin-specific shortcuts.

## UI Contributions

### Panels

**GuidelinesPanel**: Settings control with toggles for:
- **Alignment**: Enable/disable alignment guidelines (edges and centers)
- **Distance**: Enable/disable distance repetition detection (requires Alignment)
- **Debug Mode** (dev only): Show all possible guidelines without filtering

### Overlays

**GuidelinesOverlay**: Visual rendering component that displays:
- Alignment lines extending across canvas
- Distance markers with brackets
- Dynamic visibility (only during drag with select tool active)

### Canvas Layers

Visual guide lines rendered in foreground layer

## Public APIs

```typescript
interface GuidelinesPluginSlice {
  guidelines: {
    enabled: boolean;
    distanceEnabled: boolean;
    debugMode: boolean;
    snapThreshold: number;
    currentMatches: GuidelineMatch[];
    currentDistanceMatches: DistanceGuidelineMatch[];
    stickyState: {
      isSticky: boolean;
      stickyOffset: { x: number; y: number };
      lastStickyTime: number;
    };
  };
  
  updateGuidelinesState: (state: Partial<...>) => void;
  findAlignmentGuidelines: (elementId: string, bounds: Bounds) => GuidelineMatch[];
  findDistanceGuidelines: (elementId: string, bounds: Bounds) => DistanceGuidelineMatch[];
  checkStickySnap: (deltaX: number, deltaY: number, bounds: Bounds) => SnapResult;
  clearGuidelines: () => void;
}
```

## Usage Examples

```typescript
// Enable guidelines
const updateGuidelinesState = useCanvasStore(state => state.updateGuidelinesState);
updateGuidelinesState({ enabled: true, distanceEnabled: true });

// Access current guidelines during drag
const guidelines = useCanvasStore(state => state.guidelines);
const matches = guidelines.currentMatches;

// Check for sticky snap
const checkStickySnap = useCanvasStore(state => state.checkStickySnap);
const result = checkStickySnap(deltaX, deltaY, projectedBounds);
if (result.snapped) {
  // Apply snapped position
  applyDelta(result.x, result.y);
}
```

## Implementation Details

**Location**: `src/plugins/guidelines/`

**Files**:
- `index.tsx`: Plugin definition and canvas layer registration
- `slice.ts`: State management and guideline calculation algorithms
- `GuidelinesPanel.tsx`: Settings UI component
- `GuidelinesOverlay.tsx`: Visual rendering of guidelines

**Key Algorithms**:

1. **Bounds Caching**: `calculateElementBoundsMap()` - Computes and caches element bounds once per drag operation
2. **Overlap Detection**: `rangesOverlap()` - Optimizes by only checking elements with overlapping perpendicular ranges
3. **Priority System**: Center alignments (priority 1) take precedence over edge alignments (priority 2)
4. **Zoom Scaling**: Snap threshold automatically adjusted: `actualThreshold = snapThreshold / viewport.zoom`
5. **Sticky Mode**: Fixed-point tracking with accumulated offset and break-free threshold

## Edge Cases & Limitations

### Performance Considerations
- Element bounds calculated once per drag operation and cached
- Overlap checking reduces unnecessary comparisons
- May experience slowdown with hundreds of elements on canvas

### Functional Limitations
- Guidelines only work with **Select** tool during drag operations
- Point editing in path edit mode does not trigger guidelines
- Very small elements may be harder to align due to snap threshold
- Guidelines do not persist (temporary visual aids only)

### Coordinate System
- All calculations in **world space** (canvas coordinates)
- Snap threshold converted to world space based on zoom
- Ensures consistent behavior at any zoom level

## Related

- [Grid Plugin](./grid) - Alternative alignment system using regular grids
- [Selection System](../../features/selection) - Required for guideline activation
- [Plugin System Overview](../overview)
- [Alignment Features](../../features/alignment) - Manual alignment commands


