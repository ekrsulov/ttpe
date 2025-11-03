# Selection Types

Selection types define the data structures used to represent selected elements, commands, points, and subpaths in the canvas.

## Overview

The selection system uses three distinct types to represent different levels of granularity:

1. **Element Selection**: Selecting entire canvas elements (paths, groups)
2. **Command Selection**: Selecting specific commands/points within a path (Edit mode)
3. **Subpath Selection**: Selecting individual subpaths for manipulation

## Command Selection

### SelectedCommand

Represents a selected command/point in edit mode.

```typescript
interface SelectedCommand {
  elementId: string;    // ID of the path element
  commandIndex: number; // Index of command in subPath
  pointIndex: number;   // Index of point within command
}
```

**Purpose:**

Used in the Edit plugin to track which points/control points are selected for manipulation.

**Example:**

```typescript
// Select the second point of the first command
const selection: SelectedCommand = {
  elementId: 'path-123',
  commandIndex: 0,
  pointIndex: 1,
};
```

**Usage in Edit Mode:**

```typescript
// Multiple points can be selected
const selectedCommands: SelectedCommand[] = [
  { elementId: 'path-123', commandIndex: 0, pointIndex: 0 },
  { elementId: 'path-123', commandIndex: 1, pointIndex: 0 },
  { elementId: 'path-123', commandIndex: 2, pointIndex: 0 },
];
```

## Point Updates

### PointUpdate

Represents an update to a point position in a path.

```typescript
interface PointUpdate {
  commandIndex: number; // Index of command in subPath
  pointIndex: number;   // Index of point within command
  x: number;            // New X coordinate
  y: number;            // New Y coordinate
  isControl: boolean;   // Whether this is a control point
}
```

**Purpose:**

Used to batch point position updates during drag operations or transformations.

**Example:**

```typescript
const update: PointUpdate = {
  commandIndex: 1,
  pointIndex: 0,
  x: 150,
  y: 200,
  isControl: true,
};

// Apply update to path
applyPointUpdate(elementId, update);
```

**Batch Updates:**

```typescript
const updates: PointUpdate[] = [
  { commandIndex: 0, pointIndex: 0, x: 10, y: 10, isControl: false },
  { commandIndex: 1, pointIndex: 0, x: 30, y: 5, isControl: true },
  { commandIndex: 1, pointIndex: 1, x: 70, y: 95, isControl: true },
];

applyPointUpdates(elementId, updates);
```

## Subpath Selection

### SelectedSubpath

Represents a selected subpath within a path element.

```typescript
interface SelectedSubpath {
  elementId: string;    // ID of the path element
  subpathIndex: number; // Index of subpath in subPaths array
}
```

**Purpose:**

Used in the Subpath plugin to track which subpaths are selected for extraction, deletion, or manipulation.

**Example:**

```typescript
// Select the second subpath of a path
const selection: SelectedSubpath = {
  elementId: 'path-123',
  subpathIndex: 1,
};
```

**Multiple Subpath Selection:**

```typescript
const selectedSubpaths: SelectedSubpath[] = [
  { elementId: 'path-123', subpathIndex: 0 },
  { elementId: 'path-123', subpathIndex: 2 },
];
```

## Selection Patterns

### Element-Level Selection

Element-level selection is managed through the main store's `selectedIds` array:

```typescript
// Store state
interface CanvasStore {
  selectedIds: string[];  // IDs of selected elements
  // ... other state
}

// Selecting elements
store.setState({ selectedIds: ['path-123', 'group-456'] });
```

### Command-Level Selection

Command-level selection is used in Edit mode:

```typescript
// Edit plugin state
interface EditState {
  selectedCommands: SelectedCommand[];
}

// Select multiple points
editSlice.setState({
  selectedCommands: [
    { elementId: 'path-123', commandIndex: 0, pointIndex: 0 },
    { elementId: 'path-123', commandIndex: 1, pointIndex: 0 },
  ],
});
```

### Subpath-Level Selection

Subpath selection is used in Subpath mode:

```typescript
// Subpath plugin state
interface SubpathState {
  selectedSubpaths: SelectedSubpath[];
}

// Select subpaths
subpathSlice.setState({
  selectedSubpaths: [
    { elementId: 'path-123', subpathIndex: 0 },
  ],
});
```

## Usage Examples

### Selecting Points in Edit Mode

```typescript
function selectPointsInRange(
  elementId: string,
  startIndex: number,
  endIndex: number
): SelectedCommand[] {
  const commands: SelectedCommand[] = [];
  
  for (let i = startIndex; i <= endIndex; i++) {
    commands.push({
      elementId,
      commandIndex: i,
      pointIndex: 0,
    });
  }
  
  return commands;
}

// Usage
const selection = selectPointsInRange('path-123', 0, 5);
store.setState({ selectedCommands: selection });
```

### Moving Selected Points

```typescript
function moveSelectedPoints(
  selectedCommands: SelectedCommand[],
  deltaX: number,
  deltaY: number
): PointUpdate[] {
  return selectedCommands.map(cmd => {
    const point = getPointAt(cmd.elementId, cmd.commandIndex, cmd.pointIndex);
    return {
      commandIndex: cmd.commandIndex,
      pointIndex: cmd.pointIndex,
      x: point.x + deltaX,
      y: point.y + deltaY,
      isControl: isControlPoint(cmd.commandIndex, cmd.pointIndex),
    };
  });
}

// Usage
const updates = moveSelectedPoints(selectedCommands, 10, 20);
applyPointUpdates(elementId, updates);
```

### Extracting Selected Subpaths

```typescript
function extractSelectedSubpaths(
  element: PathElement,
  selectedSubpaths: SelectedSubpath[]
): PathData[] {
  return selectedSubpaths
    .filter(sel => sel.elementId === element.id)
    .map(sel => ({
      ...element.data,
      subPaths: [element.data.subPaths[sel.subpathIndex]],
    }));
}

// Usage
const extracted = extractSelectedSubpaths(pathElement, selectedSubpaths);
extracted.forEach(pathData => createNewPath(pathData));
```

## Type Guards

### Checking Selection Type

```typescript
function hasCommandSelection(state: any): state is { selectedCommands: SelectedCommand[] } {
  return Array.isArray(state.selectedCommands);
}

function hasSubpathSelection(state: any): state is { selectedSubpaths: SelectedSubpath[] } {
  return Array.isArray(state.selectedSubpaths);
}
```

## Selection State Management

### Clearing Selections

```typescript
// Clear element selection
store.setState({ selectedIds: [] });

// Clear command selection
store.setState({ selectedCommands: [] });

// Clear subpath selection
store.setState({ selectedSubpaths: [] });
```

### Adding to Selection

```typescript
// Add element to selection
const currentIds = store.getState().selectedIds;
store.setState({ selectedIds: [...currentIds, newId] });

// Add command to selection
const currentCommands = store.getState().selectedCommands;
store.setState({ 
  selectedCommands: [...currentCommands, newCommand] 
});
```

### Toggling Selection

```typescript
function toggleCommandSelection(
  current: SelectedCommand[],
  command: SelectedCommand
): SelectedCommand[] {
  const isSelected = current.some(
    c => c.elementId === command.elementId &&
         c.commandIndex === command.commandIndex &&
         c.pointIndex === command.pointIndex
  );
  
  if (isSelected) {
    return current.filter(
      c => !(c.elementId === command.elementId &&
             c.commandIndex === command.commandIndex &&
             c.pointIndex === command.pointIndex)
    );
  } else {
    return [...current, command];
  }
}
```

## Best Practices

1. **Immutability**: Always create new arrays when updating selections
2. **Validation**: Validate indices before accessing commands/points
3. **Consistency**: Clear lower-level selections when switching modes
4. **Performance**: Use indexed lookups for large selections

## See Also

- [Canvas Elements](./canvas-elements.md) - Element structure
- [Geometry](./geometry.md) - Point and command types
- [Edit Plugin](../plugins/catalog/edit.md) - Command selection in practice
- [Subpath Plugin](../plugins/catalog/subpath.md) - Subpath selection usage
