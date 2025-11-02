#!/usr/bin/env node

/**
 * Plugin Catalog Generator
 * Creates documentation for all built-in plugins
 */

const fs = require('fs');
const path = require('path');

const CATALOG_DIR = path.join(__dirname, '..', 'docs', 'plugins', 'catalog');

const plugins = {
  'select': {
    title: 'Select Plugin',
    purpose: 'Selection tool for picking, moving, and manipulating elements',
    handler: 'Handles clicks on elements and canvas for selection',
    shortcuts: {
      'Delete': 'Delete selected elements',
      'Ctrl/Cmd+A': 'Select all (reserved)',
    },
    panels: ['Selection panel with alignment and distribution controls'],
    overlays: ['Selection rectangles and bounding boxes'],
    layers: ['Selection overlays showing bounds and handles for selected elements'],
    apis: {
      'addToSelection': 'Add element IDs to selection',
      'removeFromSelection': 'Remove from selection',
      'clearSelection': 'Clear all selected elements',
    },
    features: [
      'Single and multi-select',
      'Shift-click to add/remove',
      'Rectangle selection',
      'Alignment (left, center, right, top, middle, bottom)',
      'Distribution (horizontal, vertical)',
      'Ordering (bring to front, send to back)',
      'Grouping and ungrouping',
    ],
  },
  'pencil': {
    title: 'Pencil Plugin',
    purpose: 'Freehand drawing tool for creating paths',
    handler: 'Captures pointer movements and creates SVG paths',
    shortcuts: {},
    panels: ['Stroke color, width, and opacity controls'],
    overlays: [],
    layers: [],
    apis: {},
    features: [
      'Freehand drawing',
      'Point filtering to reduce noise',
      'Minimum distance threshold',
      'Stroke customization (color, width, opacity)',
      'Marks paths as "freehand" for special handling',
    ],
  },
  'text': {
    title: 'Text Plugin',
    purpose: 'Convert text to vector paths using font rendering',
    handler: 'N/A (uses panel input)',
    shortcuts: {},
    panels: ['Text input, font selection, size, weight, style'],
    overlays: [],
    layers: [],
    apis: {},
    features: [
      'Text-to-curves conversion',
      'Font family, size, weight, style selection',
      'Uses WASM (potrace) for rendering',
      'Applies current stroke/fill settings',
    ],
  },
  'shape': {
    title: 'Shape Plugin',
    purpose: 'Create parametric shapes (circle, square, triangle, etc.)',
    handler: 'Two-point shape creation with preview',
    shortcuts: {},
    panels: ['Shape type selector'],
    overlays: [],
    layers: ['Preview layer showing shape during creation'],
    apis: {},
    features: [
      'Shapes: square, rectangle, circle, triangle, line, diamond, heart',
      'Two-point creation (drag to define size)',
      'Shift key for proportional shapes',
      'Preview during creation',
      'Converts to editable paths',
    ],
  },
  'transformation': {
    title: 'Transformation Plugin',
    purpose: 'Resize, rotate, and transform selected elements',
    handler: 'N/A (uses direct manipulation of handles)',
    shortcuts: {},
    panels: ['Transform options, rulers, coordinates'],
    overlays: [],
    layers: ['Transform handles and bounding box'],
    apis: {},
    features: [
      'Bounding box with resize handles',
      'Proportional scaling (Shift key)',
      'Center scaling (Alt/Option key)',
      'Rotation handle',
      'Visual rulers and coordinate display',
    ],
  },
  'edit': {
    title: 'Edit Plugin',
    purpose: 'Advanced path editing with control point manipulation',
    handler: 'Select and drag control points and handles',
    shortcuts: {
      'Delete': 'Delete selected points',
    },
    panels: ['Point editing controls, smooth brush settings, simplification'],
    overlays: [],
    layers: ['Control points, handles, and smooth brush visualization'],
    apis: {},
    features: [
      'Select and drag points',
      'Convert command types (line, curve, arc)',
      'Smooth brush for path smoothing',
      'Point simplification',
      'Align control points',
      'Delete points',
      'Split subpaths',
    ],
  },
  'subpath': {
    title: 'Subpath Plugin',
    purpose: 'Manage individual subpaths within complex paths',
    handler: 'Select subpaths within paths',
    shortcuts: {},
    panels: ['Subpath list, align/distribute controls'],
    overlays: [],
    layers: ['Subpath highlights and selection indicators'],
    apis: {},
    features: [
      'Select individual subpaths',
      'Multi-select subpaths (constrained to single element)',
      'Delete subpaths',
      'Reorder subpaths',
      'Align and distribute subpaths',
      'Split subpaths into separate paths',
      'Reverse subpath direction',
    ],
  },
  'curves': {
    title: 'Curves Plugin',
    purpose: 'Advanced curve manipulation with lattice deformation',
    handler: 'N/A (uses UI controls)',
    shortcuts: {},
    panels: ['Lattice grid controls, tension settings'],
    overlays: [],
    layers: ['Lattice visualization grid'],
    apis: {},
    features: [
      'Lattice-based curve deformation',
      'Adjustable grid resolution',
      'Tension/smoothness controls',
      'Preview lattice grid',
      'Apply deformation to selected paths',
    ],
  },
  'optical-alignment': {
    title: 'Optical Alignment Plugin',
    purpose: 'Apply optical corrections for visual alignment',
    handler: 'N/A (uses actions)',
    shortcuts: {},
    panels: [],
    overlays: [],
    layers: [],
    apis: {
      'applyOpticalAlignment': 'Apply optical alignment to selection',
    },
    features: [
      'Visual weight-based alignment',
      'Compensates for optical illusions',
      'Adjustable threshold',
      'Works with boolean operations',
    ],
  },
  'guidelines': {
    title: 'Guidelines Plugin',
    purpose: 'Smart guides for snapping elements to edges and centers',
    handler: 'N/A (passive system)',
    shortcuts: {},
    panels: ['Guide settings, snap threshold, sticky mode'],
    overlays: [],
    layers: ['Visual guide lines'],
    apis: {},
    features: [
      'Smart edge and center guides',
      'Distance repetition detection',
      'Sticky mode for automatic snapping',
      'Zoom-scaled snap threshold',
      'Visual feedback lines',
    ],
  },
  'grid': {
    title: 'Grid Plugin',
    purpose: 'Display reference grids with optional snapping',
    handler: 'N/A (visual aid)',
    shortcuts: {},
    panels: ['Grid type, size, warping parameters, snap settings'],
    overlays: [],
    layers: ['Grid visualization'],
    apis: {},
    features: [
      'Grid types: square, isometric, triangular, hexagonal, polar, diagonal, warped',
      'Customizable grid size and spacing',
      'Warp effects: sine2d, perlin2d, radial',
      'Optional snapping to grid',
      'Show/hide toggle',
    ],
  },
  'grid-fill': {
    title: 'Grid Fill Plugin',
    purpose: 'Flood fill grid cells with shapes for tessellation',
    handler: 'Click cells to fill with current shape/color',
    shortcuts: {},
    panels: ['Grid settings, fill color, shape selection'],
    overlays: [],
    layers: ['Grid overlay for cell identification'],
    apis: {},
    features: [
      'Fill individual grid cells',
      'Works with all grid types',
      'Rapid tessellation workflow',
      'Uses current fill color and opacity',
      'Multiple shape options',
    ],
  },
  'minimap': {
    title: 'Minimap Plugin',
    purpose: 'Overview minimap for navigation in large canvases',
    handler: 'N/A (uses dedicated panel)',
    shortcuts: {},
    panels: ['Minimap view with viewport indicator'],
    overlays: [],
    layers: [],
    apis: {},
    features: [
      'Bird\'s-eye view of entire canvas',
      'Viewport indicator',
      'Click to jump to location',
      'Scales with canvas content',
      'Always visible (global panel)',
    ],
  },
};

