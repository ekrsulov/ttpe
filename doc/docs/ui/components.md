---
id: components
title: UI Components
sidebar_label: Components
---

# UI Components

VectorNest provides a comprehensive library of **reusable React components** built on top of **Chakra UI**, providing consistent styling, accessibility, and responsive behavior across the application. These components range from low-level primitives (buttons, inputs) to high-level composites (panels, toolbars) designed specifically for canvas editing workflows.

All components follow Chakra UI's design system, support light/dark themes automatically, and are fully accessible with keyboard navigation and ARIA attributes.

## Layout Components

### Panel

Container component for sidebar panels with optional header, collapsible content, and render counting (debug mode).

**Props:**

```typescript
interface PanelProps {
  icon?: React.ReactNode;           // Icon to display in header
  title?: string;                    // Panel title
  children: React.ReactNode;         // Panel content
  headerActions?: React.ReactNode;   // Actions in header (badges, buttons)
  defaultOpen?: boolean;             // Whether panel starts open (default: true)
  isCollapsible?: boolean;           // Can be collapsed (default: false)
  showRenderCount?: boolean;         // Show render count badge (dev only)
}
```

**Usage:**

```tsx
import { Panel } from '@/ui/Panel';
import { Settings } from 'lucide-react';

<Panel 
  icon={<Settings size={16} />}
  title="Settings"
  isCollapsible={true}
  defaultOpen={true}
>
  <div>Panel content goes here</div>
</Panel>
```

**Example:**

```tsx
// Collapsible panel with custom header actions
<Panel
  title="Transform"
  isCollapsible={true}
  headerActions={
    <Badge colorScheme="blue">Active</Badge>
  }
>
  <VStack spacing={2}>
    <SliderControl label="X" value={x} onChange={setX} min={0} max={1000} />
    <SliderControl label="Y" value={y} onChange={setY} min={0} max={1000} />
  </VStack>
</Panel>
```

---

### PanelHeader

Header component for panels, showing icon, title, actions, and collapse toggle.

**Props:**

```typescript
interface PanelHeaderProps {
  icon?: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
  isCollapsible?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
}
```

**Usage:**

```tsx
import { PanelHeader } from '@/ui/PanelHeader';

<PanelHeader
  title="Properties"
  isCollapsible={true}
  isOpen={expanded}
  onToggle={() => setExpanded(!expanded)}
/>
```

---

### SectionHeader

Section header with icon, title, and optional action button. Used for subsections within panels.

**Props:**

```typescript
interface SectionHeaderProps {
  icon?: LucideIcon;          // Lucide icon component
  title: string;              // Section title
  actionLabel?: string;       // Action button text (default: "Apply")
  onAction?: () => void;      // Action button handler
  actionTitle?: string;       // Tooltip for action button
  showAction?: boolean;       // Show action button (default: true)
}
```

**Usage:**

```tsx
import { SectionHeader } from '@/ui/SectionHeader';
import { Palette } from 'lucide-react';

<SectionHeader
  icon={Palette}
  title="Colors"
  actionLabel="Reset"
  onAction={resetColors}
  actionTitle="Reset to default colors"
/>
```

**Example:**

```tsx
// Section header with action button
<SectionHeader
  icon={Sliders}
  title="Advanced"
  actionLabel="Apply"
  onAction={applyAdvancedSettings}
/>
```

---

### FloatingToolbarShell

Container for floating toolbars (top/bottom action bars) with responsive spacing and blur background.

**Props:**

```typescript
interface FloatingToolbarShellProps {
  position: 'top' | 'bottom';
  children: React.ReactNode;
}
```

**Usage:**

```tsx
import { FloatingToolbarShell } from '@/ui/FloatingToolbarShell';

<FloatingToolbarShell position="bottom">
  <HStack spacing={2}>
    <ToolbarIconButton icon={Undo2} label="Undo" onClick={undo} />
    <ToolbarIconButton icon={Redo2} label="Redo" onClick={redo} />
  </HStack>
</FloatingToolbarShell>
```

---

## Button Components

### PanelActionButton

Compact icon button for panel actions (ungroup, delete, etc.).

**Props:**

