---
id: mobile
title: Mobile Features
sidebar_label: Mobile
---

# Mobile Features

VectorNest provides a comprehensive set of mobile-specific features and adaptations to ensure a smooth touch-based editing experience on smartphones and tablets.

## Overview

The application automatically detects mobile devices and adapts its interface and behavior accordingly. Key mobile features include:

- **Touch Gestures**: Pinch-to-zoom and two-finger pan
- **Virtual Shift**: Touch-friendly modifier key simulation
- **Responsive Layout**: Adaptive UI optimized for smaller screens
- **Touch-Optimized Controls**: Larger hit areas and touch-friendly interactions

---

## Touch Gestures

### Pinch-to-Zoom

Use two fingers to zoom in and out of the canvas.

**How it works:**
- Place two fingers on the canvas
- Spread fingers apart to zoom in
- Pinch fingers together to zoom out
- The zoom center is calculated at the midpoint between your fingers

**Implementation Details:**
- Minimum zoom: 0.1× (10%)
- Maximum zoom: 100× (10000%)
- Smooth interpolation between zoom levels
- Real-time viewport updates during gesture

```typescript
// Touch gesture implementation
import { useMobileTouchGestures } from '../canvas/hooks/useMobileTouchGestures';

// In your component
useMobileTouchGestures(svgRef);
```

### Two-Finger Pan

Pan across the canvas using two fingers.

**How it works:**
- Place two fingers on the canvas
- Move both fingers in the same direction to pan
- Pan continues smoothly as you drag
- Automatically calculates midpoint between fingers

**Features:**
- Smooth panning with precision formatting
- Prevents default touch behavior during gestures
- Works simultaneously with pinch-to-zoom
- Preserves single-tap and double-tap interactions

---

## Virtual Shift

Virtual Shift mode provides a touch-friendly alternative to holding the physical Shift key on mobile devices.

### What is Virtual Shift?

Virtual Shift is a toggle button that simulates holding the Shift key modifier. When active, it affects all interactions that normally require Shift:

- **Multi-selection**: Add/remove elements from selection
- **Constrained transformations**: Maintain aspect ratios
- **Path operations**: Extend selections in edit mode

### How to Use

1. **Enable Virtual Shift**: Tap the Virtual Shift button in the toolbar
2. **Perform actions**: All actions behave as if Shift is held
3. **Disable Virtual Shift**: Tap the button again to toggle off

### Visual Indicator

When Virtual Shift is active:
- The button appears highlighted/pressed
- All Shift-dependent operations work without touching the screen

### Implementation

```typescript
// Store state
interface BaseState {
  isVirtualShiftActive: boolean;
  setVirtualShift: (active: boolean) => void;
  toggleVirtualShift: () => void;
}

// Effective shift calculation
import { getEffectiveShift } from '../utils/effectiveShift';

const effectiveShiftKey = getEffectiveShift(
  event.shiftKey,           // Physical Shift key
  isVirtualShiftActive      // Virtual Shift state
);
```

### Where Virtual Shift Works

Virtual Shift affects behavior in:
- **Select Plugin**: Multi-selection with tap
- **Edit Plugin**: Multiple point selection
- **Subpath Plugin**: Subpath multi-selection
- **Transformation Plugin**: Constrained scaling/rotation
- **Canvas Events**: General pointer interactions

---

## Responsive Layout

The application adapts its layout based on screen size using Chakra UI breakpoints.

### Breakpoints

```typescript
breakpoints: {
  base: '0em',    // 0px - Mobile portrait
  sm: '30em',     // ~480px - Mobile landscape
  md: '48em',     // ~768px - Tablet/Desktop
  lg: '64em',     // ~1024px - Desktop
  xl: '80em',     // ~1280px - Large desktop
  '2xl': '96em'   // ~1536px - Extra large
}
```

### Mobile vs Desktop Detection

```typescript
// Component-level detection
const isDesktop = useBreakpointValue(
  { base: false, md: true },
  { ssr: false }
);

const isMobile = useBreakpointValue(
  { base: true, md: false },
  { fallback: 'md' }
);
```

### Layout Adaptations

#### Sidebar Behavior

**Desktop (md and up):**
- Pinned by default
- Resizable width (drag handle)
- Can be unpinned to overlay mode
- Persists state across sessions

**Mobile (base to sm):**
- Never pinned (always overlay mode)
- Full-height drawer
- Swipe to close
- Hamburger menu to open
- Pin button is hidden

```typescript
// Desktop: pinned by default, Mobile: never pinned
const [isPinned, setIsPinned] = useState(isDesktop ?? true);

// Sync isPinned with desktop/mobile changes
useEffect(() => {
  if (!isDesktop) {
    // Mobile: always unpinned
    setIsPinned(false);
  }
}, [isDesktop]);
```

#### Action Bars

**Top Action Bar:**
- Shows hamburger menu button when sidebar is not pinned
- Full-width on mobile
- Floating with responsive padding
- Adapts spacing based on sidebar state

