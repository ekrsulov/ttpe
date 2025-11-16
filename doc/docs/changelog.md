---
id: changelog
title: Changelog
sidebar_label: Changelog
---

# Changelog

All notable changes to VectorNest will be documented here.

## [Unreleased]

### Added
- **Text Vectorization Limits**: Implemented adaptive canvas sizing for potrace to prevent memory errors with long text
  - Added triple constraint system: max width (2048px), max height (768px), and max pixel count (1.5M pixels)
  - Intelligent scale calculation considers all three limits to find optimal rendering scale
  - Iterative scale adjustment ensures canvas stays within potrace's internal buffer limits
  - Proportional dimension scaling for extreme cases when even 1x scale exceeds limits
  - Prevents "offset is out of bounds" errors when vectorizing long text strings
- **Expandable Tool Panels**: New bottom expandable panel system for plugin-specific controls when sidebar is unpinned
- **Dynamic Step Precision for Sliders**: Enhanced `SliderControl` component with `stepFunction` prop for adaptive precision
  - Fine control (0.1 increments) for small values, coarse control (1.0 increments) for larger values
  - Applied to Stroke Width control: decimal precision for thin strokes (< 1px), integer precision for thick strokes (≥ 1px)
  - Improved user experience with appropriate precision levels based on value ranges
- **Direct Value Editing for Sliders**: Added click-to-edit functionality to `SliderControl` value display
  - Click on the value text to open an inline input field for direct numeric entry
  - Enter or blur to confirm changes, Escape to cancel
  - Automatic percentage conversion for percentage-based sliders (enter "50" for 50%, not "0.5")
  - **Behavior Change:** Values typed in via the slider's inline text editor now behave differently depending on the slider type:
    - **Percent-based sliders** continue to be clamped to the declared min/max (e.g., 0–100%) and respect step precision.
    - **Non-percent sliders** (for example, pixel-based controls like stroke width, radius, or width/height numeric inputs) allow typed entries that exceed the slider's `max` value. The slider thumb itself is visually clamped to `min`/`max`, but the `onChange` handler receives the full typed number and the value is quantized according to `step` or `stepFunction` when present.
  - Consistent with group name editing in selection panel
  - Added `expandablePanel` property to `PluginDefinition` for optional tool-specific UI
  - Implemented `ExpandableToolPanel` component with smooth expand/collapse animation
  - Added `getExpandablePanel()` method to PluginManager for retrieving panel components
  - Created expandable panels for Curves, Edit, Pencil, Shape, Text, and Transformation plugins
  - Panels automatically hide when sidebar is pinned
  - Provides quick access to tool controls without taking permanent screen space
- **Enhanced Path Parser**: Added start point verification for cubic Bézier curves (C commands) in `pathParserUtils`
  - Validates that C command start points match previous segment end points
  - Improves path parsing reliability and error detection
- **Copilot Instructions**: Added comprehensive `.github/copilot-instructions.md` with project architecture overview, patterns, and workflows for AI-assisted development
- **Multi-Selection Lock & Hide**: Added Lock and Hide actions to the floating context menu for multi-selection
  - Applies lock/hide to topmost parent groups when elements belong to groups
  - Correctly handles nested group hierarchies by finding the root group
  - Prevents duplicate operations when multiple elements from the same group are selected
- **Recursive Group Duplication**: Duplicate on Drag now supports duplicating entire group hierarchies, maintaining parent-child relationships when duplicating elements within groups
- **Multi-Selection Duplication**: Duplicate on Drag now duplicates all selected elements when dragging any selected element, enabling bulk duplication workflows
- **Enhanced Group Thumbnails**: Select Panel group thumbnails now include visual previews of all paths within nested groups, providing better visual representation of complex group structures
- **Improved Element Deletion**: Enhanced deletion logic for groups that recursively removes all descendants and automatically ungroups when deletion results in a group with only one child
- **Performance Optimizations**: Added @tanstack/react-virtual library for virtualized rendering and implemented useFrozenElementsDuringDrag hook to prevent unnecessary re-renders during drag operations
- **Object Snap (OSNAP)**: New precision positioning system for enhanced editing accuracy
  - Snap to path endpoints, midpoints, and intersections during point editing and selection dragging
  - Configurable snap threshold (4-20px) for fine-tuning sensitivity
  - Visual feedback with snap point indicators during drag operations
  - Toggle controls for enabling/disabling specific snap types
  - Integrated into Edit mode with expandable panel for settings
  - Improves precision in complex path editing and alignment tasks
- **Trim Path Plugin**: New interactive tool for trimming path segments at intersections
  - Added Trim Path plugin with activation/deactivation logic and state management
  - Implemented hover and drag states for precise trimming interactions
  - Created utility functions for path validation, intersection computation, and path splitting
  - Developed UI components including Trim Path overlay and expandable panel
  - Integrated keyboard shortcuts for tool activation
  - Added functionality to trim segments based on user interactions and path intersections
  - Implemented path reconstruction after trimming to maintain visual integrity

### Changed
- **FontSelector UI (2025-11-10)**: Replaced Popover dropdown with an always-open listbox showing 5 items
  - Faster font scanning with persistent list
  - Added small padding per item and thin separators between options
  - Clear selection and highlight states (light/dark aware)
  - Keyboard: Up/Down/Home/End navigation; Enter/Space to select
  - TTF fonts indicated via textual suffix "(TTF)"
