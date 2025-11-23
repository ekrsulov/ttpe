# Selection

This document describes the types related to element selection and editing in the TTPE application.

## SelectedCommand

Represents a selected command/point in edit mode.

```typescript
interface SelectedCommand {
  elementId: string;
  commandIndex: number;
  pointIndex: number;
}
```

## PointUpdate

Represents an update to a point in a path.

```typescript
interface PointUpdate {
  commandIndex: number;
  pointIndex: number;
  x: number;
  y: number;
  isControl: boolean;
}
```

## SelectedSubpath

Represents a selected subpath in the canvas.

```typescript
interface SelectedSubpath {
  elementId: string;
  subpathIndex: number;
}
```

## SelectionContextType

Enumeration of different selection context types.

```typescript
type SelectionContextType =
  | 'multiselection'
  | 'group'
  | 'path'
  | 'subpath'
  | 'point-anchor-m'
  | 'point-anchor-l'
  | 'point-anchor-c'
  | 'point-control';
```

## SelectionContextInfo

Provides detailed information about the current selection context.

```typescript
interface SelectionContextInfo {
  type: SelectionContextType;
  elementId?: string;
  elementIds?: string[];
  groupId?: string;
  subpathInfo?: { elementId: string; subpathIndex: number };
  pointInfo?: SelectedCommand;
}
```

## Usage Examples

### Working with Selected Commands

```typescript
const selectedCommand: SelectedCommand = {
  elementId: 'path-1',
  commandIndex: 2,
  pointIndex: 0
};

// Update a point
const pointUpdate: PointUpdate = {
  commandIndex: 2,
  pointIndex: 0,
  x: 150,
  y: 200,
  isControl: false
};
```

### Selection Context Information

```typescript
const contextInfo: SelectionContextInfo = {
  type: 'point-anchor-c',
  elementId: 'path-1',
  pointInfo: {
    elementId: 'path-1',
    commandIndex: 1,
    pointIndex: 1
  }
};
```
