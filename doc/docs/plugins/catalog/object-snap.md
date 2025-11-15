---
id: object-snap
title: Object Snap Plugin
sidebar_label: Object Snap
---

# Object Snap Plugin

**Purpose**: Precision positioning system for enhanced editing accuracy

## Overview

The Object Snap (OSNAP) plugin provides intelligent snapping functionality to help users position elements precisely during editing operations. It automatically detects and snaps to key points on paths, making it easier to create aligned and precise vector graphics.

**Key Features:**
- Snap to path endpoints, midpoints, and intersections
- Configurable snap threshold for sensitivity adjustment
- Visual feedback with snap point indicators
- Toggle controls for enabling specific snap types
- Active during point editing and selection dragging in Edit mode
- Expandable panel for settings management
- Theme-aware visual indicators (black/white based on color mode)

## How It Works

Object Snap analyzes all visible canvas elements to identify potential snap points:

- **Endpoints**: Start and end points of path segments
- **Midpoints**: Center points of line segments
- **Intersections**: Points where path segments cross each other

When dragging points or selections in Edit mode, the system continuously checks for nearby snap points within the configured threshold distance. When a snap point is detected, the cursor automatically aligns to it and visual indicators appear.

## Configuration Options

### Enable OSNAP
Master toggle to enable/disable the entire snapping system.

### Snap Threshold
Adjustable distance (4-20 pixels) within which snapping occurs. Lower values provide more precise snapping, higher values make it easier to snap from farther away.

### Snap Types
Individual toggles for different snap point types:
- **Endpoints**: Snap to start/end points of path segments (enabled by default)
- **Midpoints**: Snap to center points of segments (enabled by default)
- **Intersections**: Snap to points where paths cross (disabled by default)

## Visual Feedback

During active snapping:
- Small circular indicators appear at available snap points
- The active snap point is highlighted with a larger indicator
- Cursor position is constrained to the snap point
- Indicators use theme-appropriate colors (black in light mode, white in dark mode)

## Usage Scenarios

### Precise Path Editing
When editing control points of curves or shapes, Object Snap helps align points to existing geometry, creating smoother and more intentional curves.

### Element Alignment
During selection dragging, snap to intersections or endpoints of other elements to achieve pixel-perfect alignment without manual measurement.

### Complex Intersections
Enable intersection snapping when working with overlapping paths to ensure points land exactly at crossing locations.

## Performance Considerations

- Snap points are cached and only recalculated when elements change
- Visual indicators only appear during active dragging operations
- Threshold checking uses efficient distance calculations
- System automatically disables when not in Edit mode

## Integration

Object Snap integrates seamlessly with the Edit tool and is controlled through its expandable panel. The feature is designed to be non-intrusive - snapping only occurs when explicitly enabled and within the configured parameters.