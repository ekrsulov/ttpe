---
id: index
title: Welcome to TTPE Documentation
sidebar_label: Introduction
slug: /
---

# TTPE — Web Vector Editor

Welcome to the comprehensive technical documentation for **TTPE** (The TypeScript Path Editor), a modern, extensible web-based vector graphics editor built with React, TypeScript, and a sophisticated plugin architecture.

## What is TTPE?

TTPE is a full-featured SVG vector graphics editor that runs entirely in the browser. It provides:

- **Advanced Path Editing**: Precise manipulation of Bézier curves and path segments
- **Plugin Architecture**: Extensible tool system with hot-swappable plugins
- **Real-time Collaboration Ready**: Event-driven architecture supporting multi-user scenarios
- **Modern Stack**: React 19, TypeScript, Zustand state management, Chakra UI
- **Comprehensive Testing**: E2E tests with Playwright ensuring reliability

## Quick Links

### For Developers

- **[Architecture Overview](architecture/overview)** - Understand the system design and key abstractions
- **[Plugin System](plugins/overview)** - Learn how to create and register plugins
- **[Event Bus](event-bus/overview)** - Master the pub/sub event system
- **[Public API](api/create-api)** - Reference for the `createApi` plugin interface

### For Contributors

- **[Contributing Guide](contributing/style-guide)** - Documentation and code standards
- **[Operations](ops/operations)** - Build, test, and deployment workflows

### Reference

- **[Plugin Catalog](plugins/catalog/select)** - Complete reference for all built-in plugins
- **[UI Components](ui/components)** - Reusable React components
- **[Theming](ui/theming)** - Color tokens and theme customization
- **[FAQ](faq)** - Frequently asked questions
- **[Troubleshooting](troubleshooting)** - Common issues and solutions

## Key Features

### Plugin-Based Architecture

TTPE's core strength is its plugin system. Every tool—from selection and drawing to transforms and grid fills—is implemented as a plugin:

```typescript
const myPlugin: PluginDefinition = {
  id: 'my-tool',
  metadata: { label: 'My Tool', icon: MyIcon },
  handler: (event, point, target, context) => {
    // Tool interaction logic
  },
  slices: [createMyPluginSlice],
  createApi: (context) => ({
    doSomething: () => { /* public API */ }
  })
};
```

See [Plugin System Overview](plugins/overview) for details.

### Canvas Event Bus

A type-safe event bus coordinates interactions between the canvas, plugins, and UI:

```typescript
eventBus.emit('pointerdown', {
  event, point, target, activePlugin, helpers, state
});

eventBus.subscribe('pointermove', (payload) => {
  // React to pointer movements
});
```

Learn more in [Event Bus Documentation](event-bus/overview).

### Zustand Store with Slices

State is managed through a modular slice architecture. Each plugin can contribute its own slice:

```typescript
export const createMySlice: PluginSliceFactory = (set, get, api) => ({
  state: {
    myData: [],
    mySettings: { ... }
  },
  cleanup: (set, get, api) => {
    // Cleanup logic
  }
});
```

See [Canvas Store API](api/canvas-store) for the complete reference.

## Core Concepts

### 1. Plugins

Plugins are self-contained modules that extend TTPE's functionality. They can:

- Handle pointer events on the canvas
- Register keyboard shortcuts
- Contribute UI panels and overlays
- Expose public APIs to other plugins
- Manage their own state via Zustand slices

### 2. Event Bus

The event bus decouples plugins from direct canvas manipulation:

- **Type-safe**: All events have defined payload types
- **Scoped**: Handlers can filter by active plugin
- **Lifecycle-managed**: Subscriptions cleanup automatically

### 3. Canvas Services

Long-running services (like zoom, smooth brush, add-point) register with the plugin manager and interact with the canvas lifecycle independently of tools.

### 4. Layers & Rendering

Plugins can contribute canvas layers (foreground, midground, background) for custom SVG rendering without modifying core canvas code.

## Architecture Highlights

```mermaid
graph TB
    subgraph "User Interface"
        Canvas[Canvas Component]
        Sidebar[Sidebar & Panels]
        Toolbar[Action Bars]
    end
    
    subgraph "Core Systems"
        PluginMgr[Plugin Manager]
        EventBus[Event Bus]
        Store[Zustand Store]
    end
    
    subgraph "Plugins"
        Select[Select Plugin]
        Pencil[Pencil Plugin]
        Text[Text Plugin]
        Shape[Shape Plugin]
        More[... 10+ more]
    end
    
    Canvas --> EventBus
    EventBus --> PluginMgr
    PluginMgr --> Store
    PluginMgr -.registers.-> Select
    PluginMgr -.registers.-> Pencil
    PluginMgr -.registers.-> Text
    PluginMgr -.registers.-> Shape
    PluginMgr -.registers.-> More
    
    Select --> Store
    Pencil --> Store
    Text --> Store
    
    Sidebar -.displays panels from.-> PluginMgr
    Store -.updates.-> Canvas
```

See [Architecture Diagrams](architecture/diagrams) for detailed system views.

## Technology Stack

- **React 19**: UI framework with concurrent features
- **TypeScript 5.8**: Type safety and developer experience
- **Zustand 5**: Lightweight state management
- **Chakra UI 2**: Component library with theming
- **Paper.js**: Boolean operations and computational geometry
- **Playwright**: End-to-end testing
- **Vite 7**: Build tool and dev server

## Performance Considerations

TTPE is designed for performance:

- **Virtual rendering**: Only visible elements are processed
- **Debounced operations**: Undo snapshots and expensive calculations are throttled
- **Memoization**: React components use `useMemo` and `useCallback` extensively
- **Canvas services**: Heavy computations run outside the React render cycle

See [Architecture Overview](architecture/overview#performance) for optimization strategies.

## Browser Support

- **Chrome/Edge**: 90+
- **Firefox**: 88+
- **Safari**: 14.1+
- **Mobile**: iOS Safari 14.1+, Chrome Mobile 90+

## Getting Started

Ready to dive in? Choose your path:

- **Using TTPE**: See the main project README for running the application
- **Extending TTPE**: Start with [Plugin System](plugins/overview)
- **Understanding the Code**: Begin with [Architecture Overview](architecture/overview)
- **Contributing**: Read the [Style Guide](contributing/style-guide)

## Documentation Philosophy

This documentation follows these principles:

- **DRY (Don't Repeat Yourself)**: Cross-links instead of duplication
- **Precision**: Accurate, tested code examples
- **Completeness**: No "TBD" placeholders; all sections are complete
- **Actionable**: Copy-paste examples that work
- **Diagrams**: Mermaid visualizations for complex flows

## Support & Community

- **Issues**: [GitHub Issues](https://github.com/ekrsulov/ttpe/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ekrsulov/ttpe/discussions)
- **Email**: [Maintainer contact info - replace with actual]

## License

TTPE is licensed under [LICENSE TYPE - Assumption: MIT]. See the main repository for details.

---

**Ready to explore?** Start with the [Architecture Overview](architecture/overview) or jump directly to [Plugin Development](plugins/overview).
