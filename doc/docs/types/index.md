# TypeScript Types

This section documents all TypeScript type definitions used in the VectorNest application. These types provide strong typing for canvas elements, plugins, selection states, and other core data structures.

## Type Categories

### Core Types
- **[Canvas Elements & Geometry](./canvas-elements)**: Points, coordinates, paths, and canvas elements

### Plugin System
- **[Plugin Types](./plugins)**: Plugin definitions, contributions, and context types

### State Management
- **[Selection Types](./selection)**: Selection state types for elements, commands, and subpaths

### UI Components
- **[Panel Types](./panel)**: Panel configuration and component types

### User Interaction
- **[Interaction Types](./interaction)**: Drag operations and user interaction types

### Collaboration
- **[Collaboration Types](./collaboration)**: Multiplayer and real-time collaboration types

## Type System Philosophy

The VectorNest type system follows these principles:

1. **Type Safety**: All data structures are strongly typed to catch errors at compile time
2. **Immutability**: Types favor immutable patterns using readonly where appropriate
3. **Discrimination**: Union types use discriminant fields for type narrowing
4. **Composition**: Complex types are built from simpler, reusable primitives
5. **Documentation**: Types serve as self-documenting contracts

## Common Patterns

### Discriminated Unions

Many types use discriminated unions for type-safe handling:

```typescript
type CanvasElement = PathElement | GroupElement;

// Type narrowing works automatically
if (element.type === 'path') {
  // element is PathElement here
  console.log(element.data.strokeColor);
}
```

### Extensible Records

Plugin and handler types use flexible record types:

```typescript
type PluginHandlerHelpers = Record<string, any>;
```

### Generic Context

Context types are generic to support different store shapes:

```typescript
interface PluginApiContext<TStore extends object> {
  store: PluginStoreApi<TStore>;
}
```

## Import Conventions

Types are exported from centralized index files:

```typescript
// Import from main types index
import type { Point, CanvasElement, PathData } from '@/types';

// Import from specific type modules
import type { SelectedCommand } from '@/types/selection';
import type { PluginDefinition } from '@/types/plugins';
```

## Type Locations

All types are located in `src/types/`:

- `src/types/index.ts` - Core canvas and geometry types
- `src/types/plugins.ts` - Plugin system types
- `src/types/selection.ts` - Selection state types