```typescript
interface PanelActionButtonProps {
  label: string;              // Aria label and tooltip
  icon: LucideIcon;           // Lucide icon
  iconSize?: number;          // Icon size (default: 12)
  height?: string;            // Button height (default: "20px")
  onClick: () => void;        // Click handler
  isDisabled?: boolean;       // Disabled state
  variant?: 'ghost' | 'solid' | 'outline' | 'link';
  tooltipDelay?: number;      // Tooltip delay ms (default: 200)
}
```

**Usage:**

```tsx
import { PanelActionButton } from '@/ui/PanelActionButton';
import { Trash2 } from 'lucide-react';

<PanelActionButton
  label="Delete"
  icon={Trash2}
  onClick={handleDelete}
  isDisabled={selectedCount === 0}
/>
```

**Example:**

```tsx
// Group of action buttons
<HStack spacing={1}>
  <PanelActionButton
    label="Duplicate"
    icon={Copy}
    onClick={duplicate}
  />
  <PanelActionButton
    label="Delete"
    icon={Trash2}
    onClick={deleteSelected}
    isDisabled={!canDelete}
  />
</HStack>
```

---

### PanelStyledButton

Styled button for panels with consistent appearance.

**Props:**

Extends Chakra UI `ButtonProps`.

**Usage:**

```tsx
import { PanelStyledButton } from '@/ui/PanelStyledButton';

<PanelStyledButton onClick={save} size="sm">
  Save
</PanelStyledButton>
```

**Example:**

```tsx
// Full-width button
<PanelStyledButton
  onClick={applyChanges}
  size="sm"
  width="100%"
>
  Apply Changes
</PanelStyledButton>
```

---

### ToolbarIconButton

Icon button for toolbars with optional counter badge and tooltip.

**Props:**

```typescript
interface ToolbarIconButtonProps extends Omit<IconButtonProps, 'icon' | 'aria-label'> {
  icon: LucideIcon;
  iconSize?: number;          // Icon size (default: 14)
  label: string;              // Aria label
  tooltip?: string;           // Custom tooltip (defaults to label)
  counter?: number;           // Badge counter value
  counterColor?: 'gray' | 'red';
  showTooltip?: boolean;      // Show tooltip (default: true)
}
```

**Usage:**

```tsx
import { ToolbarIconButton } from '@/ui/ToolbarIconButton';
import { Undo2 } from 'lucide-react';

<ToolbarIconButton
  icon={Undo2}
  label="Undo"
  onClick={undo}
  counter={undoCount}
  isDisabled={undoCount === 0}
/>
```

**Example with counter badge:**

```tsx
<ToolbarIconButton
  icon={Trash2}
  label="Delete"
  onClick={deleteSelected}
  counter={selectedCount}
  counterColor="red"
  isDisabled={selectedCount === 0}
/>
```

---

### ToggleButton

Toggle button for on/off states.

**Props:**

```typescript
interface ToggleButtonProps {
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  onClick: () => void;
  isDisabled?: boolean;
}
```

**Usage:**

```tsx
import { ToggleButton } from '@/ui/ToggleButton';
import { Grid } from 'lucide-react';

<ToggleButton
  icon={Grid}
  label="Toggle Grid"
  isActive={showGrid}
  onClick={() => setShowGrid(!showGrid)}
/>
```

---

### SidebarUtilityButton

Utility button for sidebar actions (pin, close, etc.).

**Props:**

```typescript
interface SidebarUtilityButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  isActive?: boolean;
}
```

**Usage:**

```tsx
import { SidebarUtilityButton } from '@/ui/SidebarUtilityButton';
import { Pin } from 'lucide-react';

<SidebarUtilityButton
  icon={Pin}
  label="Pin Sidebar"
  onClick={togglePin}
  isActive={isPinned}
/>
```

---

### VirtualShiftButton

Special button for mobile virtual Shift key.

**Props:**

```typescript
interface VirtualShiftButtonProps {
  isActive: boolean;
  onClick: () => void;
}
```

**Usage:**

```tsx
import { VirtualShiftButton } from '@/ui/VirtualShiftButton';

<VirtualShiftButton
  isActive={isVirtualShiftActive}
  onClick={toggleVirtualShift}
/>
```

---

## Input Components

### NumberInput

Numeric input with increment/decrement buttons and validation.

**Props:**

