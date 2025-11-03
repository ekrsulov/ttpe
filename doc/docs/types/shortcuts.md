# Keyboard Shortcuts

Keyboard shortcut types define how keyboard events are handled in the canvas, including handler functions, options, and context.

## Shortcut Types

### CanvasShortcutHandler

Basic shortcut handler function:

```typescript
type CanvasShortcutHandler = (
  event: KeyboardEvent, 
  context: CanvasShortcutContext
) => void;
```

**Parameters:**

- **event**: Native KeyboardEvent from the browser
- **context**: Shortcut execution context with store and controller access

**Example:**

```typescript
const deleteHandler: CanvasShortcutHandler = (event, context) => {
  const selectedIds = context.store.getState().selectedIds;
  context.eventBus.publish('canvas:elements:delete', { 
    elementIds: selectedIds 
  });
};
```

## Shortcut Configuration

### CanvasShortcutDefinition

Full shortcut definition with options:

```typescript
interface CanvasShortcutDefinition {
  handler: CanvasShortcutHandler;
  options?: CanvasShortcutOptions;
}
```

### CanvasShortcutOptions

Options for controlling shortcut behavior:

```typescript
interface CanvasShortcutOptions {
  preventDefault?: boolean;        // Prevent default browser action
  stopPropagation?: boolean;       // Stop event bubbling
  allowWhileTyping?: boolean;      // Allow while typing in inputs
  when?: (                         // Conditional execution
    context: CanvasShortcutContext, 
    event: KeyboardEvent
  ) => boolean;
}
```

**Options Details:**

- **preventDefault**: Prevents default browser behavior (e.g., Ctrl+S saving page)
- **stopPropagation**: Stops event from bubbling to parent elements
- **allowWhileTyping**: Allows shortcut even when typing in text inputs (default: false)
- **when**: Conditional function that must return true for handler to execute

**Example:**

```typescript
const shortcut: CanvasShortcutDefinition = {
  handler: (event, context) => {
    context.controller.setActiveTool('pencil');
  },
  options: {
    preventDefault: true,
    allowWhileTyping: false,
    when: (context) => {
      // Only allow when not in edit mode
      return context.controller.mode !== 'edit';
    },
  },
};
```

## Shortcut Map

### CanvasShortcutMap

Map of key combinations to handlers:

```typescript
type CanvasShortcutMap = Record<
  string, 
  CanvasShortcutDefinition | CanvasShortcutHandler
>;
```

**Key Format:**

Keys use standard keyboard event syntax with modifiers:

- Single keys: `'a'`, `'Delete'`, `'Escape'`
- With modifiers: `'Ctrl+S'`, `'Shift+A'`, `'Alt+Delete'`
- Multiple modifiers: `'Ctrl+Shift+Z'`

**Example:**

```typescript
const shortcuts: CanvasShortcutMap = {
  // Simple handler
  'p': (event, context) => {
    context.controller.setActiveTool('pencil');
  },
  
  // With definition
  'Delete': {
    handler: (event, context) => {
      const selectedIds = context.store.getState().selectedIds;
      context.eventBus.publish('canvas:elements:delete', { 
        elementIds: selectedIds 
      });
    },
    options: {
      preventDefault: true,
    },
  },
  
  // Save shortcut
  'Ctrl+S': {
    handler: (event, context) => {
      context.eventBus.publish('file:save', {});
    },
    options: {
      preventDefault: true,
      stopPropagation: true,
    },
  },
  
  // Conditional shortcut
  'Escape': {
    handler: (event, context) => {
      context.controller.clearSelection();
    },
    options: {
      when: (context) => {
        return context.store.getState().selectedIds.length > 0;
      },
    },
  },
};
```

## Shortcut Context

### CanvasShortcutContext

Context available to shortcut handlers:

```typescript
interface CanvasShortcutContext {
  eventBus: CanvasEventBus;
  controller: CanvasControllerValue;
  store: CanvasShortcutStoreApi;
  svg?: SVGSVGElement | null;
}
```

**Properties:**

- **eventBus**: For publishing/subscribing to events
- **controller**: For changing tools, modes, and canvas state
- **store**: Read-only access to canvas store
- **svg**: Reference to SVG element (if available)

## Usage Patterns

### Simple Tool Shortcuts

```typescript
keyboardShortcuts: {
  'v': (event, context) => {
    context.controller.setActiveTool('select');
  },
  'p': (event, context) => {
    context.controller.setActiveTool('pencil');
  },
  't': (event, context) => {
    context.controller.setActiveTool('text');
  },
}
```

### Action Shortcuts

```typescript
keyboardShortcuts: {
  'Ctrl+Z': {
    handler: (event, context) => {
      context.eventBus.publish('history:undo', {});
    },
    options: { preventDefault: true },
  },
  
  'Ctrl+Shift+Z': {
    handler: (event, context) => {
      context.eventBus.publish('history:redo', {});
    },
    options: { preventDefault: true },
  },
  
  'Ctrl+D': {
    handler: (event, context) => {
      const selectedIds = context.store.getState().selectedIds;
      context.eventBus.publish('canvas:duplicate', { elementIds: selectedIds });
    },
    options: { preventDefault: true },
  },
}
```

