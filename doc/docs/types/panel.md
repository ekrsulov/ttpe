# Panel

This document describes the types related to sidebar panels and their configuration in the TTPE application.

## PanelConditionContext

Context information used to determine when panels should be shown.

```typescript
interface PanelConditionContext {
  activePlugin: string | null;
  showFilePanel: boolean;
  showSettingsPanel: boolean;
  isInSpecialPanelMode: boolean;
  canPerformOpticalAlignment: boolean;
}
```

## PanelComponentProps

Props passed to panel components.

```typescript
interface PanelComponentProps {
  activePlugin?: string | null;
  selectedCommands?: SelectedCommand[];
  selectedSubpaths?: Array<{ elementId: string; subpathIndex: number }>;
}
```

## PanelConfig

Configuration for a sidebar panel.

```typescript
interface PanelConfig {
  key: string;
  condition: (ctx: PanelConditionContext) => boolean;
  component: LazyExoticComponent<ComponentType<any>> | ComponentType<any>;
  getProps?: (allProps: PanelComponentProps) => any;
}
```

## Usage Examples

### Creating a Panel Configuration

```typescript
const myPanelConfig: PanelConfig = {
  key: 'my-panel',
  condition: (ctx) => ctx.activePlugin === 'my-tool',
  component: lazy(() => import('./MyPanelComponent')),
  getProps: (allProps) => ({
    selectedCommands: allProps.selectedCommands,
    activePlugin: allProps.activePlugin
  })
};
```

### Panel Condition Logic

```typescript
const condition = (ctx: PanelConditionContext): boolean => {
  // Show panel when a specific tool is active and not in special mode
  return ctx.activePlugin === 'edit' && !ctx.isInSpecialPanelMode;
};
```