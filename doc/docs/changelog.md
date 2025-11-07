---
id: changelog
title: Changelog
sidebar_label: Changelog
---

# Changelog

All notable changes to VectorNest will be documented here.

## [Unreleased]

### Added
- **Recursive Group Duplication**: Duplicate on Drag now supports duplicating entire group hierarchies, maintaining parent-child relationships when duplicating elements within groups
- **Enhanced Group Thumbnails**: Select Panel group thumbnails now include visual previews of all paths within nested groups, providing better visual representation of complex group structures
- **Improved Element Deletion**: Enhanced deletion logic for groups that recursively removes all descendants and automatically ungroups when deletion results in a group with only one child

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
