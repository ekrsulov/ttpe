---
id: viewport
title: Viewport (Zoom & Pan)
sidebar_label: Viewport
---

# Viewport: Zoom & Pan

The viewport system manages the user's view into the infinite canvas, providing smooth zoom and pan interactions across desktop and mobile devices.

## Overview

The viewport controls how users navigate the canvas space through:
- **Zoom**: Magnify or reduce the view scale
- **Pan**: Move the visible area of the canvas

Both features work seamlessly across mouse, trackpad, and touch inputs with hardware-accelerated transforms for smooth performance.

## Zoom

### Desktop Zoom

**Mouse Wheel Zoom**:
- Scroll wheel up: Zoom in
- Scroll wheel down: Zoom out
- Zoom centers on cursor position

**Trackpad Pinch**:
- Pinch out: Zoom in
- Pinch in: Zoom out
- Natural scrolling support

### Mobile Zoom

**Pinch-to-Zoom**:
- Two-finger pinch out: Zoom in
- Two-finger pinch in: Zoom out
- Zoom centers on midpoint between fingers

### Zoom Interaction Flow

```mermaid
sequenceDiagram
    participant User
    participant Input as Input Handler
    participant Viewport as Viewport State
    participant Canvas
    
    Note over User,Canvas: Desktop: Wheel Zoom
    User->>Input: Scroll wheel
    Input->>Input: Capture wheel event
    Input->>Input: Get cursor position
    Input->>Viewport: calculateZoom(delta, cursorPos)
    Viewport->>Viewport: clamp(newZoom, MIN, MAX)
    Viewport->>Viewport: Adjust pan to keep cursor
    Viewport->>Canvas: Apply transform
    Canvas->>User: Smooth zoom animation
    
    Note over User,Canvas: Mobile: Pinch Zoom
    User->>Input: Touch with 2 fingers
    Input->>Input: Calculate distance between touches
    Input->>Input: Calculate midpoint
    loop While pinching
        User->>Input: Move fingers
        Input->>Input: New distance = scale factor
        Input->>Viewport: updateZoom(scale, midpoint)
        Viewport->>Canvas: Apply transform
    end
    User->>Input: Release fingers
    Input->>Viewport: Finalize zoom
```

### Zoom Architecture

```mermaid
flowchart TD
    A[Zoom Input Event] --> B{Input Type}
    
    B -->|Wheel| C[Mouse Wheel Handler]
    B -->|Trackpad| D[Trackpad Gesture Handler]
    B -->|Touch| E[Touch Gesture Handler]
    
    C --> F[Get mouse position]
    D --> G[Get trackpad center]
    E --> H[Get pinch midpoint]
    
    F --> I[Calculate zoom delta]
    G --> I
    H --> I
    
    I --> J{Within limits?}
    J -->|No| K[Clamp to MIN_ZOOM or MAX_ZOOM]
    J -->|Yes| L[Apply zoom factor]
    
    K --> M[Calculate pan offset]
    L --> M
    
    M --> N[Keep zoom center fixed in screen space]
    N --> O[Update viewport state]
    
    O --> P[Transform canvas]
    P --> Q[Render at new scale]
    
    style I fill:#e1f5ff
    style M fill:#e1f5ff
    style O fill:#e1ffe1
```

### Zoom Limits

- **Minimum Zoom**: 0.1 (10%) - Prevents zooming out to infinity
- **Maximum Zoom**: 10.0 (1000%) - Prevents performance issues
- **Default Zoom**: 1.0 (100%) - 1:1 pixel ratio

### Zoom Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + =` | Zoom in |
| `Ctrl/Cmd + -` | Zoom out |
| `Ctrl/Cmd + 0` | Reset zoom to 100% |
| `Ctrl/Cmd + 1` | Fit to screen |

## Pan

### Desktop Pan

**Spacebar + Drag**:
1. Hold Space bar
2. Click and drag anywhere on canvas
3. Canvas moves with cursor
4. Release Space to return to normal mode

**Middle Mouse Button**:
- Click and drag with middle mouse button
- Canvas pans with cursor movement

### Mobile Pan

**Two-Finger Drag**:
1. Touch canvas with two fingers
2. Drag in any direction
3. Canvas pans proportionally
4. Works simultaneously with zoom

### Pan Interaction Flow

```mermaid
sequenceDiagram
    participant User
    participant Input as Input Handler
    participant Viewport as Viewport State
    participant Canvas
    
    Note over User,Canvas: Desktop: Spacebar Pan
    User->>Input: Press Space key
    Input->>Canvas: Change cursor to grab
    User->>Input: Click and drag
    Input->>Input: Track mouse delta
    Input->>Viewport: updatePan(deltaX, deltaY)
    Viewport->>Viewport: panX += deltaX / zoom
    Viewport->>Viewport: panY += deltaY / zoom
    Viewport->>Canvas: Apply transform
    User->>Input: Release Space
    Input->>Canvas: Restore cursor
    
    Note over User,Canvas: Mobile: Two-Finger Pan
    User->>Input: Touch with 2 fingers
    Input->>Input: Store initial positions
    loop While dragging
        User->>Input: Move fingers together
        Input->>Input: Calculate delta
        Input->>Viewport: updatePan(deltaX, deltaY)
        Viewport->>Canvas: Apply transform
    end
    User->>Input: Release
```

### Pan Architecture

