# Vectornest

A modern, extensible web-based vector graphics editor built with React, TypeScript, and a sophisticated plugin architecture.

## Interface Overview

Vectornest is an SVG-based vector graphics editor presented in a full-screen layout: a central canvas for editing, top and bottom action bars, a collapsible/resizable sidebar, and a virtual **Shift** button for shortcuts on touch devices. The Canvas coordinates interaction layers (selection, node and subpath editing, shape preview, guides, grid) and supports keyboard shortcuts, drag selection, transforms, shape creation, and a smoothing brush.

## Architecture & Global State

The app is built with React 19, TypeScript, and Vite; it uses Zustand for state and Playwright for E2E tests. State is composed of multiple slices (base, viewport, selection, ordering, alignment, pencil, text, shapes, transforms, advanced editing, subpaths, optical alignment, curves, guides, and grid), with local persistence and undo/redo history (up to 50 steps, ~100 ms cooldown).
The base slice manages elements, the active plugin, panel visibility, the "virtual shift," and settings such as keyboard move precision and render counters.

The **Canvas Event Bus** provides a type-safe publish/subscribe system for decoupled communication between plugins and components, enabling loose coupling and extensibility without circular dependencies.

### Plugin architecture

Each interactive tool or feature slice now lives under `src/plugins/<name>/`. A plugin module groups:

* `slice.ts` – the Zustand slice factory and TypeScript types for that plugin's state.
* UI/behavior components – panels, overlays, hooks, or renderers belonging to the plugin (e.g. `src/plugins/pencil/PencilPanel.tsx`).
* `index.ts` – the plugin's `PluginDefinition`, where handlers, keyboard shortcuts, overlays, panels and slice factories are registered.

All plugin definitions are exported from `src/plugins/index.ts` as `CORE_PLUGINS` and registered during boot in `main.tsx` via `pluginManager.register`. To add a plugin:

1. Create `src/plugins/<id>/` with the slice and any UI.
2. Export a `PluginDefinition` in `index.ts`, configuring metadata, handler, keyboard shortcuts, optional `panels`/`overlays`, and the `PluginSliceFactory` array that wires the slice into the store.
3. Append the definition to `CORE_PLUGINS` so it is registered at start-up.

`PluginDefinition` supports keyboard shortcuts through `keyboardShortcuts`, overlays via `overlays` (global vs. tool placements), sidebar contributions with `panels`, contextual actions through `actions`, and slice registration with `slices`. `pluginManager` exposes helpers (`register`, `unregister`, `handleKeyboardEvent`, `getPanels`, `getOverlays`, etc.) to render and dispatch plugin contributions.

## Creation Tools

* **Pencil / Freehand**: starts or reuses paths with the current stroke attributes; filters points by a minimum distance to avoid noise and marks paths as "freehand."
* **Text to Curves**: converts text (font, size, weight, style) into SVG commands via a WASM pipeline (e.g., potrace) and applies active styles.
* **Parametric Shapes**: generates squares, rectangles, circles (Bézier), and triangles from two points, registering them as editable paths with current styles.
* **Grid Fill**: floods individual grid cells (square, isometric, triangular, hex, polar, diagonal, warped parametric, etc.) with shapes at the current fill color/opacity for rapid tessellation work.

## Selection, Transforms & Organization

* **Selection**: multi-select, context-aware clearing by mode, precision-configurable moves, and bulk property updates (color, opacity, stroke).
* **Transforms**: handles/controls, optional rulers/coordinates, and bounds for whole elements or subpaths.
* **Order (z-index)**: bring to front, bring forward, send backward, send to back—preserving relative order.
* **Align & Distribute**: computes bounding boxes (consistent with zoom and stroke) to align (left/center/right, top/middle/bottom) and distribute evenly on X/Y.
* **Guides & Grid**: smart guides (edges/centers, repeated distances, sticky mode with zoom-scaled thresholds) and a configurable grid with optional snapping.
* **Groups, Visibility & Locking**: nest selections into named groups, reparent or ungroup while preserving order, and toggle visibility/locking for entire groups or individual elements directly from the layer tree.

## Subpaths & Advanced Editing

