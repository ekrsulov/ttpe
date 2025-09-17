import { create } from 'zustand';
import { temporal } from 'zundo';
import type { Point } from '../types';
import { textToPath } from '../utils/textVectorizationUtils';

// Import all slices
import { createBaseSlice, type BaseSlice } from './slices/baseSlice';
import { createViewportSlice, type ViewportSlice } from './slices/features/viewportSlice';
import { createSelectionSlice, type SelectionSlice } from './slices/features/selectionSlice';
import { createOrderSlice, type OrderSlice } from './slices/features/orderSlice';
import { createArrangeSlice, type ArrangeSlice } from './slices/features/arrangeSlice';
import { createPluginManagementSlice, type PluginManagementSlice } from './slices/pluginManagementSlice';
import { createShapePluginSlice, type ShapePluginSlice } from './slices/plugins/shapePluginSlice';
import { createHistoryPluginSlice, type HistoryPluginSlice } from './slices/plugins/historyPluginSlice';
import { createTransformationPluginSlice, type TransformationPluginSlice } from './slices/plugins/transformationPluginSlice';
import { createEditorPluginSlice, type EditorPluginSlice } from './slices/plugins/editorPluginSlice';

// Throttle function to implement cool-off period
function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T {
  let timeoutId: number | null = null;
  let lastExecTime = 0;

  return ((...args: Parameters<T>) => {
    const currentTime = Date.now();

    if (currentTime - lastExecTime > delay) {
      func(...args);
      lastExecTime = currentTime;
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        func(...args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  }) as T;
}

// Combine all slice types
type CanvasStore = BaseSlice &
  ViewportSlice &
  SelectionSlice &
  OrderSlice &
  ArrangeSlice &
  PluginManagementSlice &
  ShapePluginSlice &
  HistoryPluginSlice &
  TransformationPluginSlice &
  EditorPluginSlice & {
    // Additional actions that need cross-slice functionality
    startPath: (point: Point) => void;
    addPointToPath: (point: Point) => void;
    finishPath: () => void;
    addText: (x: number, y: number, text: string) => Promise<void>;
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

      // Plugin management slice
      ...createPluginManagementSlice(set, get, api),

      // Shape plugin slice
      ...createShapePluginSlice(set, get, api),

      // History plugin slice
      ...createHistoryPluginSlice(set, get, api),

      // Transformation plugin slice
      ...createTransformationPluginSlice(set, get, api),

      // Editor plugin slice
      ...createEditorPluginSlice(set, get, api),

      // Cross-slice actions
      startPath: (point) => {
        const { strokeWidth, strokeColor, opacity } = get().plugins.pencil;
        get().addElement({
          type: 'path',
          data: {
            d: `M ${point.x} ${point.y}`,
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
          const newD = `${pathData.d} L ${point.x} ${point.y}`;
          get().updateElement(lastElement.id, {
            data: {
              ...pathData,
              d: newD,
            },
          });
        }
      },

      finishPath: () => {
        // Path is already added, nothing special to do
      },

      addText: async (x, y, text) => {
        const { fontSize, fontFamily, color, fontWeight, fontStyle, opacity } = get().plugins.text;
        
        try {
          // Convert text to path automatically
          const pathD = await textToPath(
            text,
            x,
            y,
            fontSize,
            fontFamily,
            fontWeight,
            fontStyle
          );

          if (pathD) {
            // Create path element with the converted text
            get().addElement({
              type: 'path',
              data: {
                d: pathD,
                strokeWidth: 1,
                strokeColor: color,
                opacity,
              },
            });
          } else {
            console.error('Failed to convert text to path');
          }
        } catch (error) {
          console.error('Error converting text to path:', error);
        }
        
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

  createShape: (startPoint, endPoint) => {
    const { strokeWidth, strokeColor, opacity } = get().plugins.pencil;
    const selectedShape = get().plugins.shape.selectedShape;
    
    // Calculate shape dimensions
    const width = Math.abs(endPoint.x - startPoint.x);
    const height = Math.abs(endPoint.y - startPoint.y);
    const centerX = (startPoint.x + endPoint.x) / 2;
    const centerY = (startPoint.y + endPoint.y) / 2;
    
    let d = '';
    
    switch (selectedShape) {
      case 'square':
        // Create a square using path commands
        const halfSize = Math.min(width, height) / 2;
        d = `M ${centerX - halfSize} ${centerY - halfSize} L ${centerX + halfSize} ${centerY - halfSize} L ${centerX + halfSize} ${centerY + halfSize} L ${centerX - halfSize} ${centerY + halfSize} Z`;
        break;
        
      case 'rectangle':
        // Create a rectangle using path commands
        d = `M ${startPoint.x} ${startPoint.y} L ${endPoint.x} ${startPoint.y} L ${endPoint.x} ${endPoint.y} L ${startPoint.x} ${endPoint.y} Z`;
        break;
        
      case 'circle':
        // Create a circle using C commands (Bézier curves)
        const radius = Math.min(width, height) / 2;
        const kappa = 0.552284749831; // Control point constant for circle approximation
        
        // Calculate control points
        const cx1 = centerX - radius;
        const cy1 = centerY - radius * kappa;
        const cx2 = centerX - radius * kappa;
        const cy2 = centerY - radius;
        const cx3 = centerX + radius * kappa;
        const cy3 = centerY - radius;
        const cx4 = centerX + radius;
        const cy4 = centerY - radius * kappa;
        const cx5 = centerX + radius;
        const cy5 = centerY + radius * kappa;
        const cx6 = centerX + radius * kappa;
        const cy6 = centerY + radius;
        const cx7 = centerX - radius * kappa;
        const cy7 = centerY + radius;
        const cx8 = centerX - radius;
        const cy8 = centerY + radius * kappa;
        
        d = `M ${centerX - radius} ${centerY} C ${cx1} ${cy1} ${cx2} ${cy2} ${centerX} ${centerY - radius} C ${cx3} ${cy3} ${cx4} ${cy4} ${centerX + radius} ${centerY} C ${cx5} ${cy5} ${cx6} ${cy6} ${centerX} ${centerY + radius} C ${cx7} ${cy7} ${cx8} ${cy8} ${centerX - radius} ${centerY} Z`;
        break;
        
      case 'triangle':
        // Create a triangle using path commands
        d = `M ${centerX} ${startPoint.y} L ${endPoint.x} ${endPoint.y} L ${startPoint.x} ${endPoint.y} Z`;
        break;
        
      default:
        // Default to square if unknown shape
        const defaultHalfSize = Math.min(width, height) / 2;
        d = `M ${centerX - defaultHalfSize} ${centerY - defaultHalfSize} L ${centerX + defaultHalfSize} ${centerY - defaultHalfSize} L ${centerX + defaultHalfSize} ${centerY + defaultHalfSize} L ${centerX - defaultHalfSize} ${centerY + defaultHalfSize} Z`;
        break;
    }
    
    get().addElement({
      type: 'path',
      data: {
        d,
        strokeWidth,
        strokeColor,
        opacity,
      },
    });
    
    // Auto-switch to select mode after creating shape
    get().setActivePlugin('select');
  },
}),
{
  // Zundo temporal options
  limit: 50, // Keep last 50 states
  partialize: (state) => ({
    elements: state.elements,
    selectedIds: state.selectedIds,
    viewport: state.viewport,
    plugins: {
      ...state.plugins,
      history: undefined, // Exclude history state from tracking
    },
    activePlugin: state.activePlugin,
  }),
  // Cool-off period: throttle state changes to prevent too many history entries
  // during rapid events like drawing or moving
  handleSet: (handleSet) =>
    throttle<typeof handleSet>((state) => {
      handleSet(state);
    }, 500), // 500ms cool-off period
}
)
);