```mermaid
flowchart TD
    A[Pan Input Event] --> B{Input Type}
    
    B -->|Spacebar+Drag| C[Keyboard + Mouse Handler]
    B -->|Middle Click| D[Middle Button Handler]
    B -->|Two-Finger| E[Touch Gesture Handler]
    
    C --> F[Check Space key state]
    D --> F
    E --> G[Detect 2 touches]
    
    F --> H{Valid pan trigger?}
    G --> H
    
    H -->|No| I[Ignore event]
    H -->|Yes| J[Track pointer delta]
    
    J --> K[Calculate screen delta<br/>deltaX deltaY]
    K --> L[Convert to canvas space<br/>delta / zoom]
    
    L --> M[Update pan state<br/>panX += delta]
    M --> N[Apply CSS transform]
    
    N --> O{Still panning?}
    O -->|Yes| J
    O -->|No| P[End pan mode]
    
    style K fill:#e1f5ff
    style L fill:#e1f5ff
    style M fill:#e1ffe1
```

### Infinite Canvas

The pan system supports an infinite canvas:
- No artificial boundaries
- Pan to any coordinate
- Coordinate system: `(-∞, -∞)` to `(∞, ∞)`
- Origin (0, 0) at top-left of initial view

## Coordinate Systems

### Screen Coordinates
- Origin: Top-left of viewport
- Units: Pixels
- Affected by zoom and pan

### Canvas Coordinates
- Origin: Arbitrary (user-defined)
- Units: Canvas units (typically pixels at 100% zoom)
- Independent of viewport transform

### Conversion

```typescript
// Screen to Canvas
function screenToCanvas(
  screenX: number, 
  screenY: number, 
  viewport: { zoom: number; panX: number; panY: number }
): Point {
  return {
    x: (screenX - viewport.panX) / viewport.zoom,
    y: (screenY - viewport.panY) / viewport.zoom,
  };
}

// Canvas to Screen
function canvasToScreen(
  canvasX: number, 
  canvasY: number, 
  viewport: { zoom: number; panX: number; panY: number }
): Point {
  return {
    x: canvasX * viewport.zoom + viewport.panX,
    y: canvasY * viewport.zoom + viewport.panY,
  };
}
```

## State Management

```typescript
interface ViewportSlice {
  viewport: {
    zoom: number;        // 0.1 - 10.0
    panX: number;        // Pixels
    panY: number;        // Pixels
    isDragging: boolean; // Pan in progress
  };
  setZoom: (zoom: number, center?: Point) => void;
  setPan: (panX: number, panY: number) => void;
  resetViewport: () => void;
  fitToScreen: (elements: CanvasElement[]) => void;
}
```

## Implementation Details

**Zoom Hook**: `src/canvas/hooks/useCanvasZoom.ts`
- Handles wheel events
- Clamps zoom values
- Adjusts pan to maintain cursor position

**Touch Gestures Hook**: `src/canvas/hooks/useMobileTouchGestures.ts`
- Detects pinch gestures
- Calculates zoom scale from finger distance
- Handles simultaneous pan and zoom

**Pan Hook**: `src/canvas/hooks/useCanvasDrag.ts`
- Spacebar detection
- Drag tracking
- Pan state management

## Performance Optimizations

### Hardware Acceleration
- CSS `transform: translate() scale()` for 60fps
- GPU-accelerated rendering
- No layout recalculation during zoom/pan

### Throttling
- Wheel events: Debounced to 16ms (60fps)
- Touch events: Throttled to 50ms (20fps)
- State updates batched

### Rendering
- Only visible elements rendered
- Viewport culling for off-screen objects
- Level-of-detail adjustments at extreme zooms

## Usage Examples

### Programmatic Zoom

```typescript
import { useCanvasStore } from '@/store/canvasStore';

// Zoom to 200%
useCanvasStore.getState().setZoom(2.0);

// Zoom centered on point
useCanvasStore.getState().setZoom(1.5, { x: 500, y: 300 });
```

### Programmatic Pan

```typescript
// Pan to specific position
useCanvasStore.getState().setPan(100, 200);

// Pan relative to current position
const { panX, panY } = useCanvasStore.getState().viewport;
useCanvasStore.getState().setPan(panX + 50, panY - 30);
```

### Fit to Screen

```typescript
// Fit all elements in view
const elements = useCanvasStore.getState().elements;
useCanvasStore.getState().fitToScreen(elements);
```

### Reset Viewport

```typescript
// Reset to default (100% zoom, centered)
useCanvasStore.getState().resetViewport();
```

## Touch Gestures Reference

### Mobile Gestures

| Gesture | Action |
|---------|--------|
| **Pinch Out** | Zoom in |
| **Pinch In** | Zoom out |
| **Two-Finger Drag** | Pan canvas |
| **Pinch + Drag** | Zoom and pan simultaneously |

### Gesture Priority

1. **Two Fingers**: Always triggers viewport control
2. **One Finger**: Selection or drawing (depends on active tool)
3. **Three+ Fingers**: Reserved for system gestures

## Edge Cases

### Zoom Edge Cases
- **Minimum Zoom**: Displays at 10%, prevents further zoom out
- **Maximum Zoom**: Displays at 1000%, prevents further zoom in
- **Precision**: Zoom values stored with 3 decimal precision

### Pan Edge Cases
- **Infinite Panning**: No limits, users can pan arbitrarily far
- **Lost Elements**: "Fit to Screen" button returns to content
- **Empty Canvas**: Pan still works, allows positioning before drawing

## Accessibility

- **Keyboard Navigation**: Full zoom/pan control without mouse
- **Screen Readers**: Viewport state announced on change
- **Reduced Motion**: Respects `prefers-reduced-motion` setting

## Related Features

- [Selection](./selection) - Selection box accounts for zoom
- [Grids](../plugins/catalog/grid) - Grid scale adapts to zoom level
- [Snapping](../plugins/catalog/object-snap) - Snap distances zoom-aware
