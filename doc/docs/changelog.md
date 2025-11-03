---
id: changelog
title: Changelog
sidebar_label: Changelog
---

# Changelog

All notable changes to VectorNest will be documented here.

## [Unreleased]

### Added
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
