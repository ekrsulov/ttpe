import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { temporal } from 'zundo';
import { textToPath } from '../utils/textVectorizationUtils';
import { formatToPrecision, PATH_DECIMAL_PRECISION } from '../utils';
import { parsePathD } from '../utils/pathParserUtils';
import type { Point } from '../types';
import isDeepEqual from 'fast-deep-equal';

// Import all slices
import { createBaseSlice, type BaseSlice } from './slices/baseSlice';
import { createViewportSlice, type ViewportSlice } from './slices/features/viewportSlice';
import { createSelectionSlice, type SelectionSlice } from './slices/features/selectionSlice';
import { createOrderSlice, type OrderSlice } from './slices/features/orderSlice';
import { createArrangeSlice, type ArrangeSlice } from './slices/features/arrangeSlice';
import { createPencilPluginSlice, type PencilPluginSlice } from './slices/plugins/pencilPluginSlice';
import { createTextPluginSlice, type TextPluginSlice } from './slices/plugins/textPluginSlice';
import { createShapePluginSlice, type ShapePluginSlice } from './slices/plugins/shapePluginSlice';
import { createHistoryPluginSlice, type HistoryPluginSlice } from './slices/plugins/historyPluginSlice';
import { createTransformationPluginSlice, type TransformationPluginSlice } from './slices/plugins/transformationPluginSlice';
import { createEditorPluginSlice, type EditorPluginSlice } from './slices/plugins/editorPluginSlice';
import { createEditPluginSlice, type EditPluginSlice } from './slices/plugins/editPluginSlice';
import { createSubpathPluginSlice, type SubpathPluginSlice } from './slices/plugins/subpathPluginSlice';

// Debounce function to implement cool-off period
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T {
  let timeoutId: number | null = null;

  return ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  }) as T;
}

