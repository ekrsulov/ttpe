---
id: plugin-selector
title: Plugin Selector Plugin
sidebar_label: Plugin Selector
---

# Plugin Selector Plugin

**Purpose**: Dynamic plugin management and enablement control

## Overview

- Enable/disable plugins dynamically
- Search and filter available plugins
- Bulk enable/disable operations
- Critical plugin protection
- Persistent plugin state
- Real-time UI updates

## Plugin Interaction Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as Settings Panel
    participant Store as Canvas Store
    participant PS as Plugin Selector
    participant PM as Plugin Manager
    participant Canvas as Canvas UI

    Note over User,Canvas: 1. Open Plugin Manager
    User->>UI: Click "Manage Plugins" button
    UI->>Store: setPluginSelectorDialogOpen(true)
    Store->>PS: Dialog opens
    PS->>PM: getAll() - Get all registered plugins
    PM->>PS: Return plugin list
    PS->>PS: Filter critical plugins
    PS->>PS: Display plugin switches

    Note over User,Canvas: 2. Toggle Plugin
    User->>PS: Click plugin switch
    PS->>Store: setPluginEnabled(pluginId, enabled)
    Store->>Store: Update enabledPlugins array
    Store->>PM: Plugin state changed
    PM->>Canvas: Trigger UI re-render
    Canvas->>Canvas: Hide/show plugin UI elements

    Note over User,Canvas: 3. Bulk Operations
    User->>PS: Click "Enable/Disable All"
    PS->>Store: setPluginEnabled() for each plugin
    Store->>Store: Update enabledPlugins array
    Store->>PM: Multiple plugins changed
    PM->>Canvas: Trigger comprehensive UI update

    Note over User,Canvas: 4. Search/Filter
    User->>PS: Type in search box
    PS->>PS: Filter plugin list
    PS->>PS: Update displayed plugins
```

## State Management

The plugin maintains the following state:

```typescript
interface PluginSelectorSlice {
    pluginSelector: {
        enabledPlugins: string[];  // Array of enabled plugin IDs
        isDialogOpen: boolean;     // Dialog visibility state
    };
    setPluginEnabled: (pluginId: string, enabled: boolean) => void;
    setPluginSelectorDialogOpen: (isOpen: boolean) => void;
}
```

## Critical Plugins

Some plugins are marked as "critical" and cannot be disabled:

- `pluginSelector` - This plugin itself (prevents lockout)
- `select` - Basic selection functionality
- `pan` - Canvas navigation
- `file` - File operations
- `settings` - Application settings

## Initialization Process

```mermaid
flowchart TD
    A[App Startup] --> B[Plugin Manager Registers All Plugins]
    B --> C[Plugin Selector Init Function]
    C --> D{Check enabledPlugins State}
    D -->|Empty/Undefined| E[Get All Plugin IDs]
    D -->|Has Data| F[Use Existing State]
    E --> G[Set enabledPlugins = allPluginIds]
    G --> H[Store Updated]
    F --> H
    H --> I[Plugin Manager Ready]
```

## UI Components

### PluginSelectorDialog

Main modal dialog displaying:
- Search input for filtering plugins
- Enable/Disable All toggle
- Individual plugin switches
- Critical plugin indicators

### PluginSelectorAction

Settings panel button that opens the dialog.

## Integration Points

The plugin integrates with the entire application through:

1. **Plugin Manager**: Filters enabled plugins for UI rendering
2. **Canvas Store**: Maintains persistent plugin state
3. **UI Components**: Dynamic show/hide based on plugin availability
4. **Settings Panel**: Provides access to plugin management

## Usage Examples

### Enable a Plugin Programmatically

```typescript
const store = useCanvasStore();
store.setPluginEnabled('grid', true);
```

### Check if Plugin is Enabled

```typescript
const isEnabled = pluginManager.isPluginEnabled('grid');
```

### Get All Enabled Plugins

```typescript
const enabledPlugins = useCanvasStore(
  (state) => (state as any).pluginSelector.enabledPlugins
);
```

## Benefits

- **Performance**: Disable unused plugins to reduce bundle size and memory usage
- **UX**: Customize interface by hiding irrelevant tools
- **Development**: Easy testing of plugin combinations
- **Maintenance**: Clean separation of plugin functionality