### Conditional Shortcuts

```typescript
keyboardShortcuts: {
  'Escape': {
    handler: (event, context) => {
      const state = context.store.getState();
      
      // Clear selection if any
      if (state.selectedIds.length > 0) {
        context.controller.clearSelection();
      }
      // Exit edit mode if active
      else if (context.controller.mode === 'edit') {
        context.controller.setMode('select');
      }
      // Deactivate tool
      else {
        context.controller.setActiveTool(null);
      }
    },
    options: {
      when: (context) => {
        // Only when not typing in inputs
        return document.activeElement?.tagName !== 'INPUT';
      },
    },
  },
}
```

### State-Dependent Shortcuts

```typescript
keyboardShortcuts: {
  'Enter': {
    handler: (event, context) => {
      const state = context.store.getState();
      
      if (state.isDrawingCurve) {
        // Finish curve
        context.eventBus.publish('curve:finish', {});
      } else if (state.isEditingText) {
        // Commit text
        context.eventBus.publish('text:commit', {});
      }
    },
    options: {
      when: (context) => {
        const state = context.store.getState();
        return state.isDrawingCurve || state.isEditingText;
      },
    },
  },
}
```

### Modifier Key Combinations

```typescript
keyboardShortcuts: {
  // Single modifier
  'Shift+D': (event, context) => {
    // Duplicate in place
    context.eventBus.publish('canvas:duplicate-in-place', {});
  },
  
  // Double modifier
  'Ctrl+Alt+G': (event, context) => {
    // Ungroup
    context.eventBus.publish('canvas:ungroup', {});
  },
  
  // Triple modifier
  'Ctrl+Shift+Alt+L': (event, context) => {
    // Lock all
    context.eventBus.publish('canvas:lock-all', {});
  },
}
```

## Special Keys

### Key Names

Use standard KeyboardEvent key values:

**Letters:** `'a'`, `'b'`, `'c'`, ... (lowercase)

**Numbers:** `'0'`, `'1'`, `'2'`, ...

**Special Keys:**
- `'Enter'`, `'Escape'`, `'Space'`
- `'Tab'`, `'Backspace'`, `'Delete'`
- `'ArrowUp'`, `'ArrowDown'`, `'ArrowLeft'`, `'ArrowRight'`
- `'PageUp'`, `'PageDown'`, `'Home'`, `'End'`

**Modifiers:**
- `'Ctrl'`, `'Alt'`, `'Shift'`, `'Meta'`

### Cross-Platform Considerations

```typescript
keyboardShortcuts: {
  // Use Ctrl on Windows/Linux, Cmd on Mac
  'Ctrl+C': {
    handler: (event, context) => {
      // Automatically handles Cmd+C on Mac
      context.eventBus.publish('clipboard:copy', {});
    },
    options: { preventDefault: true },
  },
}
```

## Best Practices

1. **Prevent Defaults**: Always use `preventDefault: true` for shortcuts that override browser behavior
2. **Conditional Execution**: Use `when` to prevent shortcuts in inappropriate contexts
3. **Check Active Element**: Avoid interfering with text input by checking `document.activeElement`
4. **Document Shortcuts**: Maintain a shortcuts reference for users
5. **Consistent Patterns**: Follow standard conventions (Ctrl+Z for undo, etc.)
6. **Avoid Conflicts**: Check for conflicts with browser and OS shortcuts

## Common Shortcut Patterns

### Selection Shortcuts

```typescript
keyboardShortcuts: {
  'Ctrl+A': {
    handler: (event, context) => {
      context.eventBus.publish('canvas:select-all', {});
    },
    options: { preventDefault: true },
  },
  'Ctrl+Shift+A': {
    handler: (event, context) => {
      context.controller.clearSelection();
    },
    options: { preventDefault: true },
  },
}
```

### Transform Shortcuts

```typescript
keyboardShortcuts: {
  'Ctrl+]': {
    handler: (event, context) => {
      context.eventBus.publish('canvas:bring-forward', {});
    },
    options: { preventDefault: true },
  },
  'Ctrl+[': {
    handler: (event, context) => {
      context.eventBus.publish('canvas:send-backward', {});
    },
    options: { preventDefault: true },
  },
}
```

### View Shortcuts

```typescript
keyboardShortcuts: {
  'Ctrl+0': {
    handler: (event, context) => {
      context.controller.zoomToFit();
    },
    options: { preventDefault: true },
  },
  'Ctrl+1': {
    handler: (event, context) => {
      context.controller.setZoom(1.0);
    },
    options: { preventDefault: true },
  },
}
```

## See Also

- [Plugin Definition](./plugin-definition.md) - How shortcuts integrate with plugins
- [Plugin Context](./plugin-context.md) - Context available to shortcuts
- [Event Bus](../event-bus/overview.md) - Publishing events from shortcuts
