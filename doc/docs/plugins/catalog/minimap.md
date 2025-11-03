---
id: minimap
title: Minimap Plugin
sidebar_label: Minimap
---

# Minimap Plugin

**Purpose**: Overview minimap for navigation in large canvases

## Overview

- Bird's-eye view of entire canvas
- Viewport indicator
- Click to jump to location
- Double-click to zoom into a specific area
- Scales with canvas content
- Always visible (global panel)

## Plugin Interaction Flow

```mermaid
sequenceDiagram
    participant User
    participant MM as Minimap Plugin
    participant Store
    participant Canvas
    participant EB as Event Bus
    
    activate MM
    MM->>Store: Subscribe to viewport changes
    MM->>Store: Subscribe to elements changes
    MM->>Canvas: Create minimap overlay
    
    loop Continuous Updates
        Store->>MM: Viewport changed
        MM->>MM: Calculate thumbnail scale
        MM->>Canvas: Render minimap view
        MM->>Canvas: Draw viewport rectangle
    end
    
    User->>Canvas: Click minimap
    Canvas->>MM: handleMinimapClick(pos)
    MM->>Store: Calculate viewport position
    Store->>EB: Publish 'viewport:pan'
    EB->>Canvas: Update main canvas view
    MM->>Canvas: Update minimap viewport rect
    
    User->>Canvas: Double-click minimap area
    Canvas->>MM: handleMinimapDoubleClick(area)
    MM->>Store: Calculate zoom to fit area
    Store->>EB: Publish 'viewport:zoom'
    EB->>Canvas: Zoom and center on area
    MM->>Canvas: Update minimap viewport rect
    
    deactivate MM
```

## Handler

N/A (uses dedicated panel)

## Keyboard Shortcuts

No plugin-specific shortcuts.

## UI Contributions

### Panels

**MinimapPanel**: Global navigation panel displayed in the bottom-right corner
- Shows a bird's-eye view of all canvas content
- Displays a viewport rectangle showing the current visible area
- Interactive controls:
  - **Click**: Pan to clicked location
  - **Double-click**: Zoom to fit the clicked area into view
  - **Drag viewport rectangle**: Pan the main canvas
- Auto-scales to fit all elements with padding
- Updates in real-time as elements move or viewport changes

### Overlays

No overlays.

### Canvas Layers

No canvas layers.

## Public APIs

No public APIs exposed.

## Usage Examples

### Interacting with the Minimap

**Click to Pan:**
```typescript
// The minimap automatically handles clicks
// User clicks on minimap at position (x, y)
// -> Viewport pans so that position is centered
```

**Double-Click to Zoom:**
```typescript
// User double-clicks on minimap
// -> Calculates bounds around clicked area
// -> Zooms to fit that area with appropriate padding
```

**Drag Viewport Rectangle:**
```typescript
// User can drag the viewport rectangle on the minimap
// -> Updates main canvas pan in real-time
```

### Accessing Minimap State

```typescript
import { useCanvasStore } from '../../store/canvasStore';

function MyComponent() {
  // Get viewport information
  const viewport = useCanvasStore(state => ({
    panX: state.panX,
    panY: state.panY,
    zoom: state.zoom
  }));
  
  // Get all elements for minimap rendering
  const elements = useCanvasStore(state => state.elements);
  
  return null;
}
```



## Implementation Details

**Location**: `src/plugins/minimap/`

**Files**:
- `index.tsx`: Plugin definition with minimal metadata
- `MinimapPanel.tsx`: Main panel component with rendering and interaction logic

**Key Features**:
- Automatic bounds calculation from all canvas elements
- Scale calculation to fit content within minimap dimensions
- Viewport rectangle tracking and interaction
- Drag state management with pointer events
- Real-time synchronization with main canvas

## Edge Cases & Limitations

- **Empty canvas**: Minimap shows default viewport when no elements exist
- **Performance**: Large numbers of elements are rendered simplified in minimap
- **Dragging**: Uses pointer capture to ensure smooth dragging experience
- **Scaling**: Automatically adjusts scale to show all content with padding
- **Touch devices**: Supports both mouse and touch pointer events
- **Position**: Fixed in bottom-right corner, offset by sidebar width

## Related

- [Plugin System Overview](../overview)
- [Event Bus](../../event-bus/overview)