// Combine all slice types
type CanvasStore = BaseSlice &
  ViewportSlice &
  SelectionSlice &
  OrderSlice &
  ArrangeSlice &
  PencilPluginSlice &
  TextPluginSlice &
  ShapePluginSlice &
  HistoryPluginSlice &
  TransformationPluginSlice &
  EditorPluginSlice &
  EditPluginSlice &
  SubpathPluginSlice & {
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
  persist(

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

        // Pencil plugin slice
        ...createPencilPluginSlice(set, get, api),

        // Text plugin slice
        ...createTextPluginSlice(set, get, api),

        // Shape plugin slice
        ...createShapePluginSlice(set, get, api),

        // History plugin slice
        ...createHistoryPluginSlice(set, get, api),

        // Transformation plugin slice
        ...createTransformationPluginSlice(set, get, api),

        // Editor plugin slice
        ...createEditorPluginSlice(set, get, api),

        // Edit plugin slice
        ...createEditPluginSlice(set, get, api),

        // Subpath plugin slice
        ...createSubpathPluginSlice(set, get, api),

        // Cross-slice actions
        startPath: (point) => {
          const { strokeWidth, strokeColor, strokeOpacity, reusePath } = get().pencil;
          // For pencil paths, if strokeColor is 'none', use black instead
          const effectiveStrokeColor = strokeColor === 'none' ? '#000000' : strokeColor;
          
          // Check if we should reuse an existing pencil path
          const lastElement = get().elements[get().elements.length - 1];
          const hasExistingPencilPath = lastElement?.type === 'path' && 
            (lastElement.data as import('../types').PathData).isPencilPath === true;
          
          if (reusePath && hasExistingPencilPath) {
            // Reuse existing path - add the starting point as a new subpath
            const pathData = lastElement.data as import('../types').PathData;
            const newD = `${pathData.d} M ${formatToPrecision(point.x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(point.y, PATH_DECIMAL_PRECISION)}`;
            get().updateElement(lastElement.id, {
              data: {
                ...pathData,
                d: newD,
              },
            });
          } else {
            // Create new path
            get().addElement({
              type: 'path',
              data: {
                d: `M ${formatToPrecision(point.x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(point.y, PATH_DECIMAL_PRECISION)}`,
                strokeWidth,
                strokeColor: effectiveStrokeColor,
                strokeOpacity,
                fillColor: 'none',  // Always no fill for pencil strokes
                fillOpacity: 1,     // Always 100% fill opacity for pencil strokes
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                isPencilPath: true, // Mark this as a pencil-created path
              },
            });
          }
        },

        addPointToPath: (point) => {
          const state = get();
          // Find the last pencil path element
          const pencilPathElement = [...state.elements].reverse().find(
            el => el.type === 'path' && (el.data as import('../types').PathData).isPencilPath === true
          );
          
          if (pencilPathElement) {
            const pathData = pencilPathElement.data as import('../types').PathData;
            
            // Parse the current path to get the last point
            const commands = parsePathD(pathData.d);
            if (commands.length > 0) {
              const lastCommand = commands[commands.length - 1];
              if (lastCommand.points.length > 0) {
                const lastPoint = lastCommand.points[lastCommand.points.length - 1];
                
                // Check minimum step distance (like in the provided code)
                const minStep = 1.25;
                const distance = Math.sqrt((point.x - lastPoint.x) ** 2 + (point.y - lastPoint.y) ** 2);
                if (distance < minStep) {
                  return; // Don't add point if too close
                }
              }
            }
            
            const newD = `${pathData.d} L ${formatToPrecision(point.x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(point.y, PATH_DECIMAL_PRECISION)}`;
            get().updateElement(pencilPathElement.id, {
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
          const { fontSize, fontFamily, fontWeight, fontStyle } = get().text;
          const { fillColor, fillOpacity, strokeColor, strokeWidth, strokeOpacity } = get().pencil;

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
                  strokeWidth,
                  strokeColor,
                  strokeOpacity,
                  fillColor,
                  fillOpacity,
                  strokeLinecap: 'round',
                  strokeLinejoin: 'round',
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
          const { strokeWidth, strokeColor, strokeOpacity, fillColor, fillOpacity } = get().pencil;
          const selectedShape = get().shape.selectedShape;

          // Calculate shape dimensions
          const width = Math.abs(endPoint.x - startPoint.x);
          const height = Math.abs(endPoint.y - startPoint.y);
          const centerX = (startPoint.x + endPoint.x) / 2;
          const centerY = (startPoint.y + endPoint.y) / 2;

          let d = '';

          switch (selectedShape) {
            case 'square': {
              // Create a square using path commands
              const halfSize = Math.min(width, height) / 2;
              d = `M ${formatToPrecision(centerX - halfSize, PATH_DECIMAL_PRECISION)} ${formatToPrecision(centerY - halfSize, PATH_DECIMAL_PRECISION)} L ${formatToPrecision(centerX + halfSize, PATH_DECIMAL_PRECISION)} ${formatToPrecision(centerY - halfSize, PATH_DECIMAL_PRECISION)} L ${formatToPrecision(centerX + halfSize, PATH_DECIMAL_PRECISION)} ${formatToPrecision(centerY + halfSize, PATH_DECIMAL_PRECISION)} L ${formatToPrecision(centerX - halfSize, PATH_DECIMAL_PRECISION)} ${formatToPrecision(centerY + halfSize, PATH_DECIMAL_PRECISION)} Z`;
              break;
            }

            case 'rectangle': {
              // Create a rectangle using path commands
              d = `M ${formatToPrecision(startPoint.x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(startPoint.y, PATH_DECIMAL_PRECISION)} L ${formatToPrecision(endPoint.x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(startPoint.y, PATH_DECIMAL_PRECISION)} L ${formatToPrecision(endPoint.x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(endPoint.y, PATH_DECIMAL_PRECISION)} L ${formatToPrecision(startPoint.x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(endPoint.y, PATH_DECIMAL_PRECISION)} Z`;
              break;
            }

            case 'circle': {
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

              d = `M ${formatToPrecision(centerX - radius, PATH_DECIMAL_PRECISION)} ${formatToPrecision(centerY, PATH_DECIMAL_PRECISION)} C ${formatToPrecision(cx1, PATH_DECIMAL_PRECISION)} ${formatToPrecision(cy1, PATH_DECIMAL_PRECISION)}, ${formatToPrecision(cx2, PATH_DECIMAL_PRECISION)} ${formatToPrecision(cy2, PATH_DECIMAL_PRECISION)}, ${formatToPrecision(centerX, PATH_DECIMAL_PRECISION)} ${formatToPrecision(centerY - radius, PATH_DECIMAL_PRECISION)} C ${formatToPrecision(cx3, PATH_DECIMAL_PRECISION)} ${formatToPrecision(cy3, PATH_DECIMAL_PRECISION)}, ${formatToPrecision(cx4, PATH_DECIMAL_PRECISION)} ${formatToPrecision(cy4, PATH_DECIMAL_PRECISION)}, ${formatToPrecision(centerX + radius, PATH_DECIMAL_PRECISION)} ${formatToPrecision(centerY, PATH_DECIMAL_PRECISION)} C ${formatToPrecision(cx5, PATH_DECIMAL_PRECISION)} ${formatToPrecision(cy5, PATH_DECIMAL_PRECISION)}, ${formatToPrecision(cx6, PATH_DECIMAL_PRECISION)} ${formatToPrecision(cy6, PATH_DECIMAL_PRECISION)}, ${formatToPrecision(centerX, PATH_DECIMAL_PRECISION)} ${formatToPrecision(centerY + radius, PATH_DECIMAL_PRECISION)} C ${formatToPrecision(cx7, PATH_DECIMAL_PRECISION)} ${formatToPrecision(cy7, PATH_DECIMAL_PRECISION)}, ${formatToPrecision(cx8, PATH_DECIMAL_PRECISION)} ${formatToPrecision(cy8, PATH_DECIMAL_PRECISION)}, ${formatToPrecision(centerX - radius, PATH_DECIMAL_PRECISION)} ${formatToPrecision(centerY, PATH_DECIMAL_PRECISION)} Z`;
              break;
            }

            case 'triangle': {
              // Create a triangle using path commands
              d = `M ${formatToPrecision(centerX, PATH_DECIMAL_PRECISION)} ${formatToPrecision(startPoint.y, PATH_DECIMAL_PRECISION)} L ${formatToPrecision(endPoint.x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(endPoint.y, PATH_DECIMAL_PRECISION)} L ${formatToPrecision(startPoint.x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(endPoint.y, PATH_DECIMAL_PRECISION)} Z`;
              break;
            }

            default: {
              // Default to square if unknown shape
              const defaultHalfSize = Math.min(width, height) / 2;
              d = `M ${formatToPrecision(centerX - defaultHalfSize, PATH_DECIMAL_PRECISION)} ${formatToPrecision(centerY - defaultHalfSize, PATH_DECIMAL_PRECISION)} L ${formatToPrecision(centerX + defaultHalfSize, PATH_DECIMAL_PRECISION)} ${formatToPrecision(centerY - defaultHalfSize, PATH_DECIMAL_PRECISION)} L ${formatToPrecision(centerX + defaultHalfSize, PATH_DECIMAL_PRECISION)} ${formatToPrecision(centerY + defaultHalfSize, PATH_DECIMAL_PRECISION)} L ${formatToPrecision(centerX - defaultHalfSize, PATH_DECIMAL_PRECISION)} ${formatToPrecision(centerY + defaultHalfSize, PATH_DECIMAL_PRECISION)} Z`;
              break;
            }
          }

          get().addElement({
            type: 'path',
            data: {
              d,
              strokeWidth,
              strokeColor,
              strokeOpacity,
              fillColor,
              fillOpacity,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
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
        }),
        equality: (pastState, currentState) => isDeepEqual(pastState, currentState),
        // Cool-off period: debounce state changes to prevent too many history entries
        // during rapid events like drawing or moving
        handleSet: (handleSet) =>
          debounce<typeof handleSet>((state) => {
            handleSet(state);
          }, 100), // 100ms cool-off period
      }
    ), { 
      name: 'canvas-app-state',
      partialize: (state: any) => {
        const { ...rest } = state;
        return rest;
      }
    }
  )
);
