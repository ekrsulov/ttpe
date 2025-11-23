# Plugins

This document describes the plugin system types that enable extensibility in the TTPE application.

## PluginDefinition

The main interface that defines a plugin's capabilities and behavior.

```typescript
interface PluginDefinition<TStore extends object = object> {
  id: string;
  metadata: {
    label: string;
    icon?: ComponentType<{ size?: number }>;
    cursor?: string;
    disablePathInteraction?: boolean;
    pathCursorMode?: 'select' | 'default' | 'pointer';
  };
  modeConfig?: {
    description: string;
    entry?: ('clearGuidelines' | 'clearSubpathSelection' | 'clearSelectedCommands')[];
    exit?: ('clearGuidelines' | 'clearSubpathSelection' | 'clearSelectedCommands')[];
    transitions?: Record<string, { description: string }>;
    toggleTo?: string;
  };
  behaviorFlags?: (store: TStore) => PluginBehaviorFlags;
  subscribedEvents?: ('pointerdown' | 'pointermove' | 'pointerup')[];
  handler?: (
    event: PointerEvent,
    point: Point,
    target: Element,
    context: PluginHandlerContext<TStore>
  ) => void;
  onElementDoubleClick?: (
    elementId: string,
    event: MouseEvent<Element>,
    context: PluginHandlerContext<TStore>
  ) => void;
  onSubpathDoubleClick?: (
    elementId: string,
    subpathIndex: number,
    event: MouseEvent<Element>,
    context: PluginHandlerContext<TStore>
  ) => void;
  onCanvasDoubleClick?: (
    event: MouseEvent<Element>,
    context: PluginHandlerContext<TStore>
  ) => void;
  keyboardShortcuts?: CanvasShortcutMap;
  overlays?: PluginUIContribution[];
  canvasLayers?: CanvasLayerContribution[];
  panels?: PluginUIContribution[];
  sidebarPanels?: PanelConfig[];
  actions?: PluginActionContribution[];
  relatedPluginPanels?: PluginPanelContribution[];
  slices?: PluginSliceFactory<TStore>[];
  createApi?: PluginApiFactory<TStore>;
  hooks?: PluginHookContribution[];
  expandablePanel?: ComponentType;
  toolDefinition?: {
    order: number;
    visibility?: 'always-shown' | 'dynamic';
  };
  init?: (context: PluginHandlerContext<TStore>) => (() => void) | void;
  registerHelpers?: (context: PluginHandlerContext<TStore>) => Record<string, any>;
  contextMenuActions?: PluginContextMenuActionContribution[];
}
```

## PluginBehaviorFlags

Controls how plugins interact with each other.

```typescript
interface PluginBehaviorFlags {
  preventsSelection?: boolean;
  preventsSubpathInteraction?: boolean;
}
```

## CanvasShortcutMap

Maps keyboard shortcuts to their handlers.

```typescript
type CanvasShortcutMap = Record<string, CanvasShortcutDefinition | CanvasShortcutHandler>;
```

## CanvasShortcutDefinition

Defines a keyboard shortcut with its handler and options.

```typescript
interface CanvasShortcutDefinition {
  handler: CanvasShortcutHandler;
  options?: CanvasShortcutOptions;
}
```

## PluginUIContribution

Contributes UI components to the canvas interface.

```typescript
interface PluginUIContribution<TProps = Record<string, unknown>> {
  id: string;
  component: ComponentType<TProps>;
  placement?: 'tool' | 'global';
}
```

## CanvasLayerContribution

Contributes rendering layers to the canvas.

```typescript
interface CanvasLayerContribution {
  id: string;
  placement?: CanvasLayerPlacement;
  render: (context: CanvasLayerContext) => ReactNode;
}
```

## PluginSliceFactory

Factory function for creating Zustand store slices.

```typescript
type PluginSliceFactory<TStore extends object = object> = (
  set: StoreApi<TStore>['setState'],
  get: StoreApi<TStore>['getState'],
  api: StoreApi<TStore>
) => {
  state: Partial<TStore>;
  cleanup?: (
    set: StoreApi<TStore>['setState'],
    get: StoreApi<TStore>['getState'],
    api: StoreApi<TStore>
  ) => void;
};
```

## PluginApiFactory

Factory function for creating plugin APIs.

```typescript
type PluginApiFactory<TStore extends object> = (
  context: PluginApiContext<TStore>
) => Record<string, (...args: never[]) => unknown>;
```

## PluginHookContribution

Contributes React hooks to the plugin system.

```typescript
interface PluginHookContribution {
  id: string;
  hook: (context: PluginHooksContext) => void;
  global?: boolean;
}
```

## PluginContextMenuActionContribution

Contributes context menu actions.

```typescript
interface PluginContextMenuActionContribution {
  id: string;
  action: (context: SelectionContextInfo) => FloatingContextMenuAction | null;
}
```

## Usage Examples

### Creating a Basic Plugin

```typescript
const myPlugin: PluginDefinition = {
  id: 'my-tool',
  metadata: {
    label: 'My Tool',
    icon: MyIcon,
    cursor: 'crosshair'
  },
  handler: (event, point, target, context) => {
    // Handle pointer events
    console.log('Pointer event at:', point);
  },
  keyboardShortcuts: {
    'Escape': () => {
      // Handle escape key
    }
  }
};
```

### Contributing Canvas Layers

```typescript
const layerContribution: CanvasLayerContribution = {
  id: 'my-layer',
  placement: 'foreground',
  render: (context) => (
    <g>
      {/* Custom SVG elements */}
    </g>
  )
};
```

### Creating Plugin State Slices

```typescript
const mySliceFactory: PluginSliceFactory<MyStore> = (set, get, api) => ({
  state: {
    myValue: 0,
    setMyValue: (value: number) => set({ myValue: value })
  },
  cleanup: () => {
    // Cleanup logic
  }
});
```