- **Selection Behavior**: When clicking elements inside groups, the root group is now selected instead of the individual element for better group manipulation
- **Selection Bbox Visual Feedback** for multi-element selections
  - Amber-colored bounding box showing overall selection extent
  - Only displays when four corner-defining elements or groups are different
  - Uses group bounds for elements that belong to groups and directly selected groups
  - 10px margin around calculated bounds (larger than group bounds)
  - Helps visualize the complete span of scattered selections
- **Export Padding** configurable slider in File Panel
  - Control padding (0-100px) around exported SVG/PNG content
  - Default value: 20px
  - Accessible via slider in File Panel for easy adjustment before export
  - Only applied when exporting all elements (not selected only)
- **Scale Stroke With Zoom** setting to control whether stroke widths scale proportionally with zoom level
  - New toggle in Settings Panel
  - Default behavior (disabled) maintains constant visual stroke thickness
  - When enabled, strokes scale with zoom for accurate preview
  - Affects both rendered elements and pencil drawing preview
- Comprehensive documentation site with Docusaurus
- Plugin system with 13+ core plugins
- Event bus for decoupled communication
- Zustand store with slice architecture
- Undo/redo with Zundo
- Auto-persist to localStorage
- E2E testing with Playwright
- **SelectPanel Rendering**: Optimized SelectPanel to use virtual scrolling with @tanstack/react-virtual, reducing DOM nodes and improving performance with large selections
- **Action Bars Optimization**: BottomActionBar and TopActionBar now avoid expensive calculations during drag operations to prevent UI lag
- **Tool Panel Unification (2025-11-10)**: Removed duplicated `*ExpandablePanel.tsx` files for Pencil, Text, Shape, Curves, Transformation, and Edit tools. Plugins now reuse their sidebar panel component as the expandable variant with the header hidden via `hideHeader`/`hideTitle`. Select and Subpath modes use the transversal `EditorPanel` in the expandable area. Edit uses a wrapper component to map store state to `EditPanel` props.

- **Shape creation threshold (2025-11-15)**: Prevented accidental tiny shapes from being created by requiring a minimum movement between pointerDown and pointerUp before creating a shape. This avoids generating tiny elements and unnecessary undo stack entries.
  - New constant: `MIN_SHAPE_CREATION_DISTANCE` (default: 5 pixels) in `src/plugins/shape/config.ts`
  - Behavior: Click-only or very small drags below the threshold will not create a shape; normal drag creation is unchanged.

### Changed
- **Default Settings Updates (2025-11-10)**: Updated default application settings for improved user experience
  - Grid plugin now enabled by default with snapping and rulers visible
  - Guidelines plugin now enabled by default with distance detection active
  - Minimap now shown by default in the UI
  - Tooltips now enabled by default on desktop
  - Stroke scaling with zoom now enabled by default
- **Sidebar Dev Mode Behavior**: In development mode on desktop, sidebar is now always pinned for better debugging experience
- **FloatingContextMenu Enhancement**: Improved submenu item rendering with rotated icon for 'send-back' action
- **Pencil Test Improvements**: Enhanced visibility checks in pencil drawing tests using semantic heading selectors
- **Test Cleanup**: Removed unused visibility tests to streamline test suite
  - Enhanced search functionality with better focus management
  - Improved keyboard navigation and accessibility
  - Better visual feedback and hover states
- **FloatingContextMenu Enhancements**: Expanded context menu actions with improved organization
  - Enhanced multi-selection actions for locking and hiding elements
  - Better handling of grouped elements in context actions
  - Improved visual hierarchy and action grouping
- **Select Panel UI Simplification**: Streamlined element and group cards in the Select Panel
  - Removed Group, Duplicate, and Copy to Clipboard buttons from element cards (actions available via context menu)
  - Removed Ungroup button from group cards (action available via context menu)
  - Visibility and Lock controls now show conditionally:
    - Unlock button only appears when element/group is locked
    - View button only appears when element/group is hidden
    - Select button always visible (disabled if locked or hidden)
  - Cleaner, less cluttered interface focusing on core selection and visibility controls
- Migrated to React 19
- Updated to TypeScript 5.8
- Improved performance with memoization

### Fixed
- **Visual Center Algorithm**: Fixed "Apply Visual Center" to correctly calculate visual center instead of geometric center when content has white/light stroke and container has no fill
  - Added intelligent background color detection to ensure contrast between content and background
  - System now uses dark background (#333333) when content has light colors (white, light grays, etc.)
  - Prevents the algorithm from falling back to geometric center due to lack of contrast
  - Applies to all visual center operations including batch alignment
- Various selection edge cases
- Zoom behavior on mobile
- Keyboard shortcut conflicts

### Fixed
- **Trim Path: Remove duplicate/degenerate reconstructed paths (2025-11-16)**: After trimming segments, the path reconstruction pass now sanitizes reconstructed paths to remove duplicate 'd' values, tiny degenerate fragments (single-point or near-zero length paths), and small fragments contained within larger paths. This prevents stray point elements or duplicate visual geometry from being added after trim operations.

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