```typescript
interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;              // Increment step (default: 1)
  precision?: number;         // Decimal places
  width?: string;
  label?: string;
  formatter?: (value: number) => string;
  parser?: (value: string) => number;
}
```

**Usage:**

```tsx
import { NumberInput } from '@/ui/NumberInput';

<NumberInput
  value={strokeWidth}
  onChange={setStrokeWidth}
  min={0}
  max={100}
  step={0.5}
  precision={1}
  label="Stroke Width"
/>
```

**Example with formatter:**

```tsx
<NumberInput
  value={opacity}
  onChange={setOpacity}
  min={0}
  max={1}
  step={0.01}
  precision={2}
  formatter={(val) => `${Math.round(val * 100)}%`}
  parser={(str) => parseFloat(str) / 100}
/>
```

---

### SliderControl

Slider with label and formatted value display.

**Props:**

```typescript
interface SliderControlProps {
  icon?: React.ReactNode;
  label?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  formatter?: (value: number) => string;
  title?: string;
  minWidth?: string;
  labelWidth?: string;
  valueWidth?: string;
  marginBottom?: string;
  inline?: boolean;
  gap?: string;
}
```

**Usage:**

```tsx
import { SliderControl } from '@/ui/SliderControl';

<SliderControl
  label="Opacity"
  value={opacity}
  min={0}
  max={100}
  onChange={setOpacity}
  formatter={(val) => `${val}%`}
/>
```

**Example with icon:**

```tsx
import { Droplet } from 'lucide-react';

<SliderControl
  icon={<Droplet size={14} />}
  label="Fill Opacity"
  value={fillOpacity}
  min={0}
  max={1}
  step={0.01}
  onChange={setFillOpacity}
  formatter={(val) => `${Math.round(val * 100)}%`}
/>
```

---

### PercentSliderControl

Slider specifically for percentage values (0-100%).

**Props:**

```typescript
interface PercentSliderControlProps {
  label: string;
  value: number;              // Value from 0 to 1
  onChange: (value: number) => void;
  icon?: React.ReactNode;
}
```

**Usage:**

```tsx
import { PercentSliderControl } from '@/ui/PercentSliderControl';

<PercentSliderControl
  label="Opacity"
  value={opacity}
  onChange={setOpacity}
/>
```

---

### CustomSelect

Styled select dropdown with Chakra UI integration.

**Props:**

```typescript
interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  width?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}
```

**Usage:**

```tsx
import { CustomSelect } from '@/ui/CustomSelect';

<CustomSelect
  value={selectedShape}
  onChange={setSelectedShape}
  options={[
    { value: 'circle', label: 'Circle' },
    { value: 'rectangle', label: 'Rectangle' },
    { value: 'line', label: 'Line' }
  ]}
  placeholder="Select shape"
/>
```

---

### FontSelector

Font family dropdown selector.

**Props:**

```typescript
interface FontSelectorProps {
  value: string;
  onChange: (font: string) => void;
  fonts?: string[];
}
```

**Usage:**

```tsx
import { FontSelector } from '@/ui/FontSelector';

<FontSelector
  value={fontFamily}
  onChange={setFontFamily}
  fonts={['Arial', 'Times New Roman', 'Courier New']}
/>
```

---

## Specialized Input Components

### LinecapSelector

Selector for stroke line cap styles.

**Props:**

```typescript
interface LinecapSelectorProps {
  value: 'butt' | 'round' | 'square';
  onChange: (value: 'butt' | 'round' | 'square') => void;
}
```

**Usage:**

```tsx
import { LinecapSelector } from '@/ui/LinecapSelector';

<LinecapSelector
  value={strokeLinecap}
  onChange={setStrokeLinecap}
/>
```

**Visual preview:**

```
butt:   ————————
round:  ●——————●
square: ▪️————▪️
```

---

### LinejoinSelector

Selector for stroke line join styles.

**Props:**

```typescript
interface LinejoinSelectorProps {
  value: 'miter' | 'round' | 'bevel';
  onChange: (value: 'miter' | 'round' | 'bevel') => void;
}
```

**Usage:**

```tsx
import { LinejoinSelector } from '@/ui/LinejoinSelector';

<LinejoinSelector
  value={strokeLinejoin}
  onChange={setStrokeLinejoin}
/>
```

