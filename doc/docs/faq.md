---
id: faq
title: Frequently Asked Questions
sidebar_label: FAQ
---

# Frequently Asked Questions

## General

### What is VectorNest?

VectorNest (The TypeScript Path Editor) is a web-based vector graphics editor built with React, TypeScript, and a plugin architecture.

### Is it production-ready?

VectorNest is under active development (v0.0.0). APIs may change before 1.0.

### Can I use it offline?

Yes, once loaded. State is persisted to localStorage.

## Plugin Development

### How do I create a plugin?

See [Plugin System Overview](./plugins/overview) for a complete guide.

### Can plugins access other plugins' APIs?

Yes, via `pluginManager.getPluginApi()`. See [createApi Pattern](./api/create-api).

### Do plugins have access to the full store?

Yes, via `context.store.getState()`. Use responsibly.

## Architecture

### Why Zustand instead of Redux?

Simpler API, less boilerplate, better TypeScript support.

### Can I add a backend?

VectorNest is client-only, but you can add API calls in plugin handlers.

### How do I extend the canvas?

Use `canvasLayers` in plugin definition. See [Plugin Overview](./plugins/overview).

## Keyboard Shortcuts

### What keyboard shortcuts are available?

**Global Shortcuts:**
- `Escape`: Context-aware - closes panels, clears selection, exits edit mode, or switches to select tool
- `Space`: Hold to activate pan mode (hand tool)
- `Shift`: Hold while clicking to toggle element selection, or while drawing to constrain proportions
- `Delete` or `Backspace`: Delete selected elements/points/subpaths
- `Arrow Keys`: Move selected elements by 1px (hold Shift for 10px)

**Plugin-Specific Shortcuts:**
- **Curves Plugin**: `Enter` to finish curve, `Escape` to cancel, `Delete` to remove selected point
- **Pencil Plugin**: `Delete` to remove selected path elements
- **Duplicate on Drag**: Hold `Command` (Mac) or `Control` (Windows/Linux) while dragging selected elements to create duplicates

See [Selection System](./features/selection#keyboard-shortcuts) and plugin documentation for details.

### Are undo/redo keyboard shortcuts supported?

Not currently. Undo/Redo are available via buttons in the Bottom Action Bar.

### Can I customize keyboard shortcuts?

Not in the UI, but plugins can register custom shortcuts. See [Keyboard Shortcuts Types](./types/shortcuts).

## Troubleshooting

See [Troubleshooting](./troubleshooting) page for common issues.
