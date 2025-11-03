# Match

**Category**: Core Feature  
**Purpose**: Homogenize dimensions of selected elements by matching width or height to the largest selected element

## Overview

The Match feature allows users to quickly standardize the dimensions of multiple selected elements. When two or more paths are selected, Match operations resize all elements to match either the width or height of the largest element in the selection.

```mermaid
graph LR
    Selection[Multiple Selected<br/>Elements] --> Analyze[Find Largest<br/>Dimension]
    Analyze --> Scale[Scale Each Element<br/>to Match]
    Scale --> Result[Uniform<br/>Dimensions]
    
    style Selection fill:#e3f2fd
    style Analyze fill:#fff3e0
    style Scale fill:#f3e5f5
    style Result fill:#e8f5e9
```

---

## Features

### Match Width

**Operation**: Resize all selected elements to match the width of the widest element

**Requirements**:
- At least 2 paths selected
- Available in: Select mode, Subpath mode
- **Not available** in Edit mode (commands cannot be scaled)

**Behavior**:
1. Calculate bounds for all selected elements
2. Identify the element with maximum width
3. Calculate scale factor for each element
4. Scale path data horizontally while maintaining center position
5. Preserve height (vertical dimension unchanged)

**Mathematical Process**:

```typescript
const largestWidth = Math.max(...elements.map(el => el.width));

for each element:
  scaleFactor = largestWidth / currentWidth;
  scaleX = scaleFactor;
  scaleY = 1; // Preserve height
  
  // Scale path around center point
  centerX = (bounds.minX + bounds.maxX) / 2;
  centerY = (bounds.minY + bounds.maxY) / 2;
  
  newPathData = scalePathData(pathData, scaleX, scaleY, centerX, centerY);
```

**Visual Example**:

```
Before Match Width:
┌──────┐  ┌────────────┐  ┌─────┐
│  A   │  │     B      │  │  C  │
│      │  │            │  │     │
└──────┘  └────────────┘  └─────┘
 60px         100px        40px

After Match Width:
┌────────────┐  ┌────────────┐  ┌────────────┐
│     A      │  │     B      │  │     C      │
│            │  │            │  │            │
└────────────┘  └────────────┘  └────────────┘
    100px            100px           100px
```

### Match Height

**Operation**: Resize all selected elements to match the height of the tallest element

**Requirements**:
- At least 2 paths selected
- Available in: Select mode, Subpath mode
- **Not available** in Edit mode (commands cannot be scaled)

**Behavior**:
1. Calculate bounds for all selected elements
2. Identify the element with maximum height
3. Calculate scale factor for each element
4. Scale path data vertically while maintaining center position
5. Preserve width (horizontal dimension unchanged)

**Mathematical Process**:

```typescript
const largestHeight = Math.max(...elements.map(el => el.height));

for each element:
  scaleFactor = largestHeight / currentHeight;
  scaleX = 1; // Preserve width
  scaleY = scaleFactor;
  
  // Scale path around center point
  centerX = (bounds.minX + bounds.maxX) / 2;
  centerY = (bounds.minY + bounds.maxY) / 2;
  
  newPathData = scalePathData(pathData, scaleX, scaleY, centerX, centerY);
```

**Visual Example**:

```
Before Match Height:
┌────┐  ┌────┐  ┌────┐
│ A  │  │ B  │  │ C  │
│    │  │    │  └────┘
└────┘  │    │   30px
 50px   │    │
        │    │
        └────┘
         80px

After Match Height:
┌────┐  ┌────┐  ┌────┐
│ A  │  │ B  │  │ C  │
│    │  │    │  │    │
│    │  │    │  │    │
│    │  │    │  │    │
│    │  │    │  │    │
└────┘  └────┘  └────┘
 80px    80px    80px
```

---

## User Interface

### Arrange Panel

Match operations are located in the **Arrange Panel** at the bottom of the sidebar:

**Location**:
- Sidebar → Bottom section → Arrange Panel (collapsible)
- Visible when elements are selected

**Button Layout**:

```
┌─────────────────────────────────────────┐
│  [↔] [↑] [→] [↓] [↕] [←]        [⬌]   │  ← Align + Match Height
│  [⇄] [⇅]   [↟] [↥] [↧] [↡]   [⬍]      │  ← Distribute + Order + Match Width
└─────────────────────────────────────────┘

[⬌] = Match Height to Largest (MoveVertical icon)
[⬍] = Match Width to Largest (MoveHorizontal icon)
```

