---
id: hooks
title: React Hooks
sidebar_label: Hooks
---

# React Hooks

VectorNest provides a collection of **custom React hooks** that encapsulate common patterns and logic used throughout the application. These hooks promote code reuse, maintain consistency, and simplify component implementations.

## Overview

All custom hooks are located in `/src/hooks/` and follow React hooks conventions:

- Names start with `use` prefix
- Can call other hooks
- Must be called at the top level of components
- Return data, handlers, or both

## Hooks Catalog

### useDeletionActions

**Purpose**: Centralized hook for handling deletion operations across the application.

**Location**: `/src/hooks/useDeletionActions.ts`

**Use Cases**:
- Delete button in Bottom Action Bar
- Keyboard shortcuts (Delete/Backspace keys)
- Context menu delete actions

**Interface**:

```typescript
interface UseDeletionActionsOptions {
  selectedCommandsCount: number;       // Number of selected path commands
  selectedSubpathsCount: number;       // Number of selected subpaths
  selectedElementsCount: number;       // Number of selected canvas elements
  activePlugin?: string | null;        // Current active plugin/tool
  usePluginStrategy?: boolean;         // Use plugin-aware strategy (true) or priority-based (false)
  deleteSelectedCommands?: () => void;
  deleteSelectedSubpaths?: () => void;
  deleteSelectedElements: () => void;
}

interface DeletionActions {
  scope: DeletionScope;        // What will be deleted (commands/subpaths/elements)
  canDelete: boolean;          // Whether deletion is possible
  executeDeletion: () => boolean; // Execute the deletion
}
```

**Usage**:

```tsx
import { useDeletionActions } from '@/hooks/useDeletionActions';

// In BottomActionBar (plugin-aware strategy):
const { scope, canDelete, executeDeletion } = useDeletionActions({
  selectedCommandsCount,
  selectedSubpathsCount,
  selectedElementsCount: selectedIds.length,
  activePlugin,
  usePluginStrategy: true, // Respects active plugin context
  deleteSelectedCommands,
  deleteSelectedSubpaths,
  deleteSelectedElements,
});

<ToolbarIconButton
  icon={Trash2}
  label={`Delete ${scope.label}`}
  onClick={executeDeletion}
  counter={scope.count}
  counterColor="red"
  isDisabled={!canDelete}
/>
```

**Strategies**:

1. **Plugin-aware strategy** (`usePluginStrategy: true`):
   - In Edit/Subpath plugin → Delete commands (if selected)
   - In Edit plugin → Delete subpaths (if selected)
   - Otherwise → Delete canvas elements

2. **Priority-based strategy** (`usePluginStrategy: false`):
   - Priority order: Commands > Subpaths > Elements
   - Used for keyboard shortcuts (respects selection hierarchy)

**Deletion Scopes**:

```typescript
type DeletionScope = {
  type: 'commands' | 'subpaths' | 'elements' | 'none';
  count: number;
  label: string; // Human-readable label (e.g., "3 commands", "1 element")
};
```

---

### useDragResize

**Purpose**: Implements drag-to-resize functionality with pointer events.

**Location**: `/src/hooks/useDragResize.ts`

**Use Cases**:
- Sidebar resize handle (horizontal resize from right edge)
- Select Panel height adjustment (vertical resize, drag up = increase)
- Resizable panels and containers

**Interface**:

```typescript
interface UseDragResizeOptions {
  onResize: (newValue: number) => void;  // Callback with new width/height
  onReset?: () => void;                   // Double-click to reset
  minValue: number;                       // Minimum width/height
  maxValue: number;                       // Maximum width/height
  direction?: 'horizontal' | 'vertical';  // Resize direction (default: 'horizontal')
  reverseHorizontal?: boolean;            // Resize from right edge (default: false)
  reverseVertical?: boolean;              // Drag up = increase (default: false)
  initialValue?: number;                  // For calculating delta in reverse vertical mode
}

interface UseDragResizeResult {
  isDragging: boolean;                          // Whether currently dragging
  handlePointerDown: (e: React.PointerEvent) => void; // Start drag handler
  handleDoubleClick: (e: React.MouseEvent) => void;   // Reset handler
}
```

