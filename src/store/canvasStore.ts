import { create } from 'zustand';
import type { Point } from '../types';

// Import all slices
import { createBaseSlice, type BaseSlice } from './slices/baseSlice';
import { createViewportSlice, type ViewportSlice } from './slices/features/viewportSlice';
import { createSelectionSlice, type SelectionSlice } from './slices/features/selectionSlice';
import { createOrderSlice, type OrderSlice } from './slices/features/orderSlice';
import { createArrangeSlice, type ArrangeSlice } from './slices/features/arrangeSlice';
import { createPluginManagementSlice, type PluginManagementSlice } from './slices/pluginManagementSlice';

// Combine all slice types
type CanvasStore = BaseSlice &
  ViewportSlice &
  SelectionSlice &
  OrderSlice &
  ArrangeSlice &
  PluginManagementSlice & {
    // Additional actions that need cross-slice functionality
    startPath: (point: Point) => void;
    addPointToPath: (point: Point) => void;
    finishPath: () => void;
    addText: (x: number, y: number, text: string) => void;
    deleteSelectedElements: () => void;
  };

// Create the store with all slices combined
export const useCanvasStore = create<CanvasStore>((set, get, api) => ({
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

  // Plugin management slice
  ...createPluginManagementSlice(set, get, api),

  // Cross-slice actions
  startPath: (point) => {
    const { strokeWidth, strokeColor, opacity } = get().plugins.pencil;
    get().addElement({
      type: 'path',
      data: {
        points: [point],
        strokeWidth,
        strokeColor,
        opacity,
      },
    });
  },

  addPointToPath: (point) => {
    const state = get();
    const lastElement = state.elements[state.elements.length - 1];
    if (lastElement?.type === 'path') {
      const pathData = lastElement.data as import('../types').PathData;
      get().updateElement(lastElement.id, {
        data: {
          ...pathData,
          points: [...pathData.points, point],
        },
      });
    }
  },

  finishPath: () => {
    // Path is already added, nothing special to do
  },

  addText: (x, y, text) => {
    const { fontSize, fontFamily, color, fontWeight, fontStyle, textDecoration, opacity } = get().plugins.text;
    get().addElement({
      type: 'text',
      data: {
        x,
        y,
        text,
        fontSize,
        fontFamily,
        color,
        fontWeight,
        fontStyle,
        textDecoration,
        opacity,
      },
    });
    // Auto-switch to select mode after adding text
    get().setActivePlugin('select');
  },

  deleteSelectedElements: () => {
    const selectedIds = get().selectedIds;
    set((state) => ({
      elements: state.elements.filter((el) => !(selectedIds as any).includes(el.id)),
      selectedIds: [],
    }));
  },
}));