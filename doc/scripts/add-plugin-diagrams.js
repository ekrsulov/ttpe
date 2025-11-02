#!/usr/bin/env node

/**
 * Script to add Mermaid diagrams to remaining plugin documentation
 */

const fs = require('fs');
const path = require('path');

const PLUGINS_DIR = path.join(__dirname, '..', 'docs', 'plugins', 'catalog');

// Remaining plugins to process
const remainingPlugins = [
  {
    file: 'curves.md',
    diagram: `## Plugin Interaction Flow

\`\`\`mermaid
sequenceDiagram
    participant User
    participant UI as UI/Panel
    participant CP as Curves Plugin
    participant Store as Canvas Store
    participant LG as Lattice Grid
    participant DM as Deformation Math
    participant EB as Event Bus
    participant Canvas
    
    User->>UI: Activate Curves Tool
    UI->>Store: setMode('curves')
    Store->>CP: activate()
    CP->>Store: Get selected paths
    CP->>LG: createLattice(bounds, resolution)
    LG->>CP: Return lattice control points
    CP->>Canvas: Draw lattice overlay
    
    User->>UI: Drag lattice point
    UI->>CP: handleLatticeMove(pointId, pos)
    CP->>DM: calculateDeformation(lattice, paths)
    DM->>CP: Return deformed paths
    CP->>Canvas: Update preview
    
    User->>UI: Apply deformation
    UI->>CP: applyDeformation()
    CP->>Store: updateElements(deformed)
    Store->>EB: Publish 'elements:deformed'
    EB->>Canvas: Final render
\`\`\`

## Lattice System

\`\`\`mermaid
graph TB
    L[Lattice Grid] --> CP[Control Points]
    CP --> R1[Row 1]
    CP --> R2[Row 2]
    CP --> R3[Row 3]
    R1 --> P1[Point 1,1]
    R1 --> P2[Point 1,2]
    R2 --> P3[Point 2,1]
    R2 --> P4[Point 2,2]
    
    CP --> DM[Deformation Math]
    DM --> BI[Bilinear Interpolation]
    DM --> BZ[Bezier Curves]
    BI --> AP[Apply to Paths]
    BZ --> AP
\`\`\`

## Handler`
  },
  {
    file: 'subpath.md',
    diagram: `## Plugin Interaction Flow

\`\`\`mermaid
sequenceDiagram
    participant User
    participant UI
    participant SP as Subpath Plugin
    participant Store
    participant PP as Path Parser
    participant Canvas
    
    User->>UI: Select path with subpaths
    UI->>SP: activate()
    SP->>PP: parseSubpaths(pathData)
    PP->>SP: Return subpath list
    SP->>Canvas: Highlight subpaths
    
    User->>UI: Click subpath
    UI->>SP: selectSubpath(index)
    SP->>Store: Set selectedSubpath
    Store->>Canvas: Highlight selected
    
    User->>UI: Extract subpath
    UI->>SP: extractSubpath()
    SP->>Store: Create new element
    Store->>Canvas: Render as separate path
\`\`\`

## Handler`
  },
  {
    file: 'guidelines.md',
    diagram: `## Plugin Interaction Flow

\`\`\`mermaid
sequenceDiagram
    participant User
    participant Canvas
    participant GP as Guidelines Plugin
    participant Store
    participant SM as Snap Manager
    participant EB as Event Bus
    
    User->>Canvas: Drag from ruler
    Canvas->>GP: handleGuidelineCreate(axis)
    GP->>Store: Add guideline
    Store->>Canvas: Draw guideline
    
    User->>Canvas: Drag element near guideline
    Canvas->>SM: checkProximity(pos, guidelines)
    SM->>GP: Found guideline within threshold
    GP->>EB: Publish 'snap:guideline'
    EB->>Canvas: Snap element position
    Canvas->>Canvas: Show snap indicator
    
    User->>Canvas: Double-click guideline
    Canvas->>GP: removeGuideline(id)
    GP->>Store: Delete guideline
    Store->>Canvas: Clear from display
\`\`\`

## Handler`
  },
  {
    file: 'grid-fill.md',
    diagram: `## Plugin Interaction Flow

\`\`\`mermaid
sequenceDiagram
    participant User
    participant UI
    participant GF as GridFill Plugin
    participant Store
    participant GG as Grid Generator
    participant Canvas
    
    User->>UI: Select element + GridFill tool
    UI->>GF: activate()
    GF->>UI: Show grid parameters panel
    
    User->>UI: Set rows=3, cols=3, spacing=10
    UI->>GF: setGridParams(params)
    GF->>GG: calculateGridPositions(element, params)
    GG->>GF: Return grid positions array
    GF->>Canvas: Draw preview grid
    
    User->>UI: Click "Apply"
    UI->>GF: applyGridFill()
    GF->>Store: cloneElement(count)
    GF->>Store: Position clones in grid
    Store->>Canvas: Render all instances
\`\`\`

## Handler`
  },
  {
    file: 'optical-alignment.md',
    diagram: `## Plugin Interaction Flow

\`\`\`mermaid
sequenceDiagram
    participant User
    participant UI
    participant OA as OpticalAlignment Plugin
    participant Store
    participant VA as Visual Analyzer
    participant Canvas
    
    User->>UI: Select elements + Optical Align
    UI->>OA: activate()
    OA->>VA: analyzeVisualWeight(elements)
    VA->>VA: Calculate visual centers
    VA->>VA: Analyze shape distribution
    VA->>OA: Return optical centers
    
    User->>UI: Click "Align Optically"
    UI->>OA: applyOpticalAlignment()
    OA->>OA: Calculate offsets
    OA->>Store: Update element positions
    Store->>Canvas: Re-render aligned
\`\`\`

## Handler`
  },
  {
    file: 'minimap.md',
    diagram: `## Plugin Interaction Flow

\`\`\`mermaid
sequenceDiagram
    participant User
    participant MM as Minimap Plugin
    participant Store
    participant Canvas
    participant EB as Event Bus
    
    activate MM
    MM->>Store: Subscribe to viewport changes
    MM->>Store: Subscribe to elements changes
    MM->>Canvas: Create minimap overlay
    
    loop Continuous Updates
        Store->>MM: Viewport changed
        MM->>MM: Calculate thumbnail scale
        MM->>Canvas: Render minimap view
        MM->>Canvas: Draw viewport rectangle
    end
    
    User->>Canvas: Click minimap
    Canvas->>MM: handleMinimapClick(pos)
    MM->>Store: Calculate viewport position
    Store->>EB: Publish 'viewport:pan'
    EB->>Canvas: Update main canvas view
    MM->>Canvas: Update minimap viewport rect
    
    deactivate MM
\`\`\`

## Handler`
  }
];

function processPlugin(plugin) {
  const filePath = path.join(PLUGINS_DIR, plugin.file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${plugin.file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Find the position after "## Overview" section
  const overviewMatch = content.match(/(## Overview\n\n[\s\S]*?\n\n)(## Handler)/);
  
  if (overviewMatch) {
    const before = content.substring(0, overviewMatch.index + overviewMatch[1].length);
    const after = content.substring(overviewMatch.index + overviewMatch[1].length);
    
    content = before + plugin.diagram + '\n\n' + after;
    
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ Added diagrams to ${plugin.file}`);
  } else {
    console.log(`⚠️  Could not find insertion point in ${plugin.file}`);
  }
}

console.log('🔧 Adding Mermaid diagrams to remaining plugins...\n');

remainingPlugins.forEach(processPlugin);

console.log('\n✨ Done!');