**Visual preview:**

```
miter:  ╱\    (sharp corner)
round:  ╱ \   (rounded corner)
bevel:  ╱_\   (beveled corner)
```

---

### FillRuleSelector

Selector for SVG fill rule.

**Props:**

```typescript
interface FillRuleSelectorProps {
  value: 'nonzero' | 'evenodd';
  onChange: (value: 'nonzero' | 'evenodd') => void;
}
```

**Usage:**

```tsx
import { FillRuleSelector } from '@/ui/FillRuleSelector';

<FillRuleSelector
  value={fillRule}
  onChange={setFillRule}
/>
```

---

### DashArraySelector

Selector for stroke dash patterns with presets and custom input.

**Components:**

- `DashArrayPresets`: Preset dash patterns
- `DashArrayCustomInput`: Custom dash array input
- `DashArraySelector`: Combined preset + custom selector

**Props:**

```typescript
interface DashArraySelectorProps {
  value: string;                    // e.g., "5,5" or "none"
  onChange: (value: string) => void;
  strokeWidth: number;              // Used to scale preset previews
}
```

**Usage:**

```tsx
import { DashArraySelector } from '@/ui/DashArraySelector';

<DashArraySelector
  value={strokeDasharray}
  onChange={setStrokeDasharray}
  strokeWidth={strokeWidth}
/>
```

**Preset patterns:**

```
none:    ——————————————
5,5:     — — — — — —
10,5:    —— — —— — ——
5,10:    — —— — —— —
2,8:     · · · · · ·
```

---

## Composite Components

### PanelToggleGroup

Group of toggle buttons for mutually exclusive options.

**Props:**

```typescript
interface PanelToggleGroupProps {
  options: Array<{
    value: string;
    icon: LucideIcon;
    label: string;
  }>;
  value: string;
  onChange: (value: string) => void;
  columns?: number;           // Grid columns (default: 3)
}
```

**Usage:**

```tsx
import { PanelToggleGroup } from '@/ui/PanelToggleGroup';
import { Circle, Square, Triangle } from 'lucide-react';

<PanelToggleGroup
  options={[
    { value: 'circle', icon: Circle, label: 'Circle' },
    { value: 'rectangle', icon: Square, label: 'Rectangle' },
    { value: 'triangle', icon: Triangle, label: 'Triangle' }
  ]}
  value={selectedShape}
  onChange={setSelectedShape}
  columns={3}
/>
```

---

### JoinedButtonGroup

Visually joined button group (no gaps between buttons).

**Usage:**

```tsx
import { JoinedButtonGroup } from '@/ui/JoinedButtonGroup';

<JoinedButtonGroup>
  <Button onClick={alignLeft}>Left</Button>
  <Button onClick={alignCenter}>Center</Button>
  <Button onClick={alignRight}>Right</Button>
</JoinedButtonGroup>
```

---

### PathThumbnail

Thumbnail preview of a path element.

**Props:**

```typescript
interface PathThumbnailProps {
  pathData: PathData;
  size?: number;              // Thumbnail size (default: 40)
  zoom?: number;              // Zoom level (default: 1)
}
```

**Usage:**

```tsx
import { PathThumbnail } from '@/ui/PathThumbnail';

<PathThumbnail
  pathData={element.data}
  size={48}
  zoom={viewport.zoom}
/>
```

---

## Utility Components

### ConditionalTooltip

Tooltip that only appears if label is provided and non-empty.

**Props:**

```typescript
interface ConditionalTooltipProps {
  label: string;
  children: React.ReactElement;
  placement?: TooltipPlacement;
  openDelay?: number;
}
```

**Usage:**

```tsx
import ConditionalTooltip from '@/ui/ConditionalTooltip';

<ConditionalTooltip label="Click to delete" placement="top">
  <IconButton icon={<Trash2 />} aria-label="Delete" />
</ConditionalTooltip>
```

---

### RenderCountBadge

Debug badge showing component render count.

**Props:**

```typescript
interface RenderCountBadgeProps {
  componentName: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}
```

**Usage:**

```tsx
import { RenderCountBadge } from '@/ui/RenderCountBadge';

<RenderCountBadge componentName="MyComponent" position="top-right" />
```

---

### RenderCountBadgeWrapper

