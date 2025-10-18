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
import type { PencilPluginSlice } from '../plugins/pencil/slice';
import type { TextPluginSlice } from '../plugins/text/slice';
import type { ShapePluginSlice } from '../plugins/shape/slice';
import type { TransformationPluginSlice } from '../plugins/transformation/slice';
import type { EditPluginSlice } from '../plugins/edit/slice';
import type { SubpathPluginSlice } from '../plugins/subpath/slice';
import type { OpticalAlignmentSlice } from '../plugins/opticalAlignment/slice';
import type { CurvesPluginSlice } from '../plugins/curves/slice';
import type { GuidelinesPluginSlice } from '../plugins/guidelines/slice';
import type { GridPluginSlice } from '../plugins/grid/slice';

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
export type CanvasStore = CoreCanvasStore &
  Partial<PencilPluginSlice> &
  Partial<TextPluginSlice> &
  Partial<ShapePluginSlice> &
  Partial<TransformationPluginSlice> &
  Partial<EditPluginSlice> &
  Partial<SubpathPluginSlice> &
  Partial<OpticalAlignmentSlice> &
  Partial<CurvesPluginSlice> &
  Partial<GuidelinesPluginSlice> &
  Partial<GridPluginSlice>;

