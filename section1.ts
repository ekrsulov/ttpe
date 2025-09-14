import { create } from 'zustand';
import { temporal } from 'zundo';
import type { Point } from '../types';

// Import all slices
import { createBaseSlice, type BaseSlice } from './slices/baseSlice';
import { createViewportSlice, type ViewportSlice } from './slices/features/viewportSlice';
import { createSelectionSlice, type SelectionSlice } from './slices/features/selectionSlice';
import { createOrderSlice, type OrderSlice } from './slices/features/orderSlice';
import { createArrangeSlice, type ArrangeSlice } from './slices/features/arrangeSlice';
import { createPluginManagementSlice, type PluginManagementSlice } from './slices/pluginManagementSlice';
import { createShapePluginSlice, type ShapePluginSlice } from './slices/plugins/shapePluginSlice';
import { createHistoryPluginSlice, type HistoryPluginSlice } from './slices/plugins/historyPluginSlice';

// Combine all slice types
type CanvasStore = BaseSlice &
  ViewportSlice &
  SelectionSlice &
  OrderSlice &
  ArrangeSlice &
  PluginManagementSlice &
  ShapePluginSlice &
  HistoryPluginSlice & {
    // Additional actions that need cross-slice functionality
    startPath: (point: Point) => void;
    addPointToPath: (point: Point) => void;
    finishPath: () => void;
    addText: (x: number, y: number, text: string) => void;
    deleteSelectedElements: () => void;
    createShape: (startPoint: Point, endPoint: Point) => void;
  };

// Create the store with all slices combined and temporal middleware
export const useCanvasStore = create<CanvasStore>()(
  temporal(
    (set, get, api) => ({
      // Base slice
      ...createBaseSlice(set, get, api),

      // Viewport slice
      ...createViewportSlice(set, get, api),

      // Selection slice
      ...createSelectionSlice(set, get, api),

      // Order slice
      ...createOrderSlice(set, get, api),

      // Arrange slice
      ...createArrangeSlice(set, get, api),