Wrapper that adds render count badge to any component (dev mode only).

**Props:**

```typescript
interface RenderCountBadgeWrapperProps {
  componentName: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  children?: React.ReactNode;
}
```

**Usage:**

```tsx
import { RenderCountBadgeWrapper } from '@/ui/RenderCountBadgeWrapper';

<RenderCountBadgeWrapper componentName="ExpensiveComponent" position="top-left">
  <MyExpensiveComponent />
</RenderCountBadgeWrapper>
```

---

### withRenderCountBadge

Higher-order component that adds render counting to any component.

**Usage:**

```tsx
import { withRenderCountBadge } from '@/ui/withRenderCountBadge';

const MyComponent = () => <div>Content</div>;

export default withRenderCountBadge(MyComponent, 'MyComponent');
```

---

## Preset Components

### PresetButton (FillAndStrokePresetButton)

Button for fill/stroke style presets.

**Props:**

```typescript
interface PresetButtonProps {
  preset: {
    fillColor: string;
    strokeColor: string;
    strokeWidth: number;
  };
  onClick: () => void;
  isActive?: boolean;
}
```

**Usage:**

```tsx
import { PresetButton } from '@/ui/FillAndStrokePresetButton';

<PresetButton
  preset={{
    fillColor: '#ff0000',
    strokeColor: '#000000',
    strokeWidth: 2
  }}
  onClick={applyPreset}
  isActive={currentPreset === 'red'}
/>
```

---

## Complete Example: Building a Custom Panel

Here's a complete example showing how to compose multiple UI components into a functional panel:

```tsx
import React, { useState } from 'react';
import { VStack, HStack, Divider } from '@chakra-ui/react';
import { Panel } from '@/ui/Panel';
import { SectionHeader } from '@/ui/SectionHeader';
import { SliderControl } from '@/ui/SliderControl';
import { NumberInput } from '@/ui/NumberInput';
import { CustomSelect } from '@/ui/CustomSelect';
import { PanelStyledButton } from '@/ui/PanelStyledButton';
import { LinecapSelector } from '@/ui/LinecapSelector';
import { DashArraySelector } from '@/ui/DashArraySelector';
import { Settings, Droplet, LineChart } from 'lucide-react';

const CustomStrokePanel: React.FC = () => {
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [strokeOpacity, setStrokeOpacity] = useState(1);
  const [strokeLinecap, setStrokeLinecap] = useState<'butt' | 'round' | 'square'>('round');
  const [strokeDasharray, setStrokeDasharray] = useState('none');

  const handleReset = () => {
    setStrokeWidth(2);
    setStrokeOpacity(1);
    setStrokeLinecap('round');
    setStrokeDasharray('none');
  };

  return (
    <Panel
      icon={<Settings size={16} />}
      title="Stroke Settings"
      isCollapsible={true}
      defaultOpen={true}
    >
      <VStack spacing={3} align="stretch">
        {/* Basic stroke properties */}
        <SectionHeader
          icon={LineChart}
          title="Basic"
          actionLabel="Reset"
          onAction={handleReset}
        />

        <NumberInput
          label="Width"
          value={strokeWidth}
          onChange={setStrokeWidth}
          min={0}
          max={50}
          step={0.5}
          precision={1}
        />

        <SliderControl
          icon={<Droplet size={14} />}
          label="Opacity"
          value={strokeOpacity}
          min={0}
          max={1}
          step={0.01}
          onChange={setStrokeOpacity}
          formatter={(val) => `${Math.round(val * 100)}%`}
        />

        <Divider />

        {/* Advanced stroke properties */}
        <SectionHeader
          icon={Settings}
          title="Advanced"
          showAction={false}
        />

        <LinecapSelector
          value={strokeLinecap}
          onChange={setStrokeLinecap}
        />

        <DashArraySelector
          value={strokeDasharray}
          onChange={setStrokeDasharray}
          strokeWidth={strokeWidth}
        />

        <PanelStyledButton
          onClick={() => console.log('Apply stroke settings')}
          size="sm"
          width="100%"
        >
          Apply to Selection
        </PanelStyledButton>
      </VStack>
    </Panel>
  );
};

export default CustomStrokePanel;
```

**This example demonstrates:**