Object.entries(plugins).forEach(([id, data]) => {
  const content = `---
id: ${id}
title: ${data.title}
sidebar_label: ${data.title.replace(' Plugin', '')}
---

# ${data.title}

**Purpose**: ${data.purpose}

## Overview

${data.features.map(f => `- ${f}`).join('\\n')}

## Handler

${data.handler}

## Keyboard Shortcuts

${Object.keys(data.shortcuts).length > 0 
  ? Object.entries(data.shortcuts).map(([key, desc]) => `- **${key}**: ${desc}`).join('\\n')
  : 'No plugin-specific shortcuts.'}

## UI Contributions

### Panels

${data.panels.length > 0 ? data.panels.map(p => `- ${p}`).join('\\n') : 'No panels.'}

### Overlays

${data.overlays.length > 0 ? data.overlays.map(o => `- ${o}`).join('\\n') : 'No overlays.'}

### Canvas Layers

${data.layers.length > 0 ? data.layers.map(l => `- ${l}`).join('\\n') : 'No canvas layers.'}

## Public APIs

${Object.keys(data.apis).length > 0
  ? Object.entries(data.apis).map(([method, desc]) => `### \`${method}\`\\n\\n${desc}`).join('\\n\\n')
  : 'No public APIs exposed.'}

## Usage Examples

\`\`\`typescript
// Activate the plugin
const state = useCanvasStore.getState();
state.setMode('${id}');

// Access plugin state
const ${id}State = useCanvasStore(state => state.${id});
\`\`\`

${Object.keys(data.apis).length > 0 ? `
## Calling Plugin APIs

\`\`\`typescript
const api = pluginManager.getPluginApi('${id}');
${Object.keys(data.apis).map(method => `api?.${method}();`).join('\\n')}
\`\`\`
` : ''}

## Implementation Details

**Location**: \`src/plugins/${id}/\`

**Files**:
- \`index.ts\`: Plugin definition
- \`slice.ts\`: Zustand slice (if applicable)
- \`*Panel.tsx\`: UI panels (if applicable)
- \`*Overlay.tsx\`: Overlays (if applicable)

## Edge Cases & Limitations

- Implementation-specific constraints
- Performance considerations for large datasets
- Browser compatibility notes (if any)

## Related

- [Plugin System Overview](../overview)
- [Event Bus](../../event-bus/overview)
${id === 'select' ? '- [Selection Feature](../../features/selection)' : ''}
${id === 'transformation' ? '- [Transform Feature](../../features/transforms)' : ''}
`;

  const filePath = path.join(CATALOG_DIR, `${id}.md`);
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✅ Created catalog/${id}.md`);
});

console.log('\\n🎉 Plugin catalog documentation created!');
