---
id: canvas-store-api
title: Canvas Store API
sidebar_label: Canvas Store
---

# Canvas Store API

The Zustand store manages all application state using a slice-based architecture. The store provides centralized state management for canvas elements, viewport, selection, and plugin-specific data.

## Core Architecture

TTPE uses Zustand for state management with the following key principles:

- **Slice-based**: Each feature area has its own slice with dedicated actions
- **Immutable updates**: All state changes create new state objects
- **Plugin integration**: Plugins can contribute their own slices to the store
- **Type-safe**: Full TypeScript support with proper type definitions

## Core Slices

### Base Slice

The base slice manages fundamental canvas operations:

```typescript
interface BaseSlice {
  // Canvas elements
  elements: CanvasElement[];
  
  // Active tool
  activePlugin: string | null;
  
  // Selection state
  selectedIds: string[];
  
  // Core actions
  deleteSelectedElements(): void;
  setMode(pluginId: string): void;
  addElement(element: CanvasElement): void;
  updateElement(id: string, updates: Partial<CanvasElement>): void;
  removeElement(id: string): void;
}
```

**Key Methods:**
- `deleteSelectedElements()`: Removes all currently selected elements
- `setMode(pluginId)`: Activates a plugin/tool by ID
- `addElement(element)`: Adds a new element to the canvas
- `updateElement(id, updates)`: Updates an existing element's properties
- `removeElement(id)`: Removes an element by ID

### Viewport Slice

Manages canvas pan, zoom, and coordinate transformations:

```typescript
interface ViewportSlice {
  // Pan offset
  pan: { x: number; y: number };
  
  // Zoom level (1.0 = 100%)
  zoom: number;
  
  // Viewport bounds
  bounds: { width: number; height: number };
  
  // Actions
  setPan(offset: { x: number; y: number }): void;
  setZoom(level: number): void;
  zoomIn(): void;
  zoomOut(): void;
  fitToContent(): void;
  centerOnSelection(): void;
}
```

**Key Methods:**
- `setPan(offset)`: Updates the canvas pan offset
- `setZoom(level)`: Sets the zoom level (clamped between min/max values)
- `zoomIn()/zoomOut()`: Incremental zoom with predefined steps
- `fitToContent()`: Adjusts zoom and pan to show all elements
- `centerOnSelection()`: Centers viewport on selected elements

### Selection Slice

Handles element selection and multi-selection operations:

```typescript
interface SelectionSlice {
  // Selected element IDs
  selectedIds: string[];
  
  // Selection bounds
  selectionBounds: Rect | null;
  
  // Actions
  addToSelection(id: string): void;
  removeFromSelection(id: string): void;
  clearSelection(): void;
  selectAll(): void;
  invertSelection(): void;
  selectByBounds(bounds: Rect): void;
}
```

**Key Methods:**
- `addToSelection(id)`: Adds an element to the current selection
- `removeFromSelection(id)`: Removes an element from selection
- `clearSelection()`: Clears all selections
- `selectAll()`: Selects all elements on canvas
- `invertSelection()`: Inverts the current selection
- `selectByBounds(bounds)`: Selects elements within a rectangular area

## Plugin Slices

Each plugin can contribute its own slice to the global store. Plugin slices are namespaced by plugin ID:

```typescript
// Access plugin state
const pencilState = useCanvasStore(state => state.pencil);
const selectState = useCanvasStore(state => state.select);

// Plugin slice example
interface PencilSlice {
  // Pencil-specific state
  brushSize: number;
  brushColor: string;
  brushOpacity: number;
  
  // Actions
  setBrushSize(size: number): void;
  setBrushColor(color: string): void;
  setBrushOpacity(opacity: number): void;
}
```

### Accessing Plugin State

```typescript
import { useCanvasStore } from '@/store/canvas';

// Get plugin state
const pencilState = useCanvasStore(state => state.pencil);
const gridState = useCanvasStore(state => state.grid);

// Subscribe to changes
const brushSize = useCanvasStore(state => state.pencil?.brushSize);
```

## State Persistence

The store supports automatic persistence to localStorage:

```typescript
interface PersistenceConfig {
  // What to persist
  include: string[];
  
  // What to exclude
  exclude: string[];
  
  // Storage key
  key: string;
}

// Configure persistence
const persistConfig = {
  include: ['elements', 'viewport'],
  exclude: ['selection'],
  key: 'ttpe-canvas-state'
};
```

## Type Definitions

```typescript
interface CanvasElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  data: Record<string, any>;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Point {
  x: number;
  y: number;
}
```

## Best Practices

### State Updates
```typescript
// ✅ Good: Immutable updates
store.setState(state => ({
  ...state,
  elements: state.elements.map(el => 
    el.id === id ? { ...el, x: newX } : el
  )
}));

// ❌ Bad: Direct mutation
store.setState(state => {
  state.elements[0].x = newX; // Don't do this
  return state;
});
```

### Plugin Integration
```typescript
// Plugins should define their slice interface
interface MyPluginSlice {
  myPluginData: any;
  setMyPluginData(data: any): void;
}

// Register with store
const useMyPluginSlice = createSlice<MyPluginSlice>((set) => ({
  myPluginData: null,
  setMyPluginData: (data) => set({ myPluginData: data })
}));
```

### Performance Considerations
- Use selector functions to prevent unnecessary re-renders
- Avoid storing large objects in state
- Use `shallow` comparison for complex objects
- Consider using `useCallback` for event handlers

## Error Handling

The store includes built-in error boundaries and recovery mechanisms:

```typescript
// Error recovery
try {
  store.getState().addElement(newElement);
} catch (error) {
  console.error('Failed to add element:', error);
  // Recovery logic
}
```

## Testing

Store slices can be tested in isolation:

```typescript
import { renderHook } from '@testing-library/react';
import { useCanvasStore } from '@/store/canvas';

test('selection slice', () => {
  const { result } = renderHook(() => useCanvasStore());
  
  act(() => {
    result.current.addToSelection('element-1');
  });
  
  expect(result.current.selectedIds).toContain('element-1');
});
```