**Bottom Action Bar:**
- Floating toolbar at bottom of screen
- Responsive spacing from screen edges
- Adapts to sidebar width when pinned
- Touch-optimized button sizes

```typescript
// Action bar positioning
<FloatingToolbarShell
  toolbarPosition="bottom"
  sidebarWidth={sidebarWidth}
  sx={{
    transition: 'left 0.3s ease-in-out',
  }}
/>
```

#### Minimap

**Desktop:**
- Always visible (when enabled in settings)
- Fixed position at bottom-right
- Overlays canvas

**Mobile:**
- **Hidden by default** to save screen space
- Can be enabled in settings, but not recommended
- Uses CSS `display: { base: 'none', md: 'block' }`

```tsx
// Minimap visibility
<Box
  display={{ base: 'none', md: 'block' }}
  position="fixed"
  bottom={`${MINIMAP_MARGIN}px`}
  right={`${sidebarWidth + MINIMAP_MARGIN}px`}
>
  {/* Minimap content */}
</Box>
```

---

## Touch-Optimized Controls

### Larger Hit Areas

Interactive elements on mobile have larger hit areas for better touch accuracy.

**Edit Points:**
```typescript
// Calculate larger hit area for better touch/mouse interaction
const POINT_RADIUS = 4;        // Visual radius
const HIT_AREA_RADIUS = 12;    // Touch hit radius (3x larger)

// Point detection
const distance = Math.sqrt(dx * dx + dy * dy);
if (distance <= HIT_AREA_RADIUS) {
  // Point is touched
}
```

**Toolbar Buttons:**
- Minimum touch target: 44px × 44px (iOS guidelines)
- Adequate spacing between buttons
- Visual feedback on press

### Touch Event Handling

The application uses pointer events for unified mouse and touch support:

```typescript
// Unified pointer events
onPointerDown={handlePointerDown}
onPointerMove={handlePointerMove}
onPointerUp={handlePointerUp}
```

**Benefits:**
- Consistent behavior across input types
- Automatic pointer capture
- Better performance than separate mouse/touch handlers

### Prevent Unwanted Touch Behaviors

```css
/* Prevent tap highlight on mobile (index.css) */
* {
  -webkit-tap-highlight-color: transparent;
  tap-highlight-color: transparent;
}

/* Prevent text selection during drag */
user-select: none;
-webkit-user-select: none;
```

---

## Mobile-Specific Limitations

### Hidden Features

Some features are hidden or disabled on mobile to optimize the experience:

#### 1. **Keyboard Shortcuts Help**
- Keyboard shortcuts are not shown in help documentation on mobile
- Virtual Shift replaces Shift key modifier
- Most shortcuts are unavailable without physical keyboard

#### 2. **Minimap Panel**
- Hidden by default on screens smaller than 768px
- Can be enabled but not recommended due to limited screen space
- Uses valuable canvas area

#### 3. **Sidebar Pinning**
- Pin/unpin toggle is hidden on mobile
- Sidebar always operates in overlay mode
- Cannot be permanently docked

#### 4. **Advanced Panels**
- Some complex panels show simplified versions
- Curve editing panels may hide advanced controls
- Examples:
  ```typescript
  const isMobile = useBreakpointValue({ base: true, md: false });
  
  // Conditionally render complex UI
  {hasPoints && !isMobile && (
    <AdvancedControls />
  )}
  ```

### Touch-Specific Considerations

#### Double-Tap Detection
- Some interactions use double-tap instead of double-click
- 300ms threshold for double-tap detection
- Used in minimap for zoom-to-element

#### Gesture Conflicts
- Multi-touch gestures (pinch, two-finger pan) take precedence
- Single-touch events only fire when gesture is not active
- Prevents interference with tap/click events

```typescript
// Prevent default only for active gestures
const handleTouchEnd = (event: TouchEvent) => {
  const wasGestureActive = gestureStateRef.current.isGestureActive;
  
  if (wasGestureActive) {
    event.preventDefault();
    event.stopPropagation();
  }
  // Otherwise, allow tap events to work normally
};
```

---

## Edge Spacing and Safe Areas

### Action Bar Positioning

Action bars respect safe areas and maintain adequate spacing from screen edges:

```typescript
// FloatingToolbarShell spacing
const MOBILE_EDGE_SPACING = '8px';   // Minimum spacing from edges
const DESKTOP_EDGE_SPACING = '16px'; // More spacing on desktop

// Bottom position accounts for iOS safe area
bottom={`calc(${MOBILE_EDGE_SPACING} + env(safe-area-inset-bottom))`}
```

### Responsive Margins

```typescript
// Theme spacing configuration
export const spacing = {
  toolbar: {
    base: '8px',   // Mobile
    md: '12px',    // Tablet
    lg: '16px',    // Desktop
  },
  actionBar: {
    horizontal: { base: '8px', md: '16px' },
    vertical: { base: '8px', md: '12px' },
  },
};
```

---

## Testing on Mobile

### Browser Testing

**iOS Safari:**
- Primary testing target
- Test gestures, viewport, and safe areas
- Verify touch event handling