**Usage**:

```tsx
import { useDragResize } from '@/hooks/useDragResize';

// Sidebar resize handle (horizontal, from right edge):
const { isDragging, handlePointerDown, handleDoubleClick } = useDragResize({
  onResize: (width) => setSidebarWidth(width),
  onReset: () => setSidebarWidth(DEFAULT_WIDTH),
  minValue: 260,
  maxValue: 600,
  direction: 'horizontal',
  reverseHorizontal: true, // Resize from right edge
});

<div
  onPointerDown={handlePointerDown}
  onDoubleClick={handleDoubleClick}
  style={{
    width: '4px',
    cursor: isDragging ? 'ew-resize' : 'col-resize',
    backgroundColor: isDragging ? 'blue' : 'transparent',
  }}
/>
```

```tsx
// Select Panel height (vertical, drag up = increase):
const { isDragging, handlePointerDown, handleDoubleClick } = useDragResize({
  onResize: (height) => setSelectPanelHeight(height),
  onReset: () => setSelectPanelHeight(DEFAULT_HEIGHT),
  minValue: 200,
  maxValue: 800,
  direction: 'vertical',
  reverseVertical: true, // Drag up increases height
  initialValue: currentHeight,
});

<div
  onPointerDown={handlePointerDown}
  onDoubleClick={handleDoubleClick}
  style={{
    height: '4px',
    cursor: isDragging ? 'ns-resize' : 'row-resize',
  }}
/>
```

**Features**:

- Unified mouse and touch support via pointer events
- Prevents text selection during drag
- Constrains value within min/max bounds using `clamp` utility
- Sets appropriate cursor during drag (`ew-resize` or `ns-resize`)
- Double-click to reset to default value
- Global pointer event listeners (works across entire window)

---

### useRenderCount

**Purpose**: Debug hook to count component renders and calculate renders per second (RPS).

**Location**: `/src/hooks/useRenderCount.ts`

**Use Cases**:
- Performance profiling
- Identifying re-render issues
- Debug mode monitoring

**Interface**:

```typescript
interface RenderCountData {
  count: number; // Total render count since mount
  rps: number;   // Renders per second (based on last 2 seconds)
}

function useRenderCount(componentName?: string): RenderCountData;
```

**Usage**:

```tsx
import { useRenderCount } from '@/hooks/useRenderCount';

function MyExpensiveComponent() {
  const { count, rps } = useRenderCount('MyExpensiveComponent');

  // Only logs if settings.showRenderCountBadges is enabled
  // Logs: "[Render Count] MyExpensiveComponent: 42 (5.2 r/s)"

  return (
    <div>
      {/* Component content */}
      {import.meta.env.DEV && (
        <div>Renders: {count} ({rps} r/s)</div>
      )}
    </div>
  );
}
```

**Used by**:

- `RenderCountBadge` component
- `RenderCountBadgeWrapper` component
- `withRenderCountBadge` HOC

**Algorithm**:

1. Increment render count on every render
2. Store timestamps in array (last 2 seconds)
3. Calculate RPS: `renders / timeSpan`
4. Filter old timestamps to maintain sliding window
5. Log to console if `showRenderCountBadges` enabled in settings

**Typical RPS Values**:

- **0-2 RPS**: Normal, stable component
- **3-10 RPS**: Moderate updates (e.g., animation, cursor tracking)
- **10+ RPS**: High-frequency updates, potential optimization target

---

### useSelectionBounds

**Purpose**: Compute selection bounds data for overlay rendering.

**Location**: `/src/hooks/useSelectionBounds.ts`

**Use Cases**:
- Selection overlay (blue dashed rectangles)
- Transformation overlay (resize/rotate handles)
- Measuring selected elements and subpaths

**Interface**:

```typescript
interface UseSelectionBoundsParams {
  element: SelectionBoundsElement;              // Element being measured
  bounds: BoundingBox | null;                   // Element bounding box
  viewport: Viewport;                           // Current viewport (zoom, pan)
  selectedSubpaths?: SelectedSubpath[];         // Selected subpaths within element
  skipSubpathMeasurements?: boolean;            // Skip subpath calculations (default: false)
}

interface UseSelectionBoundsResult {
  selectionColor: string;                       // Color from element data (stroke/fill)
  strokeWidth: number;                          // Stroke width for rendering
  adjustedElementBounds: BoundingBox | null;    // Bounds adjusted for zoom
  elementRects: SelectionRect[];                // Rectangle data for element bounds
  subpathBoundsResults: SubpathBoundsResult[];  // Measured subpath bounds
  subpathRects: SelectionRect[];                // Rectangle data for subpath bounds
  subpathSelectionColor: string;                // Color for subpath selection (constant)
}
```

**Usage**:

```tsx
import { useSelectionBounds } from '@/hooks/useSelectionBounds';

function SelectionOverlay({ element, viewport }) {
  const bounds = useMemo(() => measureElement(element), [element]);
  
  const {
    selectionColor,
    strokeWidth,
    adjustedElementBounds,
    elementRects,
    subpathRects,
  } = useSelectionBounds({
    element,
    bounds,
    viewport,
    selectedSubpaths,
  });

  return (
    <>
      {/* Element selection rectangle */}
      {elementRects.map((rect) => (
        <rect
          key={rect.key}
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          stroke={selectionColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray="4 4"
        />
      ))}
      
      {/* Subpath selection rectangles */}
      {subpathRects.map((rect) => (
        <rect
          key={rect.key}
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          stroke="red"
          strokeWidth={2}
          fill="none"
        />
      ))}
    </>
  );
}
```

**Features**:

- Derives selection color from element stroke/fill
- Computes zoom-adjusted bounds (accounts for viewport zoom)
- Measures selected subpaths independently
- Builds rectangle data ready for SVG rendering
- Memoizes expensive calculations
- Skip subpath measurements for performance (transformation mode)

**Coordinate Adjustment**:

The hook adjusts bounds for zoom to ensure pixel-perfect overlay rendering:

```typescript
const adjustedBounds = computeAdjustedBounds(rawBounds, viewport.zoom);
// Expands bounds slightly to accommodate stroke width at current zoom
```

---

### useSelectPanelActions

**Purpose**: Shared store subscriptions for Select Panel components.

**Location**: `/src/hooks/useSelectPanelActions.ts`

**Use Cases**:
- Select Panel item components
- Select Panel group components
- Visibility/lock controls

**Interface**:

```typescript
interface SelectPanelActions {
  // Element actions
  toggleElementVisibility: (elementId: string) => void;
  toggleElementLock: (elementId: string) => void;
  selectElement: (id: string, multiSelect?: boolean) => void;
  
  // Group actions
  toggleGroupVisibility: (groupId: string) => void;
  toggleGroupLock: (groupId: string) => void;
  selectGroup: (id: string, multiSelect?: boolean) => void;
}
```

**Usage**:

```tsx
import { useSelectPanelActions } from '@/hooks/useSelectPanelActions';
import { getEffectiveShift } from '@/utils/effectiveShift';
import { useCanvasStore } from '@/store/canvasStore';

function SelectPanelItem({ element }) {
  const {
    toggleElementVisibility,
    toggleElementLock,
    selectElement,
  } = useSelectPanelActions();
  
  const isVirtualShiftActive = useCanvasStore(state => state.isVirtualShiftActive);

  const handleSelect = (e: React.MouseEvent) => {
    // Support both physical Shift key and Virtual Shift
    const effectiveMultiSelect = getEffectiveShift(e.shiftKey, isVirtualShiftActive);
    selectElement(element.id, effectiveMultiSelect);
  };

  return (
    <div>
      <IconButton
        icon={element.isHidden ? EyeOff : Eye}
        onClick={(e) => {
          e.stopPropagation();
          toggleElementVisibility(element.id);
        }}
      />
      <IconButton
        icon={element.isLocked ? Lock : Unlock}
        onClick={(e) => {
          e.stopPropagation();
          toggleElementLock(element.id);
        }}
      />
      <IconButton
        icon={MousePointer2}
        onClick={handleSelect}
      />
      {element.name}
    </div>
  );
}
```

**Multi-Selection Support**:

- `selectElement` and `selectGroup` now accept optional `multiSelect` parameter
- When `multiSelect=true`: Toggles element in selection (add/remove)
- When `multiSelect=false` or omitted: Replaces current selection
- Works with both physical Shift key and Virtual Shift (mobile)

**Benefits**:

- Consistent store subscriptions across Select Panel components
- Single source of truth for panel actions
- Prevents duplicate subscriptions
- Simplifies component implementations
- Unified multi-selection behavior across canvas and panel

---

### usePanelToggleHandlers

**Purpose**: Generic hook for creating toggle handlers in panel components.

**Location**: `/src/hooks/usePanelToggleHandlers.ts`

**Use Cases**:
- Grid Panel toggles (enabled, snap, rulers)
- Guidelines Panel toggles (enabled, snap)
- Settings Panel toggles (various settings)

**Interface**:

```typescript
function usePanelToggleHandlers<T extends Record<string, unknown>>(
  updater?: (updates: Partial<T>) => void
): {
  createToggleHandler: (key: keyof T) => (e: React.ChangeEvent<HTMLInputElement>) => void;
};
```

**Usage**:

```tsx
import { usePanelToggleHandlers } from '@/hooks/usePanelToggleHandlers';
import { PanelToggle } from '@/ui/PanelToggle';

function GridPanel() {
  const updateGridState = useCanvasStore(state => state.updateGrid);
  const grid = useCanvasStore(state => state.grid);
  
  const { createToggleHandler } = usePanelToggleHandlers(updateGridState);

  return (
    <>
      <PanelToggle
        isChecked={grid.enabled}
        onChange={createToggleHandler('enabled')}
      >
        Enable Grid
      </PanelToggle>
      
      <PanelToggle
        isChecked={grid.snapToGrid}
        onChange={createToggleHandler('snapToGrid')}
      >
        Snap to Grid
      </PanelToggle>
      
      <PanelToggle
        isChecked={grid.showRulers}
        onChange={createToggleHandler('showRulers')}
      >
        Show Rulers
      </PanelToggle>
    </>
  );
}
```

**Benefits**:

- Eliminates toggle handler duplication
- Type-safe key references (TypeScript autocomplete)
- Handles undefined updater gracefully (no-op)
- Consistent event handling pattern

**Before/After**:

```tsx
// ❌ Before: Verbose, repetitive
const handleToggleEnabled = (e: React.ChangeEvent<HTMLInputElement>) => {
  updateGrid({ enabled: e.target.checked });
};
const handleToggleSnap = (e: React.ChangeEvent<HTMLInputElement>) => {
  updateGrid({ snapToGrid: e.target.checked });
};
const handleToggleRulers = (e: React.ChangeEvent<HTMLInputElement>) => {
  updateGrid({ showRulers: e.target.checked });
};

// ✅ After: Concise, reusable
const { createToggleHandler } = usePanelToggleHandlers(updateGrid);
onChange={createToggleHandler('enabled')}
onChange={createToggleHandler('snapToGrid')}
onChange={createToggleHandler('showRulers')}
```

---

### useSidebarFooterHeight

**Purpose**: Manages CSS variable `--sidebar-footer-height` for dynamic footer sizing.

**Location**: `/src/hooks/useSidebarFooterHeight.ts`

**Use Cases**:
- Select Panel footer (ungroup/collapse controls)
- Sidebar footer with actions
- Panels with dynamic bottom sections

**Interface**:

```typescript
function useSidebarFooterHeight(
  additionalOffset?: number // Optional offset to add (default: 0)
): React.RefObject<HTMLDivElement>; // Ref to attach to footer element
```

