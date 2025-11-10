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

### Changed
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

### Changed
- **FontSelector Refactor**: Migrated from Menu to Popover component for improved UX and better control positioning
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