**Icons**:
- **Match Width**: `<MoveHorizontal />` - Horizontal arrows
- **Match Height**: `<MoveVertical />` - Vertical arrows

**Tooltips**:
- "Match Width to Largest"
- "Match Height to Largest"

**Button State**:
- **Enabled**: When 2+ paths selected
- **Disabled**: When 0-1 paths selected, or in Edit mode

### Keyboard Shortcuts

Match operations do not currently have keyboard shortcuts. They must be triggered from the Arrange Panel.

---

## Technical Implementation

### Store Methods

#### Match Width (Elements)

```typescript
matchWidthToLargest: () => {
  performMatchSize(set, get, 'width');
}
```

**Store Location**: `src/store/slices/features/arrangeSlice.ts`

#### Match Height (Elements)

```typescript
matchHeightToLargest: () => {
  performMatchSize(set, get, 'height');
}
```

#### Match Width (Subpaths)

```typescript
matchWidthToLargestSubpaths: () => {
  const state = get() as CanvasStore;
  const selectedSubpaths = state.selectedSubpaths ?? [];
  matchSubpathSizeToLargest(state, selectedSubpaths, 'width');
}
```

**Store Location**: `src/plugins/subpath/slice.ts`

#### Match Height (Subpaths)

```typescript
matchHeightToLargestSubpaths: () => {
  const state = get() as CanvasStore;
  const selectedSubpaths = state.selectedSubpaths ?? [];
  matchSubpathSizeToLargest(state, selectedSubpaths, 'height');
}
```

### Core Algorithm

The `matchSizeToLargest` helper function implements the matching logic:

```typescript
const matchSizeToLargest = (
  elements: CanvasElement[],
  selectedIds: string[],
  zoom: number,
  dimension: 'width' | 'height'
): CanvasElement[] => {
  const selectedElements = elements.filter(el => 
    selectedIds.includes(el.id)
  );
  
  if (selectedElements.length < 2) return elements;

  // Collect bounds for all selected elements
  const elementBounds = collectSelectedElementBounds(
    elements, 
    selectedIds, 
    zoom
  );

  if (elementBounds.length < 2) return elements;

  // Find the largest dimension
  const largestSize = Math.max(...elementBounds.map(item => 
    dimension === 'width' ? item.width : item.height
  ));

  // Scale each element to match
  return elements.map(el => {
    const boundItem = elementBounds.find(item => 
      item.element.id === el.id
    );
    
    if (!boundItem) return el;

    const currentSize = dimension === 'width' 
      ? boundItem.width 
      : boundItem.height;
      
    if (currentSize === 0) return el; // Avoid division by zero

    const scaleFactor = largestSize / currentSize;
    
    // Skip if already largest (within tolerance)
    if (Math.abs(scaleFactor - 1) < 0.0001) return el;

    if (el.type === 'path') {
      const pathData = el.data as PathData;
      const bounds = boundItem.bounds;
      
      // Calculate center point for scaling
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;

      // Scale only on specified dimension
      const scaleX = dimension === 'width' ? scaleFactor : 1;
      const scaleY = dimension === 'height' ? scaleFactor : 1;
      
      const newPathData = scalePathData(
        pathData, 
        scaleX, 
        scaleY, 
        centerX, 
        centerY
      );

      return { ...el, data: newPathData };
    }

    return el;
  });
};
```

### Bounds Collection

Match operations rely on accurate bounds calculation:

```typescript
const collectSelectedElementBounds = (
  elements: CanvasElement[],
  selectedIds: string[],
  zoom: number
) => {
  return elements
    .filter(el => selectedIds.includes(el.id))
    .map(el => {
      const bounds = getElementBounds(el, zoom);
      return {
        element: el,
        bounds,
        width: bounds.maxX - bounds.minX,
        height: bounds.maxY - bounds.maxY
      };
    })
    .filter(item => item.width > 0 && item.height > 0);
};
```

### Path Scaling

The `scalePathData` utility handles transformation of path commands:

```typescript
const scalePathData = (
  pathData: PathData,
  scaleX: number,
  scaleY: number,
  centerX: number,
  centerY: number
): PathData => {
  return {
    ...pathData,
    commands: pathData.commands.map(cmd => {
      // Transform all point coordinates relative to center
      // Apply scale factors independently to X and Y
      return transformCommandPoints(cmd, scaleX, scaleY, centerX, centerY);
    })
  };
};
```

---

## Integration

### Hook: useArrangeHandlers

The `useArrangeHandlers` hook provides context-aware handlers:

