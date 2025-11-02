---
id: diagrams
title: Architecture Diagrams
sidebar_label: Diagrams
---

# Architecture Diagrams

This page provides comprehensive Mermaid diagrams visualizing TTPE's architecture, data flows, and subsystem interactions.

## System Context Diagram

```mermaid
graph TB
    subgraph "External Actors"
        User[👤 Designer/Artist]
        Browser[🌐 Web Browser]
    end
    
    subgraph "TTPE Application"
        App[TTPE Editor]
    end
    
    subgraph "External Systems"
        LocalStorage[(Local Storage)]
        WASM[WASM Modules<br/>potrace, opentype]
        Clipboard[System Clipboard]
    end
    
    User -->|Interacts| App
    App -->|Runs in| Browser
    App <-->|Persist/Load| LocalStorage
    App -->|Text-to-Curves| WASM
    App <-->|Copy/Paste| Clipboard
    
    style App fill:#007bff,color:#fff
    style User fill:#28a745,color:#fff
```

## Container Diagram

```mermaid
graph TB
    subgraph "Presentation Layer"
        Canvas[Canvas Component<br/>SVG Rendering]
        Sidebar[Sidebar<br/>Tool Panels]
        Toolbar[Action Bars<br/>Global Actions]
        Overlays[Overlays<br/>Selection, Guides]
    end
    
    subgraph "Core Systems"
        PluginMgr[Plugin Manager<br/>Registry & Lifecycle]
        EventBus[Event Bus<br/>Pub/Sub]
        Store[Zustand Store<br/>State Management]
        Controller[Canvas Controller<br/>Pan, Zoom, Transform]
    end
    
    subgraph "Plugin Ecosystem"
        Select[Select Plugin]
        Pencil[Pencil Plugin]
        Text[Text Plugin]
        Shape[Shape Plugin]
        Transform[Transform Plugin]
        Edit[Edit Plugin]
        Subpath[Subpath Plugin]
        Curves[Curves Plugin]
        Grid[Grid Plugin]
        Minimap[Minimap Plugin]
        More[...]
    end
    
    subgraph "Canvas Services"
        Zoom[Zoom Service]
        SmoothBrush[Smooth Brush Service]
        AddPoint[Add Point Service]
    end
    
    Canvas --> EventBus
    EventBus --> PluginMgr
    PluginMgr --> Store
    
    Select --> Store
    Pencil --> Store
    Text --> Store
    Shape --> Store
    Transform --> Store
    Edit --> Store
    Subpath --> Store
    Curves --> Store
    Grid --> Store
    
    PluginMgr -.registers.-> Select
    PluginMgr -.registers.-> Pencil
    PluginMgr -.registers.-> Text
    PluginMgr -.registers.-> Shape
    PluginMgr -.registers.-> Transform
    PluginMgr -.registers.-> Edit
    PluginMgr -.registers.-> Subpath
    PluginMgr -.registers.-> Curves
    PluginMgr -.registers.-> Grid
    PluginMgr -.registers.-> Minimap
    PluginMgr -.registers.-> More
    
    PluginMgr --> Zoom
    PluginMgr --> SmoothBrush
    PluginMgr --> AddPoint
    
    Sidebar -.queries.-> PluginMgr
    Overlays -.queries.-> PluginMgr
    
    Controller --> Store
    Store --> Canvas
    Store --> Sidebar
    Store --> Overlays
    
    style PluginMgr fill:#007bff,color:#fff
    style EventBus fill:#17a2b8,color:#fff
    style Store fill:#28a745,color:#fff
```

## Component Interaction Diagram

