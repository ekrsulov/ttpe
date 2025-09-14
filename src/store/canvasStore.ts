import { create } from 'zustand';
import type { Point } from '../types';

// Import all slices
import { createBaseSlice, type BaseSlice } from './slices/baseSlice';
import { createViewportSlice, type ViewportSlice } from './slices/features/viewportSlice';
import { createSelectionSlice, type SelectionSlice } from './slices/features/selectionSlice';
import { createOrderSlice, type OrderSlice } from './slices/features/orderSlice';
import { createArrangeSlice, type ArrangeSlice } from './slices/features/arrangeSlice';
import { createPluginManagementSlice, type PluginManagementSlice } from './slices/pluginManagementSlice';
import { createShapePluginSlice, type ShapePluginSlice } from './slices/plugins/shapePluginSlice';

// Combine all slice types
type CanvasStore = BaseSlice &
  ViewportSlice &
  SelectionSlice &
  OrderSlice &
  ArrangeSlice &
  PluginManagementSlice &
  ShapePluginSlice & {
    // Additional actions that need cross-slice functionality
    startPath: (point: Point) => void;
    addPointToPath: (point: Point) => void;
    finishPath: () => void;
    addText: (x: number, y: number, text: string) => void;
    deleteSelectedElements: () => void;
    createShape: (startPoint: Point, endPoint: Point) => void;
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

  // Shape plugin slice
  ...createShapePluginSlice(set, get, api),

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

  createShape: (startPoint, endPoint) => {
    const { strokeWidth, strokeColor, opacity } = get().plugins.pencil;
    const selectedShape = get().plugins.shape.selectedShape;
    
    // Calculate shape dimensions
    const width = Math.abs(endPoint.x - startPoint.x);
    const height = Math.abs(endPoint.y - startPoint.y);
    const centerX = (startPoint.x + endPoint.x) / 2;
    const centerY = (startPoint.y + endPoint.y) / 2;
    
    let points: Point[] = [];
    
    switch (selectedShape) {
      case 'square':
        // Create a square using path commands
        const halfSize = Math.min(width, height) / 2;
        points = [
          { x: centerX - halfSize, y: centerY - halfSize },
          { x: centerX + halfSize, y: centerY - halfSize },
          { x: centerX + halfSize, y: centerY + halfSize },
          { x: centerX - halfSize, y: centerY + halfSize },
          { x: centerX - halfSize, y: centerY - halfSize }, // Close the square
        ];
        break;
        
      case 'rectangle':
        // Create a rectangle using path commands
        points = [
          { x: startPoint.x, y: startPoint.y },
          { x: endPoint.x, y: startPoint.y },
          { x: endPoint.x, y: endPoint.y },
          { x: startPoint.x, y: endPoint.y },
          { x: startPoint.x, y: startPoint.y }, // Close the rectangle
        ];
        break;
        
      case 'circle':
        // Create a circle approximation using path commands
        const radius = Math.min(width, height) / 2;
        const segments = 16;
        for (let i = 0; i < segments; i++) {
          const angle = (i / segments) * 2 * Math.PI;
          points.push({
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle),
          });
        }
        // Close the circle by adding the first point again
        if (points.length > 0) {
          points.push(points[0]);
        }
        break;
        
      case 'triangle':
        // Create a triangle using path commands
        points = [
          { x: centerX, y: startPoint.y },
          { x: endPoint.x, y: endPoint.y },
          { x: startPoint.x, y: endPoint.y },
          { x: centerX, y: startPoint.y }, // Close the triangle
        ];
        break;
        
      default:
        // Default to square if unknown shape
        const defaultHalfSize = Math.min(width, height) / 2;
        points = [
          { x: centerX - defaultHalfSize, y: centerY - defaultHalfSize },
          { x: centerX + defaultHalfSize, y: centerY - defaultHalfSize },
          { x: centerX + defaultHalfSize, y: centerY + defaultHalfSize },
          { x: centerX - defaultHalfSize, y: centerY + defaultHalfSize },
          { x: centerX - defaultHalfSize, y: centerY - defaultHalfSize },
        ];
        break;
    }
    
    get().addElement({
      type: 'path',
      data: {
        points,
        strokeWidth,
        strokeColor,
        opacity,
      },
    });
    
    // Auto-switch to select mode after creating shape
    get().setActivePlugin('select');
  },
}));