```typescript
export const useArrangeHandlers = () => {
  const store = useCanvasStore.getState();
  const activePlugin = useCanvasStore(state => state.activePlugin);

  const handlers = useMemo(() => {
    const suffix = activePlugin === 'subpath' ? 'Subpaths' : '';
    
    return {
      matchWidthToLargest: store[`matchWidthToLargest${suffix}`],
      matchHeightToLargest: store[`matchHeightToLargest${suffix}`],
      // ... other handlers
    };
  }, [activePlugin, store]);

  return handlers;
};
```

**Mode Mapping**:

| Mode | Match Width Handler | Match Height Handler |
|------|---------------------|----------------------|
| Select | `matchWidthToLargest()` | `matchHeightToLargest()` |
| Subpath | `matchWidthToLargestSubpaths()` | `matchHeightToLargestSubpaths()` |
| Edit | *(disabled)* | *(disabled)* |

### ArrangePanel Component

```typescript
const ArrangePanelComponent: React.FC = () => {
  const currentHandlers = useArrangeHandlers();
  const selectedCount = useCanvasStore(state => 
    state.selectedIds.length
  );
  const activePlugin = useCanvasStore(state => 
    state.activePlugin
  );
  
  const canAlign = selectedCount >= 2;

  const sizeMatchButtons = [
    { 
      handler: currentHandlers.matchWidthToLargest,
      icon: <MoveHorizontal size={12} />,
      title: "Match Width to Largest",
      disabled: !canAlign
    },
    { 
      handler: currentHandlers.matchHeightToLargest,
      icon: <MoveVertical size={12} />,
      title: "Match Height to Largest",
      disabled: !canAlign
    }
  ];

  // Match buttons hidden in edit mode
  if (activePlugin === 'edit') {
    return /* layout without match buttons */;
  }

  return (
    <Box>
      {/* Row 2: Align + Match Height */}
      {renderButtonRow([...alignmentButtons, sizeMatchButtons[1]])}
      
      {/* Row 1: Distribute + Order + Match Width */}
      {renderButtonRow([
        ...distributionButtons, 
        ...orderButtons, 
        sizeMatchButtons[0]
      ])}
    </Box>
  );
};
```

---

## Use Cases

### Design System Consistency

**Scenario**: Standardizing button widths across a UI mockup

```
Before:
[Login]  [Sign Up]  [Reset Password]

After Match Width:
[    Login    ]  [   Sign Up   ]  [Reset Password]
```

**Steps**:
1. Select all button paths
2. Click Match Width
3. All buttons resize to match the widest ("Reset Password")

### Icon Grid Alignment

**Scenario**: Creating uniform icon sizes

```
Before:
📱  💻  ⌚  🖥️
Various sizes

After Match Width + Match Height:
📱  💻  ⌚  🖥️
All 64x64px
```

**Steps**:
1. Select all icon paths
2. Click Match Width
3. Click Match Height
4. All icons become square with same dimensions

### Layout Placeholders

**Scenario**: Creating consistent card layouts

```
Before:
┌─────────┐  ┌───────────────┐  ┌────────┐
│ Card A  │  │    Card B     │  │ Card C │
└─────────┘  └───────────────┘  └────────┘

After Match Width:
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│    Card A     │  │    Card B     │  │    Card C     │
└───────────────┘  └───────────────┘  └───────────────┘
```

---

## Limitations

### Edit Mode Restriction

**Why disabled**: Individual path commands (M, L, C, etc.) cannot be scaled independently without affecting the entire path structure. Match operations work at the element level, not command level.

**Workaround**: Exit Edit mode, apply Match operation to the entire path, then re-enter Edit mode if needed.

### Non-Path Elements

**Current support**: Only path elements (`type: 'path'`)

**Future consideration**: Groups, text elements, and other types are not yet supported

### Zero-Dimension Elements

**Behavior**: Elements with width or height of 0 are skipped to avoid division by zero errors

**Example**: A perfectly vertical line (width = 0) cannot be matched in width

### Aspect Ratio Changes

**Important**: Match operations do **not** preserve aspect ratio. Matching width alone will stretch/compress elements vertically if they have different heights.

**Solution**: Apply both Match Width and Match Height sequentially if uniform sizing is desired:
1. Match Width → All elements same width, varying heights
2. Match Height → All elements become rectangles with same dimensions

---

## Performance Considerations

### Complexity

- **Time**: O(n) where n = number of selected elements
- **Operations per element**:
  - Bounds calculation: O(m) for m commands in path
  - Path scaling: O(m) for m commands in path
  - Total: O(n × m)

### Optimization Strategies

1. **Single-pass bounds collection**: All bounds calculated in one iteration
2. **Memoized scale factors**: Calculated once per element
3. **Tolerance check**: Skip scaling if difference < 0.0001
4. **Selective updates**: Only selected elements processed

### Large Selections

For selections with many elements (>100):
- Operation typically completes in < 50ms
- No visual lag or blocking
- History entry created for undo/redo

---

## Debugging

### Common Issues

**Issue**: Match operation doesn't work

**Checks**:
1. Are 2+ paths selected? (Check `selectedIds.length`)
2. Is Edit mode active? (Match disabled in Edit)
3. Do elements have valid bounds? (Check for zero dimensions)

**Issue**: Elements scale unexpectedly

**Checks**:
1. Verify bounds calculation: Use dev tools to inspect `collectSelectedElementBounds`
2. Check scale factors: Log `scaleFactor` for each element
3. Verify center point: Ensure center calculation is correct

**Issue**: Some elements not affected

**Checks**:
1. Filter by element type: Only `type === 'path'` supported
2. Check bounds validity: Elements with invalid bounds are skipped
3. Review selection: Verify all intended elements are selected

---

## Testing

### Unit Tests

```typescript
describe('Match Operations', () => {
  test('matchWidthToLargest scales elements to widest', () => {
    const elements = [
      createPath({ width: 50, height: 100 }),
      createPath({ width: 100, height: 80 }),
      createPath({ width: 30, height: 120 })
    ];
    
    const result = matchSizeToLargest(elements, getAllIds(elements), 1, 'width');
    
    result.forEach(el => {
      const bounds = getElementBounds(el, 1);
      expect(bounds.maxX - bounds.minX).toBeCloseTo(100, 2);
    });
  });

  test('matchHeightToLargest preserves width', () => {
    const elements = [
      createPath({ width: 50, height: 80 }),
      createPath({ width: 100, height: 120 })
    ];
    
    const originalWidths = elements.map(el => 
      getElementBounds(el, 1).maxX - getElementBounds(el, 1).minX
    );
    
    const result = matchSizeToLargest(elements, getAllIds(elements), 1, 'height');
    
    result.forEach((el, i) => {
      const bounds = getElementBounds(el, 1);
      expect(bounds.maxX - bounds.minX).toBeCloseTo(originalWidths[i], 2);
    });
  });

  test('skips elements already at largest size', () => {
    const elements = [
      createPath({ width: 100, height: 100 }),
      createPath({ width: 100, height: 100 })
    ];
    
    const result = matchSizeToLargest(elements, getAllIds(elements), 1, 'width');
    
    expect(result).toEqual(elements); // No changes
  });
});
```

### Integration Tests

```typescript
test('ArrangePanel match buttons work correctly', async () => {
  const { user } = setup();
  
  // Create and select multiple paths with different widths
  await createPath({ width: 50 });
  await createPath({ width: 100 });
  await createPath({ width: 75 });
  await user.keyboard('{Control>}a{/Control}'); // Select all
  
  // Click Match Width button
  const matchWidthBtn = screen.getByTitle('Match Width to Largest');
  await user.click(matchWidthBtn);
  
  // Verify all paths now have width of 100
  const paths = getAllPaths();
  paths.forEach(path => {
    const bounds = getElementBounds(path, 1);
    expect(bounds.maxX - bounds.minX).toBeCloseTo(100, 1);
  });
});
```

---

## Related

- **[Alignment](./alignment.md)** - Align elements to each other
- **[Distribution](./distribution.md)** - Distribute elements with even spacing
- **[Ordering](./ordering.md)** - Change Z-index stacking order
- **[Selection System](./selection.md)** - Element selection mechanisms
- **[Transformation Plugin](../plugins/catalog/transformation.md)** - Manual scaling with handles
- **[Arrange Panel](../app-structure/sidebar.md#arrange-panel)** - UI for arrange operations
- **[useArrangeHandlers Hook](../utilities/hooks.md#usearrangehandlers)** - Context-aware operation handlers

---

## Code References

- **Store Slice**: `src/store/slices/features/arrangeSlice.ts`
- **Subpath Implementation**: `src/plugins/subpath/slice.ts`
- **UI Component**: `src/sidebar/panels/ArrangePanel.tsx`
- **Hook**: `src/hooks/useArrangeHandlers.ts`
- **Utilities**: `src/utils/pathParserUtils.ts` (scalePathData)
- **Types**: `src/types/elements.ts`
