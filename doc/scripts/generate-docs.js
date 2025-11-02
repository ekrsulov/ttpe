#!/usr/bin/env node

/**
 * Documentation Generator Script
 * Generates comprehensive documentation files for TTPE
 */

const fs = require('fs');
const path = require('path');

const DOC_ROOT = path.join(__dirname, '..');
const DOCS_DIR = path.join(DOC_ROOT, 'docs');

// Create all documentation files
const files = {
  // Event Bus Documentation
  'event-bus/overview.md': `---
id: overview
title: Event Bus Overview
sidebar_label: Overview
---

# Event Bus Overview

The Canvas Event Bus is a type-safe pub/sub system that decouples plugins from direct canvas manipulation.

## Architecture

\`\`\`typescript
class CanvasEventBus {
  subscribe<K extends keyof EventMap>(
    eventType: K, 
    handler: (payload: EventMap[K]) => void
  ): () => void;
  
  emit<K extends keyof EventMap>(
    eventType: K, 
    payload: EventMap[K]
  ): void;
  
  clear(): void;
}
\`\`\`

## Event Types

- **pointerdown**: Canvas pointer press
- **pointermove**: Canvas pointer movement
- **pointerup**: Canvas pointer release
- **keyboard**: Keyboard events
- **wheel**: Scroll/zoom events

## Usage

\`\`\`typescript
// Subscribe
const unsubscribe = eventBus.subscribe('pointerdown', (payload) => {
  console.log(payload.point, payload.activePlugin);
});

// Emit
eventBus.emit('pointermove', { event, point, target, activePlugin, helpers, state });

// Cleanup
unsubscribe();
\`\`\`

See [Event Topics](./topics) for payload schemas.
`,

  'event-bus/topics.md': `---
id: topics
title: Event Topics
sidebar_label: Topics
---

# Event Topics

Complete reference for all event payloads.

## CanvasPointerEventPayload

\`\`\`typescript
interface CanvasPointerEventPayload {
  event: PointerEvent;
  point: Point;                    // SVG coordinates
  target: EventTarget | null;
  activePlugin: string | null;
  helpers: CanvasPointerEventHelpers;
  state: CanvasPointerEventState;
}
\`\`\`

## CanvasKeyboardEventPayload

\`\`\`typescript
interface CanvasKeyboardEventPayload {
  event: KeyboardEvent;
  activePlugin: string | null;
}
\`\`\`

## CanvasWheelEventPayload

\`\`\`typescript
interface CanvasWheelEventPayload {
  event: WheelEvent;
  activePlugin: string | null;
  svg?: SVGSVGElement | null;
}
\`\`\`

See [Event Patterns](./patterns) for common usage patterns.
`,

  'event-bus/patterns.md': `---
id: patterns
title: Event Patterns
sidebar_label: Patterns
---

# Event Patterns

Common patterns for working with the event bus.

## Plugin-Scoped Handlers

\`\`\`typescript
eventBus.subscribe('pointerdown', (payload) => {
  if (payload.activePlugin !== 'my-plugin') return;
  // Handle event
});
\`\`\`

## Error Handling

\`\`\`typescript
eventBus.subscribe('pointerdown', (payload) => {
  try {
    // Handle event
  } catch (error) {
    console.error('Handler error:', error);
  }
});
\`\`\`

## Cleanup

\`\`\`typescript
const unsubscribe = eventBus.subscribe('pointermove', handler);

// Later
unsubscribe();
\`\`\`
`,

  'api/create-api.md': `---
id: create-api
title: createApi Pattern
sidebar_label: createApi
---

# createApi Pattern

The \`createApi\` function allows plugins to expose public methods to other plugins.

## Basic Example

\`\`\`typescript
createApi: (context) => ({
  calculateBounds: (elementId: string): Bounds | null => {
    const state = context.store.getState();
    const element = state.elements.find(e => e.id === elementId);
    return element ? computeBounds(element) : null;
  },
}),
\`\`\`

## Accessing APIs

\`\`\`typescript
const api = pluginManager.getPluginApi<MyAPI>('my-plugin');
if (api) {
  const result = api.calculateBounds('element-1');
}
\`\`\`

## Best Practices

- Keep APIs minimal and focused
- Return immutable data
- Handle errors gracefully
- Document types thoroughly

See [Plugin Manager API](./plugin-manager) for more methods.
`,

  'api/plugin-manager.md': `---
id: plugin-manager
title: Plugin Manager API
sidebar_label: Plugin Manager
---

# Plugin Manager API

Complete reference for PluginManager methods.

## Registration

- \`register(plugin)\`: Register a plugin
- \`unregister(pluginId)\`: Remove a plugin
- \`getPlugin(pluginId)\`: Get plugin definition
- \`getAll()\`: List all plugins
- \`hasTool(name)\`: Check if plugin exists

## API Access

- \`getPluginApi<T>(pluginId)\`: Get plugin's API
- \`callPluginApi(pluginId, method, ...args)\`: Proxy API call

## Event Handling

- \`executeHandler(tool, event, point, target, helpers)\`: Execute tool handler
- \`registerInteractionHandler(pluginId, eventType, handler)\`: Subscribe to events

## Canvas Services

- \`registerCanvasService(service)\`: Register a service
- \`activateCanvasService(serviceId, context)\`: Activate service
- \`deactivateCanvasService(serviceId)\`: Deactivate service

## UI Queries

- \`getPanels(toolName)\`: Get tool's panels
- \`getOverlays(toolName)\`: Get tool's overlays
- \`getActions(placement)\`: Get contextual actions
- \`getCanvasLayers()\`: Get all canvas layers
`,

  'api/canvas-store.md': `---
id: canvas-store
title: Canvas Store API
sidebar_label: Canvas Store
---

# Canvas Store API

The Zustand store manages all application state.

## Core Slices

### Base Slice

- \`elements\`: All canvas elements
- \`activePlugin\`: Current tool
- \`selectedIds\`: Selected element IDs
- \`deleteSelectedElements()\`: Delete selection
- \`setMode(pluginId)\`: Change active tool

### Viewport Slice

- \`pan\`: Canvas offset {x, y}
- \`zoom\`: Zoom level
- \`setPan(offset)\`: Update pan
- \`setZoom(level)\`: Update zoom

### Selection Slice

- \`selectedIds\`: Array of selected IDs
- \`addToSelection(id)\`: Add to selection
- \`removeFromSelection(id)\`: Remove from selection
- \`clearSelection()\`: Clear all

## Plugin Slices

Each plugin contributes its own slice. Access via:

\`\`\`typescript
const pencilState = useCanvasStore(state => state.pencil);
\`\`\`

See individual plugin docs for slice APIs.
`,

  'features/selection.md': `---
id: selection
title: Selection System
sidebar_label: Selection
---

# Selection System

Multi-select, context-aware selection with keyboard modifiers.

## Features

- Single and multi-select
- Shift-click to add/remove
- Rectangle selection
- Keyboard navigation (arrow keys)
- Context-aware clearing

## API

\`\`\`typescript
const state = useCanvasStore.getState();
state.addToSelection('element-1');
state.toggleSelection('element-2');
state.clearSelection();
\`\`\`

See [Select Plugin](../plugins/catalog/select) for implementation details.
`,

  'features/transforms.md': `---
id: transforms
title: Transform System
sidebar_label: Transforms
---

# Transform System

Resize, rotate, and transform elements with handles.

## Features

- Bounding box with resize handles
- Proportional scaling (Shift key)
- Center scaling (Alt/Option key)
- Rotation handle
- Visual rulers and coordinates

## Usage

Select elements with the Transform tool and drag handles.

See [Transformation Plugin](../plugins/catalog/transformation) for details.
`,

  'features/ordering.md': `---
id: ordering
title: Element Ordering
sidebar_label: Ordering
---

# Element Ordering (Z-Index)

Control layer stacking of elements.

## Operations

- **Bring to Front**: Move to top of stack
- **Bring Forward**: Move up one layer
- **Send Backward**: Move down one layer
- **Send to Back**: Move to bottom of stack

## API

\`\`\`typescript
const state = useCanvasStore.getState();
state.bringToFront?.(['element-1']);
state.sendToBack?.(['element-2']);
\`\`\`
`,

  'features/alignment.md': `---
id: alignment
title: Alignment
sidebar_label: Alignment
---

# Alignment

Align selected elements to edges or centers.

## Operations

- Left, Center, Right (horizontal)
- Top, Middle, Bottom (vertical)

## Usage

Select multiple elements and choose alignment from toolbar.

See [Alignment Actions](../plugins/catalog/select) in Select plugin.
`,

  'features/distribution.md': `---
id: distribution
title: Distribution
sidebar_label: Distribution
---

# Distribution

Evenly distribute elements horizontally or vertically.

## Features

- Distribute horizontally
- Distribute vertically
- Equal spacing between elements

## Usage

Select 3+ elements and choose distribution from toolbar.
`,

  'features/groups.md': `---
id: groups
title: Groups
sidebar_label: Groups
---

# Groups

Nest elements into named groups for organization.

## Features

- Create groups from selection
- Ungroup while preserving order
- Reparent elements
- Lock/hide entire groups

## API

\`\`\`typescript
const state = useCanvasStore.getState();
state.groupSelection?.('My Group');
state.ungroupSelection?.();
\`\`\`
`,

  'features/undo-redo.md': `---
id: undo-redo
title: Undo/Redo
sidebar_label: Undo/Redo
---

# Undo/Redo

History management with Zundo middleware.

## Configuration

- History depth: 50 steps
- Cooldown: 100ms between snapshots
- Selective state: Only tracked fields saved

## Usage

- **Undo**: Ctrl/Cmd + Z
- **Redo**: Ctrl/Cmd + Shift + Z

## API

\`\`\`typescript
const { undo, redo, clear } = useCanvasStore.temporal.getState();
undo();
redo();
clear();
\`\`\`
`,

  'features/persistence.md': `---
id: persistence
title: Persistence
sidebar_label: Persistence
---

# Persistence

Automatic state persistence to localStorage.

## What's Saved

- Canvas elements
- User settings
- Plugin state (if included)

## What's Not Saved

- Viewport (pan/zoom)
- Transient UI state
- Undo history

## Manual Control

\`\`\`typescript
// Save manually
const state = useCanvasStore.getState();
localStorage.setItem('ttpe-backup', JSON.stringify(state));

// Restore manually
const backup = localStorage.getItem('ttpe-backup');
if (backup) {
  useCanvasStore.setState(JSON.parse(backup));
}
\`\`\`
`,

  'ui/components.md': `---
id: components
title: UI Components
sidebar_label: Components
---

# UI Components

Reusable React components built with Chakra UI.

## Core Components

### Panel

Container for sidebar panels with header and body.

\`\`\`tsx
<Panel title="My Settings">
  <div>Panel content</div>
</Panel>
\`\`\`

### PanelActionButton

Styled button for panel actions.

\`\`\`tsx
<PanelActionButton onClick={handleClick}>
  Click Me
</PanelActionButton>
\`\`\`

### CustomSelect

Dropdown select component.

\`\`\`tsx
<CustomSelect
  value={selected}
  onChange={setSelected}
  options={['Option 1', 'Option 2']}
/>
\`\`\`

### SliderControl

Labeled slider with value display.

\`\`\`tsx
<SliderControl
  label="Opacity"
  value={opacity}
  onChange={setOpacity}
  min={0}
  max={100}
/>
\`\`\`

### NumberInput

Numeric input with increment/decrement.

\`\`\`tsx
<NumberInput
  value={count}
  onChange={setCount}
  min={0}
  max={100}
  step={1}
/>
\`\`\`

## Accessibility

All components support:
- Keyboard navigation
- ARIA labels
- Screen reader compatibility

See component source code for full prop types.
`,

  'ui/theming.md': `---
id: theming
title: Theming
sidebar_label: Theming
---

# Theming

TTPE uses Chakra UI with custom theme tokens.

## Color Tokens

### Light Mode

\`\`\`json
{
  "colors": {
    "brand": {
      "500": "#007bff"
    },
    "gray": {
      "50": "#f8f9fa",
      "100": "#f5f5f5",
      "200": "#e9ecef",
      "500": "#adb5bd",
      "800": "#343a40"
    }
  },
  "semanticTokens": {
    "surface.canvas": "gray.50",
    "surface.panel": "white",
    "text.primary": "gray.800",
    "text.muted": "gray.600"
  }
}
\`\`\`

### Dark Mode

\`\`\`json
{
  "semanticTokens": {
    "surface.canvas": "gray.900",
    "surface.panel": "gray.800",
    "text.primary": "gray.100",
    "text.muted": "gray.400"
  }
}
\`\`\`

## Typography

- **Font Family**: System fonts (-apple-system, BlinkMacSystemFont, Segoe UI)
- **Font Sizes**: sm (14px), md (16px), lg (18px)
- **Line Heights**: normal (1.5), tight (1.25)

## Spacing

- Base unit: 4px
- Scale: 0, 1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64

## Border Radius

- \`sm\`: 2px
- \`md\`: 4px
- \`lg\`: 8px
- \`full\`: 9999px

## Usage

\`\`\`tsx
import { useColorMode } from '@chakra-ui/react';

const { colorMode, toggleColorMode } = useColorMode();
\`\`\`

See \`src/theme/\` for complete theme configuration.
`,

  'ui/accessibility.md': `---
id: accessibility
title: Accessibility
sidebar_label: Accessibility
---

# Accessibility

TTPE follows WCAG 2.1 AA guidelines.

## Keyboard Navigation

- **Tab**: Navigate between controls
- **Enter/Space**: Activate buttons
- **Escape**: Close modals, cancel actions
- **Arrow Keys**: Navigate lists, adjust values

## Screen Reader Support

- All interactive elements have ARIA labels
- Landmarks for major sections
- Live regions for status updates

## Color Contrast

- Text contrast ratio: 4.5:1 minimum
- Interactive elements: 3:1 minimum

## Focus Indicators

- Visible focus rings on all interactive elements
- Skip links for keyboard users

## Testing

Use tools like:
- axe DevTools
- NVDA/JAWS screen readers
- Keyboard-only navigation
`,

  'ops/operations.md': `---
id: operations
title: Operations
sidebar_label: Operations
---

# Operations

Build, test, and deployment workflows.

## Build

\`\`\`bash
npm run build
\`\`\`

Output: \`dist/\` directory with optimized bundles.

## Development

\`\`\`bash
npm run dev
\`\`\`

Runs Vite dev server on port 5173.

## Testing

\`\`\`bash
npm run test:ui     # Playwright UI mode
npm run test        # Run all tests
\`\`\`

## Type Checking

\`\`\`bash
npm run type-check
\`\`\`

## Linting

\`\`\`bash
npm run lint
\`\`\`

## Deployment

1. Build: \`npm run build\`
2. Preview: \`npm run preview\`
3. Deploy \`dist/\` to hosting (Netlify, Vercel, etc.)

## CI/CD

Configure GitHub Actions or similar for:
- Automated testing on PR
- Type checking
- Build verification
- Deployment on merge to main
`,

  'ops/testing.md': `---
id: testing
title: Testing
sidebar_label: Testing
---

# Testing

TTPE uses Playwright for end-to-end testing.

## Test Structure

Tests are in \`tests/\`:
- \`basic.spec.ts\`: Core functionality
- \`align.spec.ts\`: Alignment features
- \`boolean_ops.spec.ts\`: Boolean operations
- ...more feature-specific tests

## Running Tests

\`\`\`bash
npm run test:ui         # Interactive UI mode
npx playwright test     # Headless mode
npx playwright test --headed  # Headed mode
\`\`\`

## Writing Tests

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('should do something', async ({ page }) => {
  await page.goto('http://localhost:5173');
  // Test assertions
});
\`\`\`

## Visual Regression

Playwright supports screenshot comparison:

\`\`\`typescript
await expect(page).toHaveScreenshot('feature.png');
\`\`\`

## Test Helpers

Exposed via \`window.testHelpers\` in non-production builds.

See \`src/testing/testHelpers.ts\` for available utilities.
`,

  'contributing/style-guide.md': `---
id: style-guide
title: Documentation Style Guide
sidebar_label: Style Guide
---

# Documentation Style Guide

Standards for writing documentation.

## Principles

1. **DRY (Don't Repeat Yourself)**: Link instead of duplicating
2. **Precision**: Accurate, tested code examples
3. **Completeness**: No "TBD" placeholders
4. **Actionable**: Copy-paste examples that work

## Formatting

### Headings

- Use sentence case: "Plugin system" not "Plugin System"
- Maximum 3 heading levels in a single document
- Start with H1 (\`#\`), then H2 (\`##\`), etc.

### Code Blocks

Always specify language:

\`\`\`typescript
const example = 'with language';
\`\`\`

### Links

Use relative links:
- \`[Plugin System](./plugins/overview)\`
- \`[Architecture](../architecture/overview)\`

### Lists

- Use \`-\` for unordered lists
- Use \`1.\` for ordered lists
- Indent sub-lists with 2 spaces

## Code Examples

### TypeScript

- Use proper types, no \`any\` unless necessary
- Include imports when relevant
- Show realistic examples, not "foo" and "bar"

### Comments

Only add comments for non-obvious logic:

\`\`\`typescript
// ✅ Good
const threshold = 10; // Minimum distance in pixels

// ❌ Unnecessary
const threshold = 10; // Set threshold to 10
\`\`\`

## Terminology

Consistent terms:
- **Plugin** (not tool, module, extension)
- **Slice** (not reducer, store piece)
- **Event Bus** (not message bus, pub/sub)
- **Canvas Store** (not state, global store)

## Mermaid Diagrams

Use for:
- Architecture diagrams
- Sequence flows
- State machines

Keep diagrams simple and focused on one concept.
`,

  'contributing/code-standards.md': `---
id: code-standards
title: Code Standards
sidebar_label: Code Standards
---

# Code Standards

Coding conventions for TTPE.

## TypeScript

- Use strict mode
- No implicit \`any\`
- Prefer interfaces for public APIs
- Use types for unions and intersections

## React

- Functional components only
- Use hooks (no class components)
- Memo expensive computations
- Use \`useCallback\` for stable references

## File Organization

\`\`\`
plugin/
├── index.ts          # Plugin definition
├── slice.ts          # Zustand slice
├── Panel.tsx         # UI components
└── Overlay.tsx
\`\`\`

## Naming

- **Files**: PascalCase for components, camelCase for utilities
- **Variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Types**: PascalCase

## Formatting

Use ESLint and Prettier (if configured):

\`\`\`bash
npm run lint
\`\`\`

## Testing

- Write E2E tests for user-facing features
- Use descriptive test names
- Test happy path and edge cases

## Git Commits

Follow Conventional Commits:

\`\`\`
feat: add new plugin
fix: resolve selection bug
docs: update plugin guide
\`\`\`
`,

  'faq.md': `---
id: faq
title: Frequently Asked Questions
sidebar_label: FAQ
---

# Frequently Asked Questions

## General

### What is TTPE?

TTPE (The TypeScript Path Editor) is a web-based vector graphics editor built with React, TypeScript, and a plugin architecture.

### Is it production-ready?

TTPE is under active development (v0.0.0). APIs may change before 1.0.

### Can I use it offline?

Yes, once loaded. State is persisted to localStorage.

## Plugin Development

### How do I create a plugin?

See [Plugin System Overview](./plugins/overview) for a complete guide.

### Can plugins access other plugins' APIs?

Yes, via \`pluginManager.getPluginApi()\`. See [createApi Pattern](./api/create-api).

### Do plugins have access to the full store?

Yes, via \`context.store.getState()\`. Use responsibly.

## Architecture

### Why Zustand instead of Redux?

Simpler API, less boilerplate, better TypeScript support.

### Can I add a backend?

TTPE is client-only, but you can add API calls in plugin handlers.

### How do I extend the canvas?

Use \`canvasLayers\` in plugin definition. See [Plugin Overview](./plugins/overview).

## Troubleshooting

See [Troubleshooting](./troubleshooting) page for common issues.
`,

  'troubleshooting.md': `---
id: troubleshooting
title: Troubleshooting
sidebar_label: Troubleshooting
---

# Troubleshooting

Common issues and solutions.

## Plugin Not Registering

**Symptom**: Plugin doesn't appear in tools

**Solution**:
1. Check plugin ID is unique
2. Ensure \`CORE_PLUGINS\` includes your plugin
3. Verify \`pluginManager.register()\` is called
4. Check console for errors

## State Not Updating

**Symptom**: UI doesn't reflect state changes

**Solution**:
1. Use \`set()\` from slice factory, not direct mutation
2. Ensure component subscribes to correct state slice
3. Check \`useCanvasStore\` selector is correct

## Keyboard Shortcuts Not Working

**Symptom**: Shortcuts don't fire

**Solution**:
1. Check plugin is active
2. Verify shortcut not conflicting with browser
3. Check \`keyboardShortcuts\` defined correctly
4. Ensure canvas has focus

## Handler Not Firing

**Symptom**: Plugin handler doesn't execute on click

**Solution**:
1. Check plugin is active (\`activePlugin === 'my-plugin'\`)
2. Verify event bus is initialized
3. Check handler is registered in plugin definition
4. Look for errors in handler function

## Performance Issues

**Symptom**: Canvas is laggy with many elements

**Solution**:
1. Use \`useMemo\` and \`useCallback\` in renders
2. Debounce expensive operations
3. Check for memory leaks (event listeners not removed)
4. Profile with React DevTools

## TypeScript Errors

**Symptom**: Type errors in plugin code

**Solution**:
1. Run \`npm run type-check\`
2. Ensure types are imported correctly
3. Check \`PluginDefinition<CanvasStore>\` is used
4. Verify slice types match store types

## Need More Help?

- Check [FAQ](./faq)
- Search [GitHub Issues](https://github.com/ekrsulov/ttpe/issues)
- Ask in [GitHub Discussions](https://github.com/ekrsulov/ttpe/discussions)
`,

  'changelog.md': `---
id: changelog
title: Changelog
sidebar_label: Changelog
---

# Changelog

All notable changes to TTPE will be documented here.

## [Unreleased]

### Added
- Comprehensive documentation site with Docusaurus
- Plugin system with 13+ core plugins
- Event bus for decoupled communication
- Zustand store with slice architecture
- Undo/redo with Zundo
- Auto-persist to localStorage
- E2E testing with Playwright

### Changed
- Migrated to React 19
- Updated to TypeScript 5.8
- Improved performance with memoization

### Fixed
- Various selection edge cases
- Zoom behavior on mobile
- Keyboard shortcut conflicts

## [0.0.0] - Initial Version

**Assumption**: This is the first documented version.

### Added
- Initial release with core vector editing features
- Select, pencil, text, shape, transform tools
- Grid and guidelines
- Boolean operations
- Minimap

---

**Note**: Version format follows [Semantic Versioning](https://semver.org/).
`,
};

// Write all files
Object.entries(files).forEach(([relativePath, content]) => {
  const fullPath = path.join(DOCS_DIR, relativePath);
  const dir = path.dirname(fullPath);
  
  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Write file
  fs.writeFileSync(fullPath, content, 'utf-8');
  console.log(`✅ Created ${relativePath}`);
});

console.log('\\n🎉 All documentation files created successfully!');
