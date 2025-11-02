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
    UI->>TP: setFontWeight("bold")
    TP->>Store: Update text.fontWeight
    
    Note over User,Canvas: 5. Generate Text Paths
    User->>UI: Click "Convert to Paths" button
    UI->>TP: convertTextToPaths()
    
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
    
    TP->>Store: Get current stroke/fill settings
    TP->>TP: Apply styling to paths
    
    TP->>Store: createElements(textPaths)
    Store->>EB: Publish 'elements:created'
    EB->>Canvas: Render text as paths
    EB->>Store: Add to undo stack
    
    TP->>UI: Show success message
    TP->>Store: Clear text input
    
    Note over User,Canvas: 6. Advanced Options
    User->>UI: Toggle "Kerning" option
    UI->>TP: setKerning(true)
    TP->>Store: Update text.kerning = true
    
    User->>UI: Adjust letter spacing
    UI->>TP: setLetterSpacing(value)
    TP->>Store: Update text.letterSpacing
    
    Note over User,Canvas: 7. Plugin Deactivation
    User->>UI: Select different tool
    UI->>Store: setMode('select')
    Store->>TP: deactivate()
    TP->>Store: Clear text state
    TP->>EB: Publish 'plugin:deactivated'
    EB->>UI: Hide text panel
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
        TS --> KN[kerning: boolean]
        TS --> LS[letterSpacing: number]
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

N/A (uses panel input)

## Keyboard Shortcuts

No plugin-specific shortcuts.

## UI Contributions

### Panels

- Text input, font selection, size, weight, style

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

- Implementation-specific constraints
- Performance considerations for large datasets
- Browser compatibility notes (if any)

## Related

- [Plugin System Overview](../overview)
- [Event Bus](../../event-bus/overview)


