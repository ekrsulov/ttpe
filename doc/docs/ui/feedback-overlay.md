---
id: feedback-overlay
title: Feedback Overlay
sidebar_label: Feedback Overlay
---

# Feedback Overlay

**Purpose**: Provide real-time visual feedback for user interactions on the canvas

## Overview

The FeedbackOverlay is a global canvas component that displays contextual information during interactive operations. It shows numerical feedback for transformations, measurements, and cursor positions in a non-intrusive overlay that follows the viewport.

**Key Features:**
- Real-time feedback during rotation, resize, and shape creation
- Viewport-aware positioning (always visible in bottom-left corner)
- Shift key indicator for constrained operations
- Visual highlighting when values hit constraint thresholds
- Automatic scaling with canvas zoom

## Feedback Types

### Rotation Feedback

Displayed when rotating elements or shapes.

```typescript
interface RotationFeedback {
  degrees: number;           // Current rotation angle
  visible: boolean;          // Show/hide feedback
  isShiftPressed: boolean;   // Shift key constraint active
  isMultipleOf15: boolean;   // Highlight when angle is multiple of 15°
}
```

**Display Format**: `45°` or `45° ⇧` (when Shift is pressed)

**Features**:
- Shows rotation angle in degrees
- Highlights when angle is a multiple of 15° (0°, 15°, 30°, 45°, etc.)
- Shift indicator when constraining rotation to 15° increments
- Width adapts: 55px normal, 75px with Shift indicator

### Resize Feedback

Displayed when resizing elements or transforming bounding boxes.

```typescript
interface ResizeFeedback {
  deltaX: number;           // Width change
  deltaY: number;           // Height change
  visible: boolean;         // Show/hide feedback
  isShiftPressed: boolean;  // Shift key constraint active
  isMultipleOf10: boolean;  // Highlight when delta is multiple of 10
}
```

**Display Format**: `x+10, y-5` or `x+10, y-5 ⇧`

**Features**:
- Shows delta change in X and Y dimensions
- Displays + or - prefix for positive/negative changes
- Highlights when both deltaX and deltaY are multiples of 10
- Shift indicator when constraining proportions
- Width adapts: 85px normal, 95px with Shift indicator

### Shape Creation Feedback

Displayed when creating shapes (rectangle, ellipse, etc.) by dragging.

```typescript
interface ShapeFeedback {
  width: number;            // Shape width
  height: number;           // Shape height
  visible: boolean;         // Show/hide feedback
  isShiftPressed: boolean;  // Shift key for aspect ratio
  isMultipleOf10: boolean;  // Highlight when dimensions are multiples of 10
}
```

**Display Format**: `100 × 50` or `100 × 100 ⇧`

**Features**:
- Shows actual width and height dimensions
- Highlights when both dimensions are multiples of 10
- Shift indicator when constraining to square/circle
- Width adapts: 75px normal, 85px with Shift indicator

### Point Position Feedback

Displayed when moving control points or anchors in edit mode.

```typescript
interface PointPositionFeedback {
  x: number;      // Absolute X coordinate
  y: number;      // Absolute Y coordinate
  visible: boolean;
}
```

**Display Format**: `125, 340`

**Features**:
- Shows absolute canvas coordinates
- Useful for precise point positioning
- Fixed width: 75px
- No highlighting or special states

## Visual Design

### Positioning

The feedback overlay is positioned in the **bottom-left corner** of the visible canvas viewport, with a small margin:

```typescript
const transform = `translate(
  ${-viewport.panX / viewport.zoom + 5 / viewport.zoom} 
  ${-viewport.panY / viewport.zoom + canvasSize.height / viewport.zoom - 33 / viewport.zoom}
) scale(${1 / viewport.zoom})`;
```

**Key Properties**:
- **X Position**: 5px from left edge (adjusted for pan and zoom)
- **Y Position**: 33px from bottom edge (adjusted for pan and zoom)
- **Scaling**: Inverse zoom scaling maintains consistent size
- **Follows Viewport**: Stays visible when panning or zooming

### Appearance

**Normal State** (Light Mode):
- Background: `#1f2937` (dark gray)
- Border: `#374151` (darker gray)
- Text: `#ffffff` (white)
- Opacity: 0.9
- Border radius: 4px
- Height: 24px

**Normal State** (Dark Mode):
- Background: `#f1f5f9` (light gray)
- Border: `#94a3b8` (medium gray)
- Text: `#0f172a` (very dark)
- Opacity: 0.9

**Highlighted State** (when at constraint threshold):
- Background: Brighter gray (`#6b7280` light / `#4b5563` dark)
- Border: Lighter stroke (`#9ca3af` light / `#6b7280` dark)
- Text: White in both modes
- Indicates value is at a "snap" point (multiple of 10 or 15)

### Typography

- **Font**: System font stack (`system-ui, -apple-system, sans-serif`)
- **Size**: 12px
- **Weight**: 500 (medium)
- **Alignment**: Center