**Android Chrome:**
- Secondary testing target
- Test pinch-to-zoom behavior
- Verify tap highlight removal

### Responsive Testing Tools

**Chrome DevTools:**
1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select device preset or custom dimensions
4. Test touch events (Enable touch simulation)

**Safari Web Inspector:**
1. Enable Develop menu in Safari preferences
2. Select "Enter Responsive Design Mode"
3. Choose device or custom viewport
4. Test on actual iOS devices via USB debugging

### Key Test Cases

- [ ] Two-finger pinch zoom works smoothly
- [ ] Two-finger pan doesn't conflict with pinch
- [ ] Single tap works for selection
- [ ] Double-tap doesn't trigger zoom (prevented)
- [ ] Virtual Shift toggles correctly
- [ ] Sidebar opens/closes with menu button
- [ ] Action bars don't overlap content
- [ ] Minimap is hidden on mobile
- [ ] No tap highlights appear
- [ ] Safe area insets are respected

---

## API Reference

### Mobile Touch Gestures Hook

```typescript
import { useMobileTouchGestures } from '../canvas/hooks/useMobileTouchGestures';

interface TouchInfo {
  id: number;
  x: number;
  y: number;
}

interface GestureState {
  touches: TouchInfo[];
  initialDistance: number | null;
  initialZoom: number;
  initialPanX: number;
  initialPanY: number;
  initialMidpoint: { x: number; y: number } | null;
  isGestureActive: boolean;
}

// Usage
const svgRef = useRef<SVGSVGElement>(null);
useMobileTouchGestures(svgRef);
```

### Virtual Shift State

```typescript
// Store methods
const isVirtualShiftActive = useCanvasStore(state => state.isVirtualShiftActive);
const setVirtualShift = useCanvasStore(state => state.setVirtualShift);
const toggleVirtualShift = useCanvasStore(state => state.toggleVirtualShift);

// Utility function
import { getEffectiveShift } from '../utils/effectiveShift';

function getEffectiveShift(
  physicalShiftKey: boolean,
  isVirtualShiftActive: boolean
): boolean {
  return physicalShiftKey || isVirtualShiftActive;
}
```

### Breakpoint Detection

```typescript
import { useBreakpointValue } from '@chakra-ui/react';

// Returns true on desktop, false on mobile
const isDesktop = useBreakpointValue(
  { base: false, md: true },
  { ssr: false }
);

// Returns true on mobile, false on desktop
const isMobile = useBreakpointValue(
  { base: true, md: false },
  { fallback: 'md' }
);
```

---

## Best Practices

### For Plugin Developers

1. **Always check for mobile context:**
   ```typescript
   const isMobile = useBreakpointValue({ base: true, md: false });
   ```

2. **Use effective shift instead of raw shift:**
   ```typescript
   const effectiveShift = getEffectiveShift(
     event.shiftKey,
     isVirtualShiftActive
   );
   ```

3. **Provide touch-optimized hit areas:**
   ```typescript
   const hitRadius = isMobile ? 16 : 8;
   ```

4. **Hide complex UI on mobile:**
   ```typescript
   {!isMobile && <AdvancedPanel />}
   ```

5. **Use pointer events instead of mouse/touch:**
   ```typescript
   onPointerDown={handler}  // ✅ Good
   onMouseDown={handler}    // ❌ Avoid
   ```

### For End Users

1. **Enable Virtual Shift** when you need multi-select or constrained transforms
2. **Use two-finger gestures** for zoom and pan - they're more precise
3. **Rotate your device** to landscape for more workspace
4. **Close the sidebar** when editing to maximize canvas space
5. **Disable minimap** in settings to reclaim screen space

---

## Troubleshooting

### Pinch zoom not working
- Ensure you're using two fingers
- Check that you're touching the canvas, not UI elements
- Try refreshing the page

### Virtual Shift not responding
- Check that the button shows active state when tapped
- Try toggling it off and on again
- Verify in the store: `isVirtualShiftActive`

### Sidebar won't pin on mobile
- This is expected behavior - sidebar cannot be pinned on mobile devices
- Use the hamburger menu to open/close the sidebar

### Touch events feel laggy
- Check device performance (older devices may struggle)
- Close other browser tabs to free memory
- Disable minimap and complex overlays

### Action bars overlap content
- Report as a bug - this shouldn't happen
- Check for custom CSS that might interfere
- Verify safe area insets are applied

---

## Future Enhancements

Potential mobile improvements being considered:

- **Haptic feedback** for important interactions
- **Gesture customization** (e.g., three-finger undo)
- **Stylus support** with pressure sensitivity
- **Offline mode** with service workers
- **Native app wrapper** for app store distribution
- **Better landscape layout** optimization
- **Swipe gestures** for sidebar and undo/redo

---

## Related Documentation

- [Architecture Overview](../architecture/overview.md) - System design
- [Canvas Store API](../api/canvas-store) - State management
- [UI Components](../ui/components.md) - UI system