- Panel with icon and collapsible header
- Section headers with action buttons
- Numeric input with validation
- Slider with custom formatter and icon
- Specialized selectors (linecap, dash array)
- Full-width action button
- Proper spacing with VStack/HStack
- Dividers for visual separation

---

## Accessibility

All VectorNest UI components follow accessibility best practices:

### Keyboard Navigation

- **Tab/Shift+Tab**: Navigate between focusable elements
- **Enter/Space**: Activate buttons and toggles
- **Arrow keys**: Navigate sliders and select options
- **Escape**: Close dropdowns and cancel actions

### ARIA Attributes

- `aria-label`: All icon-only buttons have descriptive labels
- `aria-labelledby`: Inputs are associated with their labels
- `aria-disabled`: Disabled state is announced to screen readers
- `aria-expanded`: Collapsible panels announce their state
- `role`: Proper semantic roles for custom components

### Screen Reader Support

- Meaningful labels for all interactive elements
- Status announcements for dynamic content
- Logical tab order and focus management
- Alternative text for visual-only information

### Color Contrast

- All text meets WCAG AA contrast requirements
- Focus indicators are clearly visible
- State changes (hover, active) have sufficient contrast

### Responsive Design

- Touch targets are at least 44×44px on mobile
- Components adapt to viewport size
- Text remains readable at different zoom levels

---

## Theming

Components automatically adapt to Chakra UI's light/dark theme using `useColorModeValue`:

```tsx
// Example of theme-aware styling
const bgColor = useColorModeValue('white', 'gray.800');
const textColor = useColorModeValue('gray.800', 'white');
const borderColor = useColorModeValue('gray.200', 'gray.600');
```

**Custom theme colors:**

- Light mode: Gray scale from `gray.50` to `gray.900`
- Dark mode: `whiteAlpha` and `blackAlpha` overlays
- Accent colors: Blue for primary actions, red for destructive actions

---

## Component Source Locations

All UI components are located in `/src/ui/`:

```
src/ui/
├── BottomActionBar.tsx           # Bottom toolbar with undo/redo/delete
├── TopActionBar.tsx              # Top toolbar with plugin actions
├── Panel.tsx                     # Panel container
├── PanelHeader.tsx               # Panel header
├── PanelActionButton.tsx         # Small icon buttons for panels
├── PanelStyledButton.tsx         # Styled buttons for panels
├── PanelToggle.tsx               # Panel expand/collapse toggle
├── PanelToggleGroup.tsx          # Toggle button group
├── SectionHeader.tsx             # Section headers
├── SidebarUtilityButton.tsx      # Sidebar utility buttons
├── ToolbarIconButton.tsx         # Toolbar icon buttons
├── ToggleButton.tsx              # Toggle buttons
├── VirtualShiftButton.tsx        # Mobile virtual Shift button
├── NumberInput.tsx               # Numeric input
├── SliderControl.tsx             # Slider with label/value
├── PercentSliderControl.tsx      # Percentage slider (0-100%)
├── CustomSelect.tsx              # Styled select dropdown
├── FontSelector.tsx              # Font family selector
├── LinecapSelector.tsx           # Stroke linecap selector
├── LinejoinSelector.tsx          # Stroke linejoin selector
├── FillRuleSelector.tsx          # Fill rule selector
├── DashArraySelector.tsx         # Dash array pattern selector
├── FloatingToolbarShell.tsx      # Floating toolbar container
├── JoinedButtonGroup.tsx         # Joined button group
├── PathThumbnail.tsx             # Path preview thumbnail
├── ConditionalTooltip.tsx        # Conditional tooltip wrapper
├── RenderCountBadge.tsx          # Render count debug badge
├── RenderCountBadgeWrapper.tsx   # Render count wrapper
├── withRenderCountBadge.tsx      # Render count HOC
└── FillAndStrokePresetButton.tsx # Style preset button
```

---

## Related Documentation

- [Chakra UI Documentation](https://chakra-ui.com/docs/getting-started) - Base component library
- [Lucide Icons](https://lucide.dev/icons/) - Icon library used throughout VectorNest
- [Plugins Overview](../plugins/overview.md) - How plugins use UI components
- [Architecture Overview](../architecture/overview.md) - Application structure
- [Canvas Store API](../api/canvas-store) - State management integration
