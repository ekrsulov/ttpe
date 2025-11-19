/**
 * Core Canvas Store Types
 * 
 * Defines the base store structure without plugin dependencies.
 * Plugins can extend the store dynamically through the plugin system.
 */

import type { BaseSlice } from './slices/baseSlice';
import type { ViewportSlice } from './slices/features/viewportSlice';
import type { SelectionSlice } from './slices/features/selectionSlice';
import type { GroupSlice } from './slices/features/groupSlice';
import type { OrderSlice } from './slices/features/orderSlice';
import type { ArrangeSlice } from './slices/features/arrangeSlice';
// Static plugin imports removed for dynamic architecture


/**
 * Core Canvas Store - only structural slices, no plugin dependencies
 */
export type CoreCanvasStore = BaseSlice &
  ViewportSlice &
  SelectionSlice &
  GroupSlice &
  OrderSlice &
  ArrangeSlice;

/**
 * Extended Canvas Store - includes plugin slices as optional (Partial<>)
 * Plugins are registered dynamically at runtime
 */
export type CanvasStore = CoreCanvasStore & Record<string, any>;


