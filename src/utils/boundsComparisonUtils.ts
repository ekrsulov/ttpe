/**
 * Bounds Comparison Utilities
 * 
 * @deprecated This module is now a re-export wrapper.
 * Import directly from './comparators/bounds' instead.
 * 
 * Centralized utilities for comparing bounding boxes to support
 * memoization and change detection across the application.
 */

export type { RoundedBbox } from './comparators/bounds';
export {
  getRoundedBbox,
  areBboxesEqual,
  haveBoundsChanged,
  havePathBoundsChanged
} from './comparators/bounds';
