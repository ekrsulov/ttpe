---
id: text
title: Text Plugin
sidebar_label: Text
---

# Text Plugin

**Purpose**: Convert text to vector paths using font rendering

## Overview

- Text-to-curves conversion
- Font family, size, weight, style selection
- Uses WASM (potrace) for rendering
- Applies current stroke/fill settings

## Plugin Interaction Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as Text Panel
    participant TP as Text Plugin
    participant Store as Canvas Store
    participant WASM as OpenType WASM
    participant PP as Path Processor
    participant EB as Event Bus
    participant Canvas as Canvas Renderer
    
    Note over User,Canvas: 1. Plugin Activation
    User->>UI: Click Text Tool
    UI->>Store: setMode('text')
    Store->>TP: activate()
    TP->>Store: Initialize text slice
    TP->>WASM: Load font library
    WASM->>TP: Font system ready
    TP->>EB: Publish 'plugin:activated'
    EB->>UI: Show text panel
    
    Note over User,Canvas: 2. Enter Text
    User->>UI: Type "Hello" in text input
    UI->>TP: setText("Hello")
    TP->>Store: Update text.content
    Store->>UI: Update input value
    
    Note over User,Canvas: 3. Select Font
    User->>UI: Select "Arial" from font dropdown
    UI->>TP: setFontFamily("Arial")
    TP->>Store: Update text.fontFamily
    TP->>WASM: Load font file
    WASM->>TP: Font loaded
    
    Note over User,Canvas: 4. Adjust Font Properties
    User->>UI: Set font size to 48px
    UI->>TP: setFontSize(48)
    TP->>Store: Update text.fontSize
    
    User->>UI: Set font weight to "bold"
    UI->>Store: Update fontWeight
    
    Note over User,Canvas: 5. Create Text Path
    User->>Canvas: Click on canvas
    Canvas->>TP: handler(event, point)
    
    TP->>Store: Get text properties
    TP->>WASM: renderText(content, font, size, weight)
    
    WASM->>WASM: Parse font glyphs
    WASM->>WASM: Scale to font size
    WASM->>WASM: Apply font weight
    WASM->>WASM: Position characters
    
    loop For each character
        WASM->>WASM: Get glyph outline
        WASM->>WASM: Convert to path commands
        WASM->>TP: Return glyph path data
        TP->>PP: processGlyphPath(pathData)
        PP->>PP: Optimize path
        PP->>TP: Return optimized path
    end
    
    TP->>TP: Combine all glyph paths
    TP->>TP: Calculate bounding box
    TP->>TP: Apply baseline alignment
    TP->>TP: Position at click point
    
    TP->>Store: Get current stroke/fill settings
    TP->>TP: Apply styling to paths
    
    TP->>Store: addElement(textPath)
    Store->>Store: Add to undo stack
    Canvas->>Canvas: Render text as path
```

## Text-to-Path Conversion

```mermaid
flowchart TD
    A[Text Input] --> B[Get Font Data]
    B --> C[Parse Text String]
    C --> D[Split into Characters]
    
    D --> E{For Each Character}
    E --> F[Get Glyph ID]
    F --> G[Load Glyph Outline]
    
    G --> H[Scale to Font Size]
    H --> I[Apply Font Weight]
    I --> J[Convert to Path Commands]
    
    J --> K{Kerning Enabled?}
    K -->|Yes| L[Apply Kerning Table]
    K -->|No| M[Use Default Spacing]
    
    L --> N[Position Glyph]
    M --> N
    
    N --> O[Add to Path Array]
    O --> E
    
    E --> P[All Characters Done]
    P --> Q[Combine Paths]
    Q --> R[Calculate Bounds]
    R --> S[Apply Alignment]
    
    S --> T{Styling Options?}
    T -->|Stroke| U[Add Stroke Properties]
    T -->|Fill| V[Add Fill Properties]
    T -->|Both| W[Add Both]
    
    U --> X[Create Canvas Elements]
    V --> X
    W --> X
    
    X --> Y[Add to Store]
    Y --> Z[Render on Canvas]
    
    style G fill:#e1f5ff
    style J fill:#ffe1e1
    style Y fill:#e1ffe1
```

## State Management

```mermaid
graph TB
    subgraph "Text Plugin Slice"
        TS[Text State]
        TS --> TC[content: string]
        TS --> FF[fontFamily: string]
        TS --> FS[fontSize: number]
        TS --> FW[fontWeight: string]
        TS --> FT[fontStyle: string]
    end
    
    subgraph "WASM Integration"
        WI[OpenType WASM]
        WI --> FL[Font Loader]
        WI --> GP[Glyph Parser]
        WI --> PR[Path Renderer]
    end
    
    subgraph "Path Processing"
        PP[Path Processor]
        PP --> OPT[Optimize]
        PP --> SIM[Simplify]
        PP --> STY[Apply Styling]
    end
    
    TS --> WI
    WI --> PP
    PP --> TS
```

## Handler

Responds to pointer events when text content is available and creates text paths on canvas click.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Reserved for text tool interactions (e.g., committing text input when editing) |

## UI Contributions

### Panels

- Text input, font selection (always-visible 5-row list), size, weight, style

### Overlays

No overlays.

### Canvas Layers

No canvas layers.

## Public APIs

No public APIs exposed.

## Usage Examples

```typescript
// Activate the plugin
const state = useCanvasStore.getState();
state.setMode('text');

// Access plugin state
const textState = useCanvasStore(state => state.text);
```



## Implementation Details

**Location**: `src/plugins/text/`

**Files**:
- `index.ts`: Plugin definition
- `slice.ts`: Zustand slice (if applicable)
- `*Panel.tsx`: UI panels (if applicable)
- `*Overlay.tsx`: Overlays (if applicable)

## Edge Cases & Limitations

### Canvas Size Constraints

The text vectorization process uses potrace-wasm for rendering, which has internal memory buffer limitations. To prevent "offset is out of bounds" errors, the system implements adaptive canvas sizing:

**Limits:**
- Maximum canvas width: 2048px
- Maximum canvas height: 768px
- Maximum total pixels: 1,500,000 (~1.5M)

**Adaptive Scaling:**
The system automatically calculates the optimal rendering scale (1x to 4x) based on:
1. Estimated text dimensions
2. All three constraint limits
3. Iterative adjustment to ensure canvas stays within bounds

**Behavior:**
- Short text: Renders at 4x scale for optimal quality
- Medium text: Automatically scales down to 2-3x
- Long text: Scales to 1x if necessary
- Extreme cases: Proportionally reduces dimensions to fit within pixel count limit

**Example:**
- Text "VectorNest" at 180px font size
- Estimate: 941×216px (203,256 pixels)
- With 4x scale: 3,764×864px = 3,251,296 pixels ❌ (exceeds 1.5M limit)
- System adjusts to 2x scale: 1,882×432px = 813,024 pixels ✅
- Result: Successful vectorization at acceptable quality

This ensures reliable text-to-path conversion regardless of text length or font size.

## Related

- [Plugin System Overview](../overview)
- [Event Bus](../../event-bus/overview)


