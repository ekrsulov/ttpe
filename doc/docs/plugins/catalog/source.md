---
id: source
title: Source Plugin
sidebar_label: Source
---

# Source Plugin

**Purpose**: Allows users to view, edit, and re-import the raw SVG source code of the current canvas.

## Overview

-   **Export**: Automatically exports the current canvas state to SVG format when the dialog opens.
-   **Edit**: Provides a code editor (textarea) to modify the SVG source directly.
-   **Import**: Re-imports the modified SVG back into the canvas, replacing existing elements.
-   **Clipboard**: Supports copying the SVG source to the clipboard.
-   **Validation**: Tracks unsaved changes and prevents importing invalid SVG (basic error handling).

## Plugin Interaction Flow

```mermaid
sequenceDiagram
    participant User
    participant Panel as Source Panel
    participant Dialog as Source Dialog
    participant Slice as Source Slice
    participant Canvas as Canvas Store

    Note over User,Canvas: 1. Open Source View
    User->>Panel: Click "SVG Source"
    Panel->>Slice: setSourceDialogOpen(true)
    Slice->>Dialog: Render Dialog
    Dialog->>Canvas: Get elements & selectedIds
    Dialog->>Dialog: serializePathsForExport()
    Dialog->>Slice: setSourceSvgContent(exportedSVG)
    
    Note over User,Canvas: 2. Edit Source
    User->>Dialog: Type in Textarea
    Dialog->>Slice: setSourceSvgContent(newContent)
    Dialog->>Slice: setSourceHasUnsavedChanges(true)
    
    Note over User,Canvas: 3. Update Canvas
    User->>Dialog: Click "Update Canvas"
    Dialog->>Slice: importSvgToCanvas(file)
    Slice->>Canvas: importSVGWithDimensions()
    Canvas->>Canvas: Replace elements
    Slice->>Slice: setSourceDialogOpen(false)
```

## State Management

The Source plugin manages its state via `SourcePluginSlice` within the main Canvas Store.

```typescript
interface SourcePluginSlice {
  source: {
    isDialogOpen: boolean;        // Controls dialog visibility
    svgContent: string;           // Current SVG source content
    hasUnsavedChanges: boolean;   // Tracks if source has been modified
  };
  setSourceDialogOpen: (isOpen: boolean) => void;
  setSourceSvgContent: (content: string) => void;
  setSourceHasUnsavedChanges: (hasChanges: boolean) => void;
  importSvgToCanvas: (file: File) => Promise<void>;
}
```

## UI Contributions

### Panels

**Source Panel**:
-   Located in the **File** sidebar.
-   Contains a button to open the Source Dialog.

### Dialogs

**Source Dialog**:
-   Modal dialog containing a large textarea for SVG editing.
-   **Clear**: Clears the editor.
-   **Copy**: Copies content to clipboard.
-   **Update Canvas**: Parses the SVG and updates the canvas.

## Implementation Details

**Location**: `src/plugins/source/`

**Files**:
-   `index.ts`: Plugin definition and registration.
-   `sourcePluginSlice.ts`: Zustand slice for state and actions.
-   `SourcePanel.tsx`: Sidebar panel component.
-   `SourceDialog.tsx`: Modal dialog component.

## Usage

1.  Open the **File** tab in the sidebar.
2.  Click the **SVG Source** button in the "Source" panel.
3.  View or edit the SVG code.
4.  Click **Update Canvas** to apply changes, or **Copy** to export the code.