**Usage**:

```tsx
import { useSidebarFooterHeight } from '@/hooks/useSidebarFooterHeight';

function SelectPanel() {
  const footerRef = useSidebarFooterHeight();

  return (
    <div>
      <div style={{ paddingBottom: 'var(--sidebar-footer-height)' }}>
        {/* Scrollable content */}
      </div>
      
      <div
        ref={footerRef}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'white',
        }}
      >
        {/* Footer controls */}
        <button>Ungroup</button>
        <button>Collapse</button>
      </div>
    </div>
  );
}
```

**With Additional Offset**:

```tsx
// Add padding/margin to measured height
const footerRef = useSidebarFooterHeight(80);
// CSS variable will be: actual height + 80px
```

**Features**:

- Automatically measures footer height using `offsetHeight`
- Sets CSS custom property `--sidebar-footer-height`
- Uses `ResizeObserver` for dynamic updates (if available)
- Cleans up CSS variable on unmount
- Fallback for browsers without `ResizeObserver`

**CSS Integration**:

```css
.panel-content {
  padding-bottom: var(--sidebar-footer-height, 0px);
  /* Prevents content from being hidden by fixed footer */
}
```

---

## Hook Patterns

### Selector Pattern

Many hooks use **granular Zustand selectors** to minimize re-renders:

```tsx
// ❌ Bad: Re-renders on ANY state change
const state = useCanvasStore();

// ✅ Good: Only re-renders when specific value changes
const toggleElementVisibility = useCanvasStore(state => state.toggleElementVisibility);
```

### Memoization Pattern

Expensive calculations are memoized with `useMemo`:

```tsx
const bounds = useMemo(() => 
  measureElement(element), 
  [element]
);
```

### Callback Pattern

Event handlers are wrapped with `useCallback` to prevent re-creation:

```tsx
const handleResize = useCallback(
  (newWidth: number) => {
    setSidebarWidth(newWidth);
  },
  [setSidebarWidth]
);
```

### Cleanup Pattern

Effects that add global listeners always clean up:

```tsx
useEffect(() => {
  if (isDragging) {
    document.addEventListener('pointermove', handleMove);
    return () => {
      document.removeEventListener('pointermove', handleMove);
    };
  }
}, [isDragging, handleMove]);
```

---

### useArrangeHandlers

**Purpose**: Provides context-aware handlers for alignment, distribution, size matching, and ordering operations based on the active plugin mode.

**Location**: `/src/hooks/useArrangeHandlers.ts`

**Use Cases**:
- ArrangePanel buttons in sidebar footer
- Alignment operations across different editing modes
- Distribution and ordering of elements, points, or subpaths

**Interface**:

```typescript
interface ArrangeHandlers {
  // Alignment
  alignLeft: () => void;
  alignCenter: () => void;
  alignRight: () => void;
  alignTop: () => void;
  alignMiddle: () => void;
  alignBottom: () => void;
  
  // Distribution
  distributeHorizontally: () => void;
  distributeVertically: () => void;
  
  // Size matching
  matchWidthToLargest: () => void;
  matchHeightToLargest: () => void;
  
  // Ordering (z-index)
  bringToFront: () => void;
  sendForward: () => void;
  sendBackward: () => void;
  sendToBack: () => void;
}
```

**Usage**:

```tsx
import { useArrangeHandlers } from '@/hooks/useArrangeHandlers';

const ArrangePanel: React.FC = () => {
  const handlers = useArrangeHandlers();
  
  return (
    <HStack>
      <IconButton onClick={handlers.alignLeft} icon={<AlignLeft />} />
      <IconButton onClick={handlers.alignCenter} icon={<AlignCenter />} />
      <IconButton onClick={handlers.distributeHorizontally} icon={<ArrowLeftRight />} />
    </HStack>
  );
};
```

**Context-Aware Behavior**:

The hook automatically selects the appropriate handlers based on `activePlugin`:

1. **Default mode** (select, pencil, shape, etc.):
   - Operations target selected canvas **elements**
   - Uses: `alignLeft()`, `distributeHorizontally()`, `bringToFront()`, etc.

2. **Edit mode** (`activePlugin === 'edit'`):
   - Operations target selected **control points** (commands)
   - Uses: `alignLeftCommands()`, `distributeHorizontallyCommands()`, etc.
   - Ordering operations are disabled (no-op functions)

3. **Subpath mode** (`activePlugin === 'subpath'`):
   - Operations target selected **subpaths**
   - Uses: `alignLeftSubpaths()`, `distributeHorizontallySubpaths()`, `bringSubpathToFront()`, etc.

**Implementation Details**:

```typescript
export const useArrangeHandlers = () => {
  const activePlugin = useCanvasStore(state => state.activePlugin);
  const store = useCanvasStore.getState();

  const handlers = useMemo(() => {
    const handlerMaps = {
      select: {
        alignLeft: store.alignLeft,
        // ... standard element operations
        bringToFront: store.bringToFront,
      },
      edit: {
        alignLeft: store.alignLeftCommands,
        // ... command operations
        bringToFront: () => {}, // Disabled in edit mode
      },
      subpath: {
        alignLeft: store.alignLeftSubpaths,
        // ... subpath operations
        bringToFront: store.bringSubpathToFront,
      }
    };

    return handlerMaps[activePlugin] || handlerMaps.select;
  }, [activePlugin, store]);

  return handlers;
};
```

**Store Methods**:

The hook maps to these Canvas Store methods:

| Operation | Elements | Commands (Edit) | Subpaths |
|-----------|----------|-----------------|----------|
| Align Left | `alignLeft()` | `alignLeftCommands()` | `alignLeftSubpaths()` |
| Align Center | `alignCenter()` | `alignCenterCommands()` | `alignCenterSubpaths()` |
| Align Right | `alignRight()` | `alignRightCommands()` | `alignRightSubpaths()` |
| Align Top | `alignTop()` | `alignTopCommands()` | `alignTopSubpaths()` |
| Align Middle | `alignMiddle()` | `alignMiddleCommands()` | `alignMiddleSubpaths()` |
| Align Bottom | `alignBottom()` | `alignBottomCommands()` | `alignBottomSubpaths()` |
| Distribute H | `distributeHorizontally()` | `distributeHorizontallyCommands()` | `distributeHorizontallySubpaths()` |
| Distribute V | `distributeVertically()` | `distributeVerticallyCommands()` | `distributeVerticallySubpaths()` |
| Match Width | `matchWidthToLargest()` | `matchWidthToLargestCommands()` | `matchWidthToLargestSubpaths()` |
| Match Height | `matchHeightToLargest()` | `matchHeightToLargestCommands()` | `matchHeightToLargestSubpaths()` |
| Bring to Front | `bringToFront()` | *(disabled)* | `bringSubpathToFront()` |
| Send Forward | `sendForward()` | *(disabled)* | `sendSubpathForward()` |
| Send Backward | `sendBackward()` | *(disabled)* | `sendSubpathBackward()` |
| Send to Back | `sendToBack()` | *(disabled)* | `sendSubpathToBack()` |

**Performance**:

- Handlers are memoized with `useMemo` to prevent recreation on every render
- Only subscribes to `activePlugin` changes, not the entire store
- Returns stable function references for optimal re-render behavior

**Example - ArrangePanel Integration**:

```tsx
const ArrangePanelComponent: React.FC = () => {
  const currentHandlers = useArrangeHandlers();
  const selectedCount = useCanvasStore(state => state.selectedIds.length);
  const selectedCommandsCount = useCanvasStore(state => state.selectedCommands?.length ?? 0);
  const activePlugin = useCanvasStore.getState().activePlugin;

  const canAlign = selectedCount >= 2 || 
    (activePlugin === 'edit' && selectedCommandsCount >= 2);

  const alignmentButtons = [
    { handler: currentHandlers.alignLeft, icon: <AlignLeft />, disabled: !canAlign },
    { handler: currentHandlers.alignCenter, icon: <AlignCenter />, disabled: !canAlign },
    { handler: currentHandlers.alignRight, icon: <AlignRight />, disabled: !canAlign },
  ];

  return (
    <HStack>
      {alignmentButtons.map(({ handler, icon, disabled }) => (
        <IconButton onClick={handler} icon={icon} isDisabled={disabled} />
      ))}
    </HStack>
  );
};
```

**Related Components**:

- `ArrangePanel` (`src/sidebar/panels/ArrangePanel.tsx`) - UI that consumes this hook
- Canvas Store alignment/distribution slices - Actual implementation of operations

---

## Best Practices

### For Hook Consumers

1. **Call hooks at top level**: Never call hooks conditionally or in loops
2. **Use correct dependencies**: Always include all values used inside effects/memos
3. **Avoid unnecessary subscriptions**: Use granular selectors, not entire state
4. **Test with React DevTools**: Profile component re-renders to verify optimization
5. **Read hook documentation**: Understand parameters and return values before using

### For Hook Developers

1. **Follow naming convention**: Always start with `use` prefix
2. **Document parameters**: Use JSDoc comments with `@param` and `@returns`
3. **Provide usage examples**: Include `@example` in JSDoc
4. **Handle edge cases**: Check for null/undefined, provide sensible defaults
5. **Memoize expensive operations**: Use `useMemo` and `useCallback` appropriately
6. **Clean up side effects**: Remove listeners, clear timers, reset global state
7. **Export TypeScript interfaces**: Make hook contracts explicit
8. **Write tests**: Unit test hook logic with `@testing-library/react-hooks`

---

## Related Documentation

- [Canvas Store](../api/canvas-store) - State management with Zustand
- [UI Components](../ui/components.md) - Components that use these hooks
- [Selection](../features/selection.md) - Uses selection-related hooks
- [Action Bars](../app-structure/actionbars.md) - Uses action hooks
- [Performance Optimization](../architecture/overview.md#performance-optimizations) - Optimization strategies

---

## Hooks File Structure

```
src/hooks/
├── useDeletionActions.ts         # Centralized deletion logic
├── useDragResize.ts              # Drag-to-resize functionality
├── useRenderCount.ts             # Performance profiling
├── useSelectionBounds.ts         # Selection overlay calculations
├── useSelectPanelActions.ts      # Select Panel store actions
├── usePanelToggleHandlers.ts    # Generic toggle handler factory
└── useSidebarFooterHeight.ts    # Footer height CSS variable management
```

---

## Creating New Hooks

When creating a new hook, follow this template:

```typescript
import { useMemo, useCallback } from 'react';

/**
 * Brief description of the hook's purpose
 * 
 * @param param1 - Description of parameter
 * @returns Description of return value
 * 
 * @example
 * ```tsx
 * const result = useMyHook({ option: 'value' });
 * ```
 */
export function useMyHook(options: MyHookOptions): MyHookResult {
  // 1. Extract options with defaults
  const { option1, option2 = 'default' } = options;

  // 2. State and refs
  const [state, setState] = useState(initialValue);

  // 3. Memoized values
  const computedValue = useMemo(() => {
    return expensiveCalculation(option1);
  }, [option1]);

  // 4. Callbacks
  const handleAction = useCallback(() => {
    // Implementation
  }, [/* dependencies */]);

  // 5. Effects with cleanup
  useEffect(() => {
    // Setup
    return () => {
      // Cleanup
    };
  }, [/* dependencies */]);

  // 6. Return interface
  return {
    value: computedValue,
    action: handleAction,
  };
}
```

**Checklist**:

- [ ] JSDoc comment with description, params, returns, example
- [ ] TypeScript interfaces exported for options and result
- [ ] Proper dependency arrays for `useMemo`, `useCallback`, `useEffect`
- [ ] Cleanup functions for side effects
- [ ] Sensible default values for optional parameters
- [ ] Memoization for expensive calculations
- [ ] Stable function references with `useCallback`
