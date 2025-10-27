/**
 * Element Update Batching Utilities
 * 
 * Helper functions for batching and applying point updates across
 * drag and snap phases. Reduces code duplication in drag handlers
 * and ensures consistent update patterns.
 */

// Re-export PointUpdate from centralized types
export type { PointUpdate } from '../types/selection';

// Note: buildElementUpdatesMap, mergeElementUpdates, and applyPointUpdatesToCommands
// were removed as they were unused. The edit slice has its own implementation.