* **Subpath Management**: single/multi selection constrained by element, deletion, precision nudging, reordering within the same path, and align/distribute across subpaths.
* **Path Editing**: select and drag points/groups; convert commands; split subpaths; align/distribute points; simplification and rounding parameters; helpers to align control points.
* **Smoothing Brush**: configurable (radius, strength, simplification, minimum distance); works on selected points or within a radius and can simplify after smoothing.
* **Global Actions**: split subpaths into independent paths and reverse direction of selected subpaths, clearing the selection when finished.

## View Control & Touch Support

The viewport slice manages zoom (with limits, re-centering around the focus point) and pan, with quick resets and coordinate rounding for numerical stability. On mobile, the **virtual Shift** enables Shift-dependent shortcuts.

**Mobile Gestures:**
* **Pinch-to-Zoom**: Use two fingers to pinch or spread for zooming in/out
* **Two-Finger Pan**: Drag with two fingers to pan the canvas viewport

**Desktop Navigation Extras:**
* **Interactive Minimap**: optional HUD overlay that previews the whole drawing, allows dragging the viewport rectangle, and supports double-click-to-focus on shapes.

## Styling & Sampling

* **Style Eyedropper**: copy stroke/fill attributes from a selected path, apply them to other elements, and deactivate automatically after use.
* **Keyboard Precision**: fine-tune arrow-key nudging via the settings panel (0–4 decimals) and toggle debug aids (render badges, log level, caller info) while optionally showing the minimap.

## File Management & Export

* **Save/Open JSON** documents (name, elements, view) with append or replace options, generating unique IDs and validating structure.
* **Export to SVG/PNG** honoring partial selection, vector styles, and optional padding (PNG via SVG rasterization).
* **SVG Import (batch)**: normalizes transforms, converts shapes and groups to editable paths (M/L/C/Z), preserves styles, and offers options such as append, create frames, boolean-union, rescale, and grid distribution.

## Boolean Ops & Pro Features

* **Booleans**: union, PaperJS-based union, subtraction, intersection, exclusion, and division—applicable to paths and also to selected subpaths.
* **Optical Alignment**: detects container/content pairs, computes the visual center (with guard margins), and applies the resulting translation; supports bulk corrections and reset.
* **Curves**: incremental mode for designing custom curves with a lattice, live preview, and point handling.

## Technology Stack

- **React 19** with TypeScript 5.8
- **Vite** for blazing-fast development and optimized builds
- **Zustand** for state management with persistence and undo/redo (Zundo)
- **Chakra UI** for accessible, composable UI components
- **Playwright** for comprehensive E2E testing
- **Paper.js** for advanced boolean operations

## In Short

Vectornest combines a powerful SVG canvas, a modular slice-based architecture with persistence and history, professional-grade creation/editing tools (including optical alignment and boolean ops), organization utilities, and a robust import/export flow—optimized for both desktop and touch.

## Getting Started

### Development

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

Create a production build:

```bash
npm run build
```

### Testing

Run E2E tests with Playwright UI:

```bash
npm run test:ui
```

### Type Checking

Verify TypeScript types:

```bash
npm run type-check
```

### Linting

Check code quality:

```bash
npm run lint
```

## Documentation

Comprehensive technical documentation is available in the `doc/` folder, built with Docusaurus. Topics include:

- **Plugin System**: Learn how to create and register plugins
- **Event Bus**: Type-safe pub/sub communication patterns
- **API Reference**: Public APIs for plugin development
- **Architecture**: System design and core principles
- **Features**: Detailed guides for all editor capabilities
- **Contributing**: Code standards and contribution guidelines

To run the documentation site locally:

```bash
cd doc
npm install
npm run start
```

Visit `http://localhost:3000` to browse the full documentation.

## Contributing

We welcome contributions! Please follow these guidelines:

- **Code Style**: Use TypeScript strict mode, functional React components, and follow the ESLint configuration
- **Commit Messages**: Follow [Conventional Commits](https://www.conventionalcommits.org/) format (e.g., `feat:`, `fix:`, `docs:`)
- **Testing**: Add E2E tests for user-facing features using Playwright
- **Documentation**: Update relevant documentation in the `doc/` folder

See `doc/docs/contributing/` for detailed code standards and style guide.

## License

This project is under active development (v0.0.0). APIs may change before 1.0.
