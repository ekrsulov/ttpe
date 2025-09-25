import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { temporal } from 'zundo';
import { textToPathCommands } from '../utils/textVectorizationUtils';

import { extractSubpaths, createSquareCommands, createRectangleCommands, createCircleCommands, createTriangleCommands } from '../utils/pathParserUtils';
import type { Point, Command } from '../types';
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
import { createTransformationPluginSlice, type TransformationPluginSlice } from './slices/plugins/transformationPluginSlice';
import { createEditPluginSlice, type EditPluginSlice } from './slices/plugins/editPluginSlice';
import { createSubpathPluginSlice, type SubpathPluginSlice } from './slices/plugins/subpathPluginSlice';
import { createOpticalAlignmentSlice, type OpticalAlignmentSlice } from './slices/plugins/opticalAlignmentSlice';

// Debounce function to implement cool-off period
function debounce<T extends (...args: never[]) => void>(
  func: T,
  delay: number
): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

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
export type CanvasStore = BaseSlice &
  ViewportSlice &
  SelectionSlice &
  OrderSlice &
  ArrangeSlice &
  PencilPluginSlice &
  TextPluginSlice &
  ShapePluginSlice &
  TransformationPluginSlice &
  EditPluginSlice &
  SubpathPluginSlice &
  OpticalAlignmentSlice & {
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

        // Transformation plugin slice
        ...createTransformationPluginSlice(set, get, api),

        // Edit plugin slice
        ...createEditPluginSlice(set, get, api),

        // Subpath plugin slice
        ...createSubpathPluginSlice(set, get, api),

        // Optical alignment slice
        ...createOpticalAlignmentSlice(set, get, api),

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
            get().updateElement(lastElement.id, {
              data: {
                ...pathData,
                subPaths: [...pathData.subPaths, [{ type: 'M', position: point }]]
              },
            });
          } else {
            // Create new path
            get().addElement({
              type: 'path',
              data: {
                subPaths: [[{ type: 'M', position: point }]],
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
            const commands = pathData.subPaths.flat();
            if (commands.length > 0) {
              const lastCommand = commands[commands.length - 1];
              if (lastCommand.type !== 'Z') {
                let lastPoint: Point;
                if (lastCommand.type === 'M' || lastCommand.type === 'L') {
                  lastPoint = lastCommand.position;
                } else if (lastCommand.type === 'C') {
                  lastPoint = lastCommand.position;
                } else {
                  lastPoint = { x: 0, y: 0 }; // fallback
                }

                // Check minimum step distance (like in the provided code)
                const minStep = 1.25;
                const distance = Math.sqrt((point.x - lastPoint.x) ** 2 + (point.y - lastPoint.y) ** 2);
                if (distance < minStep) {
                  return; // Don't add point if too close
                }
              }
            }

            // Update subPaths by adding L command to the last subpath
            const lastSubpathIndex = pathData.subPaths.length - 1;
            const updatedSubPaths = [...pathData.subPaths];
            updatedSubPaths[lastSubpathIndex] = [...updatedSubPaths[lastSubpathIndex], { type: 'L', position: point }];
            get().updateElement(pencilPathElement.id, {
              data: {
                ...pathData,
                subPaths: updatedSubPaths
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
            // Convert text to path commands directly without string parsing
            const commands = await textToPathCommands(
              text,
              x,
              y,
              fontSize,
              fontFamily,
              fontWeight,
              fontStyle
            );

            if (commands.length > 0) {
              // Extract subpaths directly from commands
              const subPaths = extractSubpaths(commands);

              // Create path element with the converted text
              get().addElement({
                type: 'path',
                data: {
                  subPaths: subPaths.map(sp => sp.commands),
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
            elements: state.elements.filter((el) => !selectedIds.includes(el.id)),
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

          let commands: Command[] = [];

          switch (selectedShape) {
            case 'square': {
              // Create a square using path commands
              const halfSize = Math.min(width, height) / 2;
              commands = createSquareCommands(centerX, centerY, halfSize);
              break;
            }

            case 'rectangle': {
              // Create a rectangle using path commands
              commands = createRectangleCommands(startPoint.x, startPoint.y, endPoint.x, endPoint.y);
              break;
            }

            case 'circle': {
              // Create a circle using C commands (Bézier curves)
              const radius = Math.min(width, height) / 2;
              commands = createCircleCommands(centerX, centerY, radius);
              break;
            }

            case 'triangle': {
              // Create a triangle using path commands
              commands = createTriangleCommands(centerX, startPoint.y, endPoint.x, endPoint.y, startPoint.x);
              break;
            }

            default: {
              // Default to square if unknown shape
              const defaultHalfSize = Math.min(width, height) / 2;
              commands = createSquareCommands(centerX, centerY, defaultHalfSize);
              break;
            }
          }

          // Extract subpaths directly from generated commands
          const parsedSubPaths = extractSubpaths(commands);

          get().addElement({
            type: 'path',
            data: {
              subPaths: parsedSubPaths.map(sp => sp.commands),
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
    partialize: (state: CanvasStore) => {
      const { ...rest } = state;
      return rest;
    }
  }
  )
);
