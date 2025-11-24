---
id: lasso
title: Lasso Plugin
sidebar_label: Lasso
---

# Lasso Plugin

**Purpose**: Free-form selection tool for precise element selection

## Overview

The Lasso plugin provides an alternative selection method that allows users to draw free-form paths to select elements, offering more flexibility than traditional rectangular selection. It integrates seamlessly with the existing selection system through the SelectionStrategy architecture.

**Key Features:**
- Free-form path drawing for element selection
- Closed lasso (polygon) and open lasso (line) modes
- Visual feedback with dotted line overlay during drawing
- Automatic element detection within drawn path
- Compatible with select, edit, and subpath modes
- Toggle controls in sidebar panel
- Theme-aware visual styling matching selection rectangle
- Conditional divider display in edit mode

## How It Works

The Lasso plugin extends the core selection system by registering a custom `LassoSelectionStrategy` that implements point-in-polygon detection:

1. **Activation**: Toggle the lasso mode in the sidebar panel
2. **Mode Selection**: Choose between closed lasso (polygon) or open lasso (line) using the panel toggle
3. **Drawing**: Click and drag to draw a free-form path
4. **Selection**: Release to select all elements whose geometry intersects with the drawn path
5. **Visual Feedback**: 
   - Closed lasso: Dotted polygon with semi-transparent fill
   - Open lasso: Dotted line without fill

The plugin uses different selection algorithms based on the lasso mode:

- **Closed Lasso**: Point-in-polygon detection using ray-casting algorithm
- **Open Lasso**: Line proximity detection that selects elements within 5 pixels of the drawn path

## Selection Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as UI/Panel
    participant Store as Canvas Store
    participant Strategy as LassoSelectionStrategy
    participant Canvas as Canvas Renderer

    Note over User,Canvas: 1. Plugin Activation
    User->>UI: Toggle lasso mode in panel
    UI->>Store: setLassoEnabled(true)
    Store->>Store: activeSelectionStrategy = 'lasso'
    Store->>Canvas: Hide rectangle selection overlay

    Note over User,Canvas: 2. Drawing Phase
    User->>Canvas: Click and drag to draw path
    Canvas->>Store: Update selectionPath with points
    Store->>Canvas: Render lasso overlay (dotted line)
    Canvas->>Canvas: Show visual feedback

    Note over User,Canvas: 3. Selection Completion
    User->>Canvas: Release mouse button
    Canvas->>Strategy: completeSelection(selectionData, 'lasso')
    Strategy->>Strategy: Process lasso path vs elements
    Strategy->>Strategy: Ray-casting algorithm (point-in-polygon)
    Strategy->>Store: Return selected element IDs
    Store->>Canvas: Update selection state
    Canvas->>Canvas: Render selection highlights

    Note over User,Canvas: 4. Reset
    Canvas->>Store: Clear selectionPath
    Store->>Canvas: Hide lasso overlay
```

## SelectionStrategy Architecture

```mermaid
stateDiagram-v2
    [*] --> RectangleStrategy: Default
    [*] --> LassoStrategy: Plugin registered

    RectangleStrategy --> RectangleStrategy: Rectangular selection
    LassoStrategy --> LassoStrategy: Free-form selection

    RectangleStrategy --> LassoStrategy: User toggles lasso
    LassoStrategy --> RectangleStrategy: User toggles rectangle

    note right of RectangleStrategy
        Uses start/end points
        Simple bounds intersection
    end note

    note right of LassoStrategy
        Uses path array
        Ray-casting algorithm
        Point-in-polygon detection
    end note

    RectangleStrategy --> [*]: Plugin cleanup
    LassoStrategy --> [*]: Plugin cleanup
```

## Plugin Integration Flow

```mermaid
sequenceDiagram
    participant App as Application
    participant PM as Plugin Manager
    participant Registry as SelectionStrategy Registry
    participant Lasso as Lasso Plugin
    participant Store as Canvas Store

    Note over App,Store: Plugin Registration
    App->>PM: Load CORE_PLUGINS
    PM->>Lasso: Call init()
    Lasso->>Registry: register(LassoSelectionStrategy)
    Registry->>Registry: Store strategy by ID

    Note over App,Store: Runtime Selection
    App->>Store: User enables lasso mode
    Store->>Store: activeSelectionStrategy = 'lasso'
    Store->>PM: Get active strategy
    PM->>Registry: get('lasso')
    Registry->>PM: Return LassoSelectionStrategy

    Note over App,Store: Selection Operation
    App->>Store: completeSelection(data, 'lasso')
    Store->>PM: Get strategy for 'lasso'
    PM->>Lasso: Execute selection logic
    Lasso->>Store: Return selected elements

    Note over App,Store: Plugin Cleanup
    App->>PM: Unload plugin
    PM->>Lasso: Call dispose()
    Lasso->>Registry: unregister('lasso')
    Registry->>Registry: Remove strategy
```

## Point-in-Polygon Algorithm

```mermaid
flowchart TD
    A[Start: Element bounds check] --> B{Element bounds intersect lasso?}
    B -->|No| C[Skip element]
    B -->|Yes| D[Check element geometry]

    D --> E[Get element path/points]
    E --> F[For each point in element]

    F --> G{Ray casting test}
    G -->|Point inside lasso| H[Mark element as selected]
    G -->|Point outside lasso| I[Continue to next point]

    I --> J{More points?}
    J -->|Yes| F
    J -->|No| K[Element fully processed]

    H --> K
    C --> L[Next element]
    K --> L

    L --> M{More elements?}
    M -->|Yes| A
    M -->|No| N[Return selected elements]

    style A fill:#e1f5fe
    style N fill:#e1ffe1
```

## Configuration Options

### Enable Lasso
Master toggle in the sidebar panel to enable/disable lasso selection mode. When enabled, replaces rectangular selection with free-form path drawing and reveals the closed/open lasso toggle.

### Visual Styling
- **Stroke**: Gray tones matching selection rectangle (gray.300 in dark mode, gray.500 in light mode)
- **Fill**: Semi-transparent gray fill (10% opacity) - only for closed lasso
- **Stroke Width**: 1 pixel (zoom-adjusted)
- **Line Style**: Dotted pattern (2px dash, 2px gap, zoom-adjusted)

### Closed vs Open Lasso
- **Closed Lasso** (default): Forms a complete polygon that selects elements within the enclosed area
- **Open Lasso**: Draws as a simple line that selects elements the line path crosses or touches
- **Toggle**: Switch in panel content to change between closed and open modes

## Context Menu Actions

The lasso plugin contributes a context menu action for quick toggling of lasso mode:

### Toggle Lasso Selection
- **Available in**: Select, Edit, and Subpath modes
- **Label**: "Enable Lasso Selection" / "Disable Lasso Selection" (contextual)
- **Icon**: Lasso icon
- **Function**: Toggles the lasso selection mode on/off


## SelectionStrategy Architecture

The Lasso plugin demonstrates the extensibility of the selection system through the `SelectionStrategy` interface:

```typescript
interface SelectionStrategy {
  id: string;
  containsPoint(point: Point, selectionData: SelectionData): boolean;
  intersectsBounds(bounds: Bounds, selectionData: SelectionData): boolean;
}
```

### LassoSelectionStrategy Implementation

The plugin registers a `LassoSelectionStrategy` that:
- Uses `isPointInPolygon()` for point containment testing
- Uses `isBoundsIntersectingPolygon()` for bounds intersection
- Processes `SelectionData.path` containing the drawn lasso points

This architecture allows any plugin to contribute custom selection behaviors without modifying core selection logic.

## Usage

1. **Switch to Select/Edit/Subpath mode**
2. **Enable Lasso**: Toggle the switch in the Lasso Selector panel
3. **Draw Selection**: Click and drag to draw around desired elements
4. **Complete Selection**: Release mouse button to select elements within the path
5. **Disable Lasso**: Toggle off to return to rectangular selection

## Integration Points

- **Plugin System**: Registers via `PluginDefinition` with lifecycle management
- **Selection System**: Extends via `SelectionStrategy` registry pattern
- **State Management**: Uses dedicated slice for lasso-specific state
- **UI Components**: Integrates with `Panel` and `PanelSwitch` components
- **Canvas Layers**: Contributes overlay rendering for visual feedback

## Technical Details

### State Management
```typescript
interface LassoPluginSlice {
  lassoEnabled: boolean;
  lassoPath: Point[];
  activeSelectionStrategy?: string;
  // ... actions
}
```

### Plugin Registration
```typescript
export const lassoPlugin: PluginDefinition = {
  id: 'lasso',
  init: () => {
    selectionStrategyRegistry.register(new LassoSelectionStrategy());
    return () => selectionStrategyRegistry.unregister('lasso');
  },
  // ... other configuration
};
```

### Canvas Integration
- **Overlay**: `LassoOverlayWrapper` renders visual feedback
- **Geometry**: `lassoGeometry.ts` provides point-in-polygon utilities
- **Strategy**: `LassoSelectionStrategy` implements selection logic

## Accessibility

- Keyboard navigation support through panel switch
- Screen reader labels for toggle controls
- Visual contrast maintained across light/dark themes
- Consistent interaction patterns with other selection tools

## Performance Considerations

- Path drawing optimized with minimal point sampling
- Selection calculation uses efficient geometric algorithms
- Visual feedback updates in real-time during drawing
- Memory cleanup on plugin deactivation