## Usage Examples

### Rotation Feedback

```typescript
import { FeedbackOverlay } from '../../overlays/FeedbackOverlay';

function MyCanvas() {
  const [rotationAngle, setRotationAngle] = useState(0);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  
  return (
    <svg>
      <FeedbackOverlay
        viewport={{ panX: 0, panY: 0, zoom: 1 }}
        canvasSize={{ width: 800, height: 600 }}
        rotationFeedback={{
          degrees: rotationAngle,
          visible: true,
          isShiftPressed: isShiftPressed,
          isMultipleOf15: rotationAngle % 15 === 0
        }}
      />
    </svg>
  );
}
```

### Resize Feedback

```typescript
<FeedbackOverlay
  viewport={viewport}
  canvasSize={canvasSize}
  resizeFeedback={{
    deltaX: 20,
    deltaY: -15,
    visible: isDragging,
    isShiftPressed: event.shiftKey,
    isMultipleOf10: (20 % 10 === 0) && (-15 % 10 === 0)
  }}
/>
```

### Shape Creation Feedback

```typescript
<FeedbackOverlay
  viewport={viewport}
  canvasSize={canvasSize}
  shapeFeedback={{
    width: 100,
    height: 100,
    visible: isDrawing,
    isShiftPressed: event.shiftKey,
    isMultipleOf10: (100 % 10 === 0) && (100 % 10 === 0)
  }}
/>
```

### Point Position Feedback

```typescript
<FeedbackOverlay
  viewport={viewport}
  canvasSize={canvasSize}
  pointPositionFeedback={{
    x: Math.round(point.x),
    y: Math.round(point.y),
    visible: isMovingPoint
  }}
/>
```

### Multiple Feedback Types

Only one feedback type is typically shown at a time, but the component supports multiple props:

```typescript
<FeedbackOverlay
  viewport={viewport}
  canvasSize={canvasSize}
  rotationFeedback={rotation}
  resizeFeedback={resize}
  shapeFeedback={shape}
  pointPositionFeedback={position}
/>
```

Each feedback type will only render if its `visible` property is `true`.

## Implementation Details

**Location**: `src/overlays/FeedbackOverlay.tsx`

**Component Structure**:
```typescript
FeedbackOverlay (container)
  └── FeedbackBlock (internal component)
      ├── <rect> - Background/border
      └── <text> - Content display
```

**Key Rendering Logic**:

1. **Viewport Transformation**: Calculates position based on viewport pan, zoom, and canvas size
2. **Conditional Rendering**: Each feedback type only renders when `visible === true`
3. **Theme Awareness**: Uses Chakra UI's `useColorModeValue` for light/dark mode support
4. **Dynamic Sizing**: Width adjusts based on content and shift key state
5. **Highlighting Logic**: Different colors when hitting constraint thresholds

**Performance Considerations**:
- Lightweight SVG rendering
- No animations (static positioning)
- Re-renders only when props change
- Minimal DOM nodes (one rect + one text per visible feedback)

## Integration with Plugins

Plugins that use FeedbackOverlay:

### Transformation Plugin
```typescript
// Shows rotation and resize feedback during transforms
<FeedbackOverlay
  rotationFeedback={{
    degrees: currentRotation,
    visible: isRotating,
    isShiftPressed: shiftKey,
    isMultipleOf15: currentRotation % 15 === 0
  }}
/>
```

### Shape Plugin
```typescript
// Shows dimensions during shape creation
<FeedbackOverlay
  shapeFeedback={{
    width: Math.abs(endX - startX),
    height: Math.abs(endY - startY),
    visible: isDrawing,
    isShiftPressed: constrainAspect,
    isMultipleOf10: checkMultiples(width, height)
  }}
/>
```

### Edit Plugin
```typescript
// Shows point coordinates during point movement
<FeedbackOverlay
  pointPositionFeedback={{
    x: Math.round(pointX),
    y: Math.round(pointY),
    visible: isMovingPoint
  }}
/>
```

## Edge Cases & Limitations

- **Single Display**: Only one feedback type should be shown at a time for clarity
- **Viewport Bounds**: Positioned in bottom-left; may overlap content if canvas is very small
- **Zoom Levels**: Text remains readable at all zoom levels due to inverse scaling
- **Long Numbers**: Very large numbers may truncate if they exceed the feedback block width
- **Performance**: Re-calculates transform on every render when viewport changes
- **Theme Switching**: Smooth transition between light/dark modes
- **Mobile**: Touch events don't show Shift key indicator (no Shift on mobile keyboards)

## Related

- [UI Components](./components) - Other reusable UI components
- [Transformation Plugin](../plugins/catalog/transformation) - Uses rotation and resize feedback
- [Shape Plugin](../plugins/catalog/shape) - Uses shape creation feedback
- [Edit Plugin](../plugins/catalog/edit) - Uses point position feedback