```mermaid
graph LR
    subgraph "UI Components"
        App[App.tsx]
        Canvas[Canvas.tsx]
        Sidebar[Sidebar.tsx]
    end
    
    subgraph "State Management"
        Store[useCanvasStore]
        BaseSlice[Base Slice]
        ViewportSlice[Viewport Slice]
        SelectionSlice[Selection Slice]
        PluginSlices[Plugin Slices]
    end
    
    subgraph "Plugin System"
        PM[PluginManager]
        Registry[Plugin Registry]
        APIs[Plugin APIs Map]
    end
    
    App --> Canvas
    App --> Sidebar
    Canvas --> Store
    Sidebar --> Store
    
    Store --> BaseSlice
    Store --> ViewportSlice
    Store --> SelectionSlice
    Store --> PluginSlices
    
    PM --> Registry
    PM --> APIs
    
    Canvas -.emits events.-> PM
    Sidebar -.queries panels.-> PM
    
    PluginSlices -.registered by.-> PM
    
    style Store fill:#28a745,color:#fff
    style PM fill:#007bff,color:#fff
```

## Plugin Registration Sequence

```mermaid
sequenceDiagram
    participant Main as main.tsx
    participant PM as PluginManager
    participant Store as Zustand Store
    participant EB as Event Bus
    participant SR as Shortcut Registry
    participant Plugin as Plugin Definition
    
    Main->>PM: pluginManager.register(plugin)
    PM->>PM: Validate plugin ID unique
    PM->>PM: Store in registry Map
    
    alt Has slices?
        PM->>Store: registerPluginSlices(pluginId, slices)
        Store->>Store: Execute slice factories
        Store->>Store: Merge state into store
        Store-->>PM: Slices registered
    end
    
    alt Has createApi?
        PM->>PM: api = plugin.createApi(context)
        PM->>PM: pluginApis.set(pluginId, api)
    end
    
    alt Has keyboardShortcuts?
        PM->>SR: canvasShortcutRegistry.register(shortcuts)
        SR-->>PM: Unsubscribe function
        PM->>PM: Store unsubscribe in shortcutSubscriptions
    end
    
    alt Has handler?
        PM->>EB: eventBus.subscribe('pointerdown', handler)
        EB-->>PM: Unsubscribe function
        PM->>PM: Store in interactionSubscriptions
    end
    
    alt Has canvasLayers?
        PM->>PM: setCanvasLayers(pluginId, layers)
    end
    
    PM-->>Main: Plugin registered
```

## Event Bus Data Flow

```mermaid
sequenceDiagram
    participant User
    participant Canvas
    participant EB as Event Bus
    participant PM as PluginManager
    participant Plugin as Active Plugin
    participant Store as Zustand Store
    participant UI as React UI
    
    User->>Canvas: Pointer down on canvas
    Canvas->>Canvas: Calculate SVG point from clientX/Y
    Canvas->>EB: emit('pointerdown', payload)
    
    Note over EB: payload = {<br/>event, point, target,<br/>activePlugin, helpers, state<br/>}
    
    EB->>PM: Notify subscribed plugins
    PM->>PM: Filter by activePlugin match
    PM->>Plugin: Execute handler(event, point, target, context)
    
    Note over Plugin: context = {<br/>store, api, helpers<br/>}
    
    Plugin->>Store: set({ newState })
    Store->>Store: Update internal state
    Store->>UI: Trigger subscribed components
    UI->>Canvas: Re-render with new state
    Canvas->>User: Visual feedback
```

## Plugin Handler Execution Flow

```mermaid
flowchart TD
    Start([User Interaction]) --> Emit[Canvas emits event]
    Emit --> EB{Event Bus}
    EB --> CheckSub{Has subscribers?}
    CheckSub -->|No| End([End])
    CheckSub -->|Yes| Notify[Notify all subscribers]
    
    Notify --> PM[Plugin Manager receives event]
    PM --> CheckActive{Active plugin<br/>matches?}
    CheckActive -->|No| End
    CheckActive -->|Yes| GetPlugin[Get plugin from registry]
    
    GetPlugin --> HasHandler{Has handler?}
    HasHandler -->|No| End
    HasHandler -->|Yes| BuildContext[Build context with<br/>store, api, helpers]
    
    BuildContext --> Execute[Execute plugin.handler]
    Execute --> UpdateStore[Plugin updates store]
    UpdateStore --> Render[UI re-renders]
    Render --> End
    
    style Start fill:#28a745,color:#fff
    style End fill:#dc3545,color:#fff
    style Execute fill:#007bff,color:#fff
```

## Canvas Service Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Registered: registerCanvasService(service)
    Registered --> Activated: activateCanvasService(serviceId, context)
    
    Activated --> Running: service.create(context)
    Running --> Updated: updateCanvasServiceState(serviceId, state)
    Updated --> Running
    
    Running --> Deactivated: deactivateCanvasService(serviceId)
    Deactivated --> Unregistered: unregisterCanvasService(serviceId)
    Unregistered --> [*]
    
    Running --> Disposed: instance.dispose()
    Disposed --> Deactivated
    
    note right of Registered
        Service definition stored
        Not yet active
    end note
    
    note right of Running
        Service instance alive
        Listening to events
        Can be updated
    end note
```

## Plugin Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> Unregistered
    Unregistered --> Registered: pluginManager.register(plugin)
    
    state Registered {
        [*] --> SlicesApplied: Has slices
        [*] --> APIInitialized: Has createApi
        [*] --> ShortcutsBound: Has shortcuts
        [*] --> HandlerBound: Has handler
        [*] --> LayersRegistered: Has canvasLayers
    }
    
    Registered --> Active: Plugin becomes active tool
    Active --> Inactive: Different tool selected
    Inactive --> Active: Plugin re-selected
    
    Active --> Unregistered: pluginManager.unregister(pluginId)
    Inactive --> Unregistered: pluginManager.unregister(pluginId)
    Unregistered --> [*]
    
    note right of Active
        Handler receives events
        Panels visible in sidebar
        Overlays rendered
    end note
```

## Store Slice Composition

```mermaid
graph TB
    subgraph "Zustand Store"
        Root[CanvasStore Root]
    end
    
    subgraph "Core Slices"
        Base[Base Slice<br/>elements, activePlugin]
        Viewport[Viewport Slice<br/>pan, zoom]
        Selection[Selection Slice<br/>selectedIds, helpers]
    end
    
    subgraph "Plugin Slices (Dynamic)"
        PencilSlice[Pencil Slice<br/>strokeColor, points]
        TextSlice[Text Slice<br/>font, size, style]
        ShapeSlice[Shape Slice<br/>shapeType, preview]
        TransformSlice[Transform Slice<br/>handles, rulers]
        EditSlice[Edit Slice<br/>selectedPoints, smoothBrush]
        SubpathSlice[Subpath Slice<br/>selectedSubpaths]
        MoreSlices[...]
    end
    
    Root --> Base
    Root --> Viewport
    Root --> Selection
    
    Root -.registers dynamically.-> PencilSlice
    Root -.registers dynamically.-> TextSlice
    Root -.registers dynamically.-> ShapeSlice
    Root -.registers dynamically.-> TransformSlice
    Root -.registers dynamically.-> EditSlice
    Root -.registers dynamically.-> SubpathSlice
    Root -.registers dynamically.-> MoreSlices
    
    style Root fill:#28a745,color:#fff
    style Base fill:#17a2b8,color:#fff
    style Viewport fill:#17a2b8,color:#fff
    style Selection fill:#17a2b8,color:#fff
```

## Request Processing Flow

