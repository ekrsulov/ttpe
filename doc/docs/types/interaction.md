# Interaction

This document describes the types related to user interactions and drag operations in the TTPE application.

## DragContext

Context information for drag operations.

```typescript
interface DragContext {
  originalPoint: Point;
  excludeElementIds?: string[];
}
```

## DragModifier

Interface for modifying drag points with priority-based ordering.

```typescript
interface DragModifier {
  id: string;
  modify: (point: Point, context: DragContext) => Point;
  priority: number;
}
```

## Usage Examples

### Creating a Drag Modifier

```typescript
const snapModifier: DragModifier = {
  id: 'grid-snap',
  priority: 100, // Apply after other modifiers
  modify: (point, context) => {
    // Snap to grid
    return {
      x: Math.round(point.x / 10) * 10,
      y: Math.round(point.y / 10) * 10
    };
  }
};
```

### Using Drag Context

```typescript
const dragContext: DragContext = {
  originalPoint: { x: 100, y: 100 },
  excludeElementIds: ['element-1', 'element-2']
};

// Apply modifiers in priority order
const modifiers: DragModifier[] = [
  { id: 'constraint', priority: 0, modify: constraintModifier },
  { id: 'snap', priority: 100, modify: snapModifier }
].sort((a, b) => a.priority - b.priority);
```