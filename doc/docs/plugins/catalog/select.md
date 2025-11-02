---
id: select
title: Select Plugin
sidebar_label: Select
---

# Select Plugin

**Purpose**: Selection tool for picking, moving, and manipulating elements

## Overview

Selection functionality in TTPE includes:

- Single and multi-select with Shift-click to add/remove
- Rectangle selection (drag on empty area)
- Moving selected elements
- Deleting selected elements
- Grouping and ungrouping

:::note
**Alignment, distribution, and ordering** (bring to front, send to back) are provided by the [`useArrangeHandlers`](/docs/utilities/hooks#usearrangehandlers) hook and displayed in the **ArrangePanel** in the sidebar footer when elements are selected. These features are not part of the select plugin itself.
:::

## Plugin Interaction Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as UI/Toolbar
    participant PM as PluginManager
    participant SP as Select Plugin
    participant Store as Canvas Store
    participant EB as Event Bus
    participant Canvas as Canvas Renderer
    
    Note over User,Canvas: 1. Plugin Activation
    User->>UI: Click Select Tool
    UI->>Store: setMode('select')
    Store->>PM: Plugin mode changed
    PM->>SP: activate()
    SP->>Store: Initialize select slice
    SP->>EB: Publish 'plugin:activated'
    EB->>Canvas: Update cursor style
    
    Note over User,Canvas: 2. Element Selection
    User->>Canvas: Click on element
    Canvas->>SP: handlePointerDown(event)
    SP->>Store: Check if Shift key pressed
    
    alt Shift key pressed
        SP->>Store: addToSelection(elementId)
    else Normal click
        SP->>Store: setSelectedIds([elementId])
    end
    
    Store->>Store: Update selectedIds
    Store->>EB: Publish 'selection:changed'
    EB->>Canvas: Re-render selection overlay
    EB->>UI: Update selection panel
    
    Note over User,Canvas: 3. Rectangle Selection
    User->>Canvas: Click + Drag on empty area
    Canvas->>SP: handlePointerDown + handlePointerMove
    SP->>Store: Set selectionRect bounds
    Store->>Canvas: Draw selection rectangle
    
    Canvas->>SP: handlePointerUp
    SP->>Store: selectByBounds(rect)
    Store->>Store: Calculate elements in bounds
    Store->>EB: Publish 'selection:changed'
    EB->>Canvas: Update selection overlay
    
    Note over User,Canvas: 4. Element Deletion
    User->>UI: Press Delete key
    UI->>SP: handleKeyDown('Delete')
    SP->>Store: deleteSelectedElements()
    Store->>Store: Remove from elements array
    Store->>Store: clearSelection()
    Store->>EB: Publish 'elements:deleted'
    EB->>Canvas: Re-render canvas
    
    Note over User,Canvas: 5. Plugin Deactivation
    User->>UI: Select different tool
    UI->>Store: setMode('pencil')
    Store->>PM: Plugin mode changed
    PM->>SP: deactivate()
    SP->>EB: Publish 'plugin:deactivated'
    SP->>Store: Clear selection state
    EB->>Canvas: Remove selection overlay
```

## State Management Diagram

```mermaid
graph TB
    subgraph "Select Plugin Slice"
        SS[Select State]
        SS --> SI[selectedIds: string array]
        SS --> SB[selectionBounds: Rect]
        SS --> SR[selectionRect: Rect or null]
        SS --> DM[dragMode: move/rect/null]
    end
    
    subgraph "Plugin API Methods"
        API[Public API]
        API --> AS[addToSelection]
        API --> RS[removeFromSelection]
        API --> CS[clearSelection]
        API --> SA[selectAll]
        API --> IS[invertSelection]
        API --> SBB[selectByBounds]
    end
    
    subgraph "Event Subscriptions"
        ES[Event Listeners]
        ES --> PD[pointerdown]
        ES --> PM[pointermove]
        ES --> PU[pointerup]
        ES --> KD[keydown]
    end
    
    subgraph "Event Publications"
        EP[Published Events]
        EP --> SC[selection:changed]
        EP --> SM[selection:moved]
        EP --> PA[plugin:activated]
        EP --> PDA[plugin:deactivated]
    end
    
    SS --> API
    API --> ES
    ES --> EP
    EP --> SS
```

## Handler

Handles clicks on elements and canvas for selection

## Keyboard Shortcuts

- **Delete**: Delete selected elements
- **Ctrl/Cmd+A**: Select all (reserved)

## UI Contributions

### Panels

- Selection panel with alignment and distribution controls

### Overlays

- Selection rectangles and bounding boxes

### Canvas Layers

- Selection overlays showing bounds and handles for selected elements

## Public APIs

No public APIs exposed.

:::note
Selection functionality is part of the core Canvas Store (SelectionSlice), not a plugin API. Use the store methods directly:
```typescript
const state = useCanvasStore.getState();
state.selectElement(elementId);
state.selectElements([id1, id2]);
state.clearSelection();
```
See the [Selection documentation](/docs/features/selection) for more details.
:::

## Usage Examples

```typescript
// Activate the plugin
const state = useCanvasStore.getState();
state.setMode('select');

// Access plugin state
const selectState = useCanvasStore(state => state.select);
```


## Calling Plugin APIs

```typescript
const api = pluginManager.getPluginApi('select');
api?.addToSelection();
api?.removeFromSelection();
api?.clearSelection();
```


## Implementation Details

**Location**: `src/plugins/select/`

**Files**:
- `index.ts`: Plugin definition
- `slice.ts`: Zustand slice (if applicable)
- `*Panel.tsx`: UI panels (if applicable)
- `*Overlay.tsx`: Overlays (if applicable)

## Edge Cases & Limitations

- Implementation-specific constraints
- Performance considerations for large datasets
- Browser compatibility notes (if any)

## Related

- [Plugin System Overview](../overview)
- [Event Bus](../../event-bus/overview)
- [Selection Feature](../../features/selection)