```mermaid
flowchart TD
    Start([User Action]) --> EventType{Event Type}
    
    EventType -->|Pointer| PointerPath[Pointer Event Path]
    EventType -->|Keyboard| KeyboardPath[Keyboard Event Path]
    EventType -->|Wheel| WheelPath[Wheel Event Path]
    
    PointerPath --> EmitPointer[Emit to Event Bus]
    KeyboardPath --> EmitKeyboard[Emit keyboard event]
    WheelPath --> EmitWheel[Emit wheel event]
    
    EmitPointer --> Filter{Filter by<br/>active plugin}
    EmitKeyboard --> ShortcutReg[Shortcut Registry]
    EmitWheel --> ZoomService[Zoom Service]
    
    Filter -->|Match| ExecuteHandler[Execute plugin handler]
    Filter -->|No match| End([End])
    
    ExecuteHandler --> CheckHelpers{Use helpers?}
    CheckHelpers -->|beginSelectionRectangle| SelectRect[Start selection rectangle]
    CheckHelpers -->|startShapeCreation| ShapePreview[Start shape preview]
    CheckHelpers -->|Direct store update| StoreUpdate[Update Zustand store]
    
    SelectRect --> StoreUpdate
    ShapePreview --> StoreUpdate
    
    StoreUpdate --> Persist[Debounced persist]
    StoreUpdate --> UndoSnapshot[Cooldown undo snapshot]
    StoreUpdate --> Render[React re-render]
    
    ShortcutReg --> MatchShortcut{Shortcut<br/>matches?}
    MatchShortcut -->|Yes| ExecuteShortcut[Execute shortcut handler]
    MatchShortcut -->|No| End
    ExecuteShortcut --> StoreUpdate
    
    ZoomService --> UpdateViewport[Update viewport slice]
    UpdateViewport --> Render
    
    Render --> End
    
    style Start fill:#28a745,color:#fff
    style End fill:#dc3545,color:#fff
    style StoreUpdate fill:#007bff,color:#fff
```

## Undo/Redo Flow

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant Store
    participant Zundo as Zundo Middleware
    participant History as History Stack
    
    User->>UI: Perform action (e.g., move element)
    UI->>Store: set({ elements: newElements })
    Store->>Zundo: State changed
    
    Zundo->>Zundo: Check cooldown (100ms)
    alt Cooldown expired
        Zundo->>History: Push snapshot to past[]
        Zundo->>History: Clear future[]
    else Within cooldown
        Zundo->>Zundo: Skip snapshot
    end
    
    User->>UI: Press Ctrl+Z (Undo)
    UI->>Zundo: temporal.undo()
    Zundo->>History: Pop from past[]
    Zundo->>History: Push current to future[]
    Zundo->>Store: Restore previous state
    Store->>UI: Re-render with old state
    
    User->>UI: Press Ctrl+Shift+Z (Redo)
    UI->>Zundo: temporal.redo()
    Zundo->>History: Pop from future[]
    Zundo->>History: Push current to past[]
    Zundo->>Store: Restore next state
    Store->>UI: Re-render with restored state
```

## Persistence Flow

```mermaid
flowchart TD
    Start([State Update]) --> Check{Persistence<br/>enabled?}
    Check -->|No| End([End])
    Check -->|Yes| Serialize[Serialize state]
    
    Serialize --> Partialize[Apply partialize filter]
    Partialize --> JSON[JSON.stringify]
    JSON --> LocalStorage[Write to localStorage]
    
    LocalStorage --> Success{Success?}
    Success -->|Yes| End
    Success -->|No| Error[Log error]
    Error --> End
    
    Start2([App Load]) --> CheckLS{localStorage<br/>has data?}
    CheckLS -->|No| Defaults[Use default state]
    CheckLS -->|Yes| Read[Read from localStorage]
    
    Read --> Parse[JSON.parse]
    Parse --> Validate{Valid structure?}
    Validate -->|Yes| Migrate[Run migrations]
    Validate -->|No| Defaults
    
    Migrate --> Restore[Restore to store]
    Defaults --> Restore
    Restore --> End2([App Ready])
    
    style Start fill:#28a745,color:#fff
    style Start2 fill:#28a745,color:#fff
    style End fill:#dc3545,color:#fff
    style End2 fill:#dc3545,color:#fff
```

## Canvas Layer Rendering

```mermaid
graph TB
    subgraph "Canvas SVG"
        SVGRoot[<svg> Root Element]
    end
    
    subgraph "Background Layers"
        Grid[Grid Plugin Layer]
        Guides[Guidelines Plugin Layer]
    end
    
    subgraph "Midground Layers (Elements)"
        Elements[Main Elements Group<br/>paths, groups, text]
        SelectionOverlay[Selection Plugin Layer<br/>bounding boxes, handles]
        SubpathOverlay[Subpath Plugin Layer<br/>subpath highlights]
    end
    
    subgraph "Foreground Layers"
        EditOverlay[Edit Plugin Layer<br/>control points, handles]
        ShapePreview[Shape Plugin Layer<br/>preview during creation]
        TransformHandles[Transform Plugin Layer<br/>resize handles]
        CurvesOverlay[Curves Plugin Layer<br/>lattice visualization]
    end
    
    SVGRoot --> Grid
    SVGRoot --> Guides
    Grid --> Elements
    Guides --> Elements
    
    Elements --> SelectionOverlay
    Elements --> SubpathOverlay
    SelectionOverlay --> EditOverlay
    SubpathOverlay --> EditOverlay
    
    EditOverlay --> ShapePreview
    EditOverlay --> TransformHandles
    EditOverlay --> CurvesOverlay
    
    style SVGRoot fill:#007bff,color:#fff
    style Elements fill:#28a745,color:#fff
```

## Plugin API Exposure Pattern

```mermaid
sequenceDiagram
    participant PluginA as Plugin A
    participant PM as Plugin Manager
    participant PluginB as Plugin B (consumer)
    
    Note over PluginA: Define createApi
    PluginA->>PM: register({ createApi: factory })
    PM->>PM: Execute factory(context)
    PM->>PM: Store API in pluginApis Map
    
    Note over PluginB: Wants to call Plugin A's API
    PluginB->>PM: getPluginApi('pluginA')
    PM->>PM: Lookup in pluginApis Map
    PM-->>PluginB: Return API object
    
    PluginB->>PluginA: api.someMethod(args)
    PluginA->>PluginA: Execute method logic
    PluginA-->>PluginB: Return result
    
    alt Alternative: Direct call via PM
        PluginB->>PM: callPluginApi('pluginA', 'someMethod', args)
        PM->>PluginA: Proxy call to API method
        PluginA-->>PM: Return result
        PM-->>PluginB: Return result
    end
```

## Cross-Plugin Communication

```mermaid
graph LR
    subgraph "Plugin A"
        A_Handler[Handler]
        A_API[Public API]
    end
    
    subgraph "Plugin Manager"
        Registry[Plugin Registry]
        APIs[API Map]
        EventBus[Event Bus]
    end
    
    subgraph "Plugin B"
        B_Handler[Handler]
        B_Consumer[API Consumer]
    end
    
    subgraph "Zustand Store"
        SharedState[Shared State]
    end
    
    A_Handler -->|Updates| SharedState
    B_Handler -->|Reads| SharedState
    
    A_API -->|Registered in| APIs
    B_Consumer -->|Calls via| APIs
    
    A_Handler -.Subscribes.-> EventBus
    B_Handler -.Emits.-> EventBus
    
    style Registry fill:#007bff,color:#fff
    style SharedState fill:#28a745,color:#fff
    style EventBus fill:#17a2b8,color:#fff
```

## Summary

These diagrams illustrate:

1. **System Context**: TTPE's external dependencies
2. **Containers**: Major architectural components
3. **Components**: Internal module structure
4. **Sequences**: Time-ordered interactions
5. **State Machines**: Plugin and service lifecycles
6. **Flows**: Data movement through the system
7. **Layers**: Canvas rendering stack
8. **Patterns**: Communication between plugins

## Next Steps

- **[Plugin System Overview](../plugins/overview)**: How to build plugins
- **[Event Bus](../event-bus/overview)**: Event payload schemas
- **[Public API](../api/create-api)**: Using the `createApi` pattern
- **[Canvas Store](../api/canvas-store)**: State management reference
