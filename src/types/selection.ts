/**
 * Selection Types
 * 
 * Centralized type definitions for selection-related data structures.
 * These types are used across slices, hooks, and components to maintain consistency.
 */

/**
 * Represents a selected command/point in the edit mode.
 */
export interface SelectedCommand {
  elementId: string;
  commandIndex: number;
  pointIndex: number;
}

/**
 * Represents an update to a point in a path.
 */
export interface PointUpdate {
  commandIndex: number;
  pointIndex: number;
  x: number;
  y: number;
  isControl: boolean;
}

/**
 * Represents a selected subpath in the canvas.
 */
export interface SelectedSubpath {
  elementId: string;
  subpathIndex: number;
}
