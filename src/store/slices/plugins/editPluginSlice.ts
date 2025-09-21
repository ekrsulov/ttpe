import type { StateCreator } from 'zustand';
import { parsePathD, extractEditablePoints, updatePathD, normalizePathCommands, extractSubpaths, simplifyPoints, findPairedControlPoint, determineControlPointAlignment, type PathCommand } from '../../../utils/pathParserUtils';
import { formatToPrecision, PATH_DECIMAL_PRECISION } from '../../../utils';
import type { CanvasElement, PathData, Point } from '../../../types';
import type { CanvasStore } from '../../canvasStore';

// Type for the full store state (needed for get() calls)
type FullCanvasState = CanvasStore;

type SelectedCommand = EditPluginSlice['selectedCommands'][0];

export interface EditPluginSlice {
  // State
  editingPoint: { 
    elementId: string; 
    commandIndex: number; 
    pointIndex: number;
    isDragging: boolean;
    offsetX: number;
    offsetY: number;
  } | null;
  selectedCommands: Array<{
    elementId: string;
    commandIndex: number;
    pointIndex: number;
  }>;
  draggingSelection: {
    isDragging: boolean;
    draggedPoint: { elementId: string; commandIndex: number; pointIndex: number } | null;
    initialPositions: Array<{
      elementId: string;
      commandIndex: number;
      pointIndex: number;
      x: number;
      y: number;
    }>;
    startX: number;
    startY: number;
    currentX?: number;
    currentY?: number;
    deltaX?: number;
    deltaY?: number;
  } | null;
  smoothBrush: {
    radius: number;
    strength: number;
    isActive: boolean;
    cursorX: number;
    cursorY: number;
    simplifyPoints: boolean;
    simplificationTolerance: number;
    minDistance: number;
    affectedPoints: Array<{
      commandIndex: number;
      pointIndex: number;
      x: number;
      y: number;
    }>;
  };
  controlPointAlignment: {
    enabled: boolean;
    controlPoints: Record<string, import('../../../types').ControlPointInfo>;
  };

  // Actions
  setEditingPoint: (point: { elementId: string; commandIndex: number; pointIndex: number } | null) => void;
  startDraggingPoint: (elementId: string, commandIndex: number, pointIndex: number, offsetX: number, offsetY: number) => void;
  updateDraggingPoint: (x: number, y: number) => void;
  stopDraggingPoint: () => void;
  emergencyCleanupDrag: () => void;
  selectCommand: (command: { elementId: string; commandIndex: number; pointIndex: number }, multiSelect?: boolean) => void;
  getPointsInRange: (elementId: string, startCommandIndex: number, startPointIndex: number, endCommandIndex: number, endPointIndex: number) => Array<{ elementId: string; commandIndex: number; pointIndex: number }>;
  clearSelectedCommands: () => void;
  deleteSelectedCommands: () => void;
  deleteZCommandForMPoint: (elementId: string, commandIndex: number) => void;
  moveToM: (elementId: string, commandIndex: number, pointIndex: number) => void;
  convertCommandType: (elementId: string, commandIndex: number) => void;
  alignLeftCommands: () => void;
  alignCenterCommands: () => void;
  alignRightCommands: () => void;
  alignTopCommands: () => void;
  alignMiddleCommands: () => void;
  alignBottomCommands: () => void;
  distributeHorizontallyCommands: () => void;
  distributeVerticallyCommands: () => void;
  isWorkingWithSubpaths: () => boolean;
  getFilteredEditablePoints: (elementId: string) => Array<{
    commandIndex: number;
    pointIndex: number;
    x: number;
    y: number;
    isControl: boolean;
  }>;
  updateSmoothBrush: (brush: Partial<EditPluginSlice['smoothBrush']>) => void;
  applySmoothBrush: (centerX?: number, centerY?: number) => void;
  activateSmoothBrush: () => void;
  deactivateSmoothBrush: () => void;
  updateSmoothBrushCursor: (x: number, y: number) => void;
  updateControlPointAlignment: (elementId: string, commandIndex: number, pointIndex: number) => void;
  getControlPointInfo: (elementId: string, commandIndex: number, pointIndex: number) => import('../../../types').ControlPointInfo | null;
  setControlPointAlignmentType: (elementId: string, commandIndex1: number, pointIndex1: number, commandIndex2: number, pointIndex2: number, type: import('../../../types').ControlPointType) => void;
  applyControlPointAlignment: (elementId: string, commandIndex: number, pointIndex: number, newX: number, newY: number) => void;
  finalizePointMove: (elementId: string, commandIndex: number, pointIndex: number, newX: number, newY: number) => void;
}

export const createEditPluginSlice: StateCreator<EditPluginSlice, [], [], EditPluginSlice> = (set, get) => ({
  // Initial state
  editingPoint: null,
  selectedCommands: [],
  draggingSelection: null,
  smoothBrush: {
    radius: 18,
    strength: 0.35,
    isActive: false,
    cursorX: 0,
    cursorY: 0,
    simplifyPoints: false,
    simplificationTolerance: 0.3,
    minDistance: 0.5,
    affectedPoints: [],
  },
  controlPointAlignment: {
    enabled: true,
    controlPoints: {}, // Cambiar de Map a objeto plano
  },

  // Actions
  setEditingPoint: (point) => {
    set({ editingPoint: point ? { ...point, isDragging: false, offsetX: 0, offsetY: 0 } : null });
  },

  startDraggingPoint: (elementId, commandIndex, pointIndex, offsetX, offsetY) => {
    const state = get() as FullCanvasState;
    
    // Check if the point being dragged is in the selection
    const isSelected = state.selectedCommands.some((cmd) => 
      cmd.elementId === elementId && 
      cmd.commandIndex === commandIndex && 
      cmd.pointIndex === pointIndex
    );
    
    // If the point is not selected, select it first (single selection)
    if (!isSelected) {
      set({ selectedCommands: [{ elementId, commandIndex, pointIndex }] });
    }
    
    // Now determine the drag type based on current selection
    const currentState = get() as FullCanvasState;
    const currentIsSelected = currentState.selectedCommands.some((cmd) => 
      cmd.elementId === elementId && 
      cmd.commandIndex === commandIndex && 
      cmd.pointIndex === pointIndex
    );
    
    if (currentIsSelected && currentState.selectedCommands.length > 1) {
      // Multiple points selected - prepare for group drag
      const initialPositions: Array<{
        elementId: string;
        commandIndex: number;
        pointIndex: number;
        x: number;
        y: number;
      }> = [];
      
      // Get initial positions of all selected points
      currentState.selectedCommands.forEach((cmd) => {
        const element = state.elements.find((el) => el.id === cmd.elementId);
        if (element && element.type === 'path') {
          const pathData = element.data as PathData;
          const commands = parsePathD(pathData.d);
          const points = extractEditablePoints(commands);
          
          const point = points.find(p => 
            p.commandIndex === cmd.commandIndex && 
            p.pointIndex === cmd.pointIndex
          );
          
          if (point) {
            initialPositions.push({
              elementId: cmd.elementId,
              commandIndex: cmd.commandIndex,
              pointIndex: cmd.pointIndex,
              x: point.x,
              y: point.y
            });
          }
        }
      });
      
      set({ 
        draggingSelection: {
          isDragging: true,
          draggedPoint: { elementId, commandIndex, pointIndex },
          initialPositions,
          startX: offsetX,
          startY: offsetY
        }
      });
    } else {
      // Single point drag
      set({ 
        editingPoint: { 
          elementId, 
          commandIndex, 
          pointIndex, 
          isDragging: true, 
          offsetX, 
          offsetY 
        },
        draggingSelection: null
      });
    }
  },

  updateDraggingPoint: (x, y) => {
    const state = get() as FullCanvasState;
    
    if (state.draggingSelection?.isDragging) {
      // Handle group drag of selected points - but don't update path data here anymore
      // The path updates will be handled directly in the renderer for real-time feedback
      const deltaX = x - state.draggingSelection.startX;
      const deltaY = y - state.draggingSelection.startY;
      
      // Just update the dragging selection state for tracking
      set((currentState) => ({
        draggingSelection: currentState.draggingSelection ? {
          ...currentState.draggingSelection,
          currentX: x,
          currentY: y,
          deltaX,
          deltaY
        } : null
      }));
    } else if (state.editingPoint && state.editingPoint.isDragging) {
      // Handle single point drag - also handled in renderer now
      set((currentState) => ({
        editingPoint: {
          ...currentState.editingPoint!,
          offsetX: x,
          offsetY: y
        }
      }));
    }
  },

  stopDraggingPoint: () => {
    set((state) => {
      // Emergency cleanup - ensure all drag states are cleared
      return {
        ...state,
        editingPoint: state.editingPoint ? {
          ...state.editingPoint,
          isDragging: false
        } : null,
        draggingSelection: null
      };
    });
  },

  // Emergency cleanup method
  emergencyCleanupDrag: () => {
    set((state) => ({
      ...state,
      editingPoint: null,
      draggingSelection: null
    }));
  },

  // Helper function to get points between two points in the same subpath
  getPointsInRange: (elementId: string, startCommandIndex: number, startPointIndex: number, endCommandIndex: number, endPointIndex: number) => {
    const state = get() as FullCanvasState;
    const element = state.elements.find(el => el.id === elementId);
    if (!element || element.type !== 'path') return [];

    const pathData = element.data as PathData;
    const commands = parsePathD(pathData.d);
    const subpaths = extractSubpaths(commands);
    
    // Find which subpath the start point belongs to
    let startSubpathIndex = -1;
    for (let i = 0; i < subpaths.length; i++) {
      const subpath = subpaths[i];
      if (startCommandIndex >= subpath.startIndex && startCommandIndex <= subpath.endIndex) {
        startSubpathIndex = i;
        break;
      }
    }
    
    // Find which subpath the end point belongs to
    let endSubpathIndex = -1;
    for (let i = 0; i < subpaths.length; i++) {
      const subpath = subpaths[i];
      if (endCommandIndex >= subpath.startIndex && endCommandIndex <= subpath.endIndex) {
        endSubpathIndex = i;
        break;
      }
    }
    
    // Only select range if both points are in the same subpath
    if (startSubpathIndex !== endSubpathIndex || startSubpathIndex === -1) return [];
    
    const subpath = subpaths[startSubpathIndex];
    const subpathCommands = commands.slice(subpath.startIndex, subpath.endIndex + 1);
    const allPoints = extractEditablePoints(subpathCommands);
    
    // Adjust command indices to be relative to the full path
    const adjustedPoints = allPoints.map(p => ({
      ...p,
      commandIndex: p.commandIndex + subpath.startIndex
    }));
    
    // Find indices in the subpath's point array
    const startPointGlobalIndex = adjustedPoints.findIndex(p => 
      p.commandIndex === startCommandIndex && p.pointIndex === startPointIndex
    );
    const endPointGlobalIndex = adjustedPoints.findIndex(p => 
      p.commandIndex === endCommandIndex && p.pointIndex === endPointIndex
    );
    
    if (startPointGlobalIndex === -1 || endPointGlobalIndex === -1) return [];
    
    // Get all points between the two indices (inclusive)
    const minIndex = Math.min(startPointGlobalIndex, endPointGlobalIndex);
    const maxIndex = Math.max(startPointGlobalIndex, endPointGlobalIndex);
    
    const pointsInRange = adjustedPoints.slice(minIndex, maxIndex + 1);
    
    return pointsInRange.map(p => ({
      elementId,
      commandIndex: p.commandIndex,
      pointIndex: p.pointIndex
    }));
  },

  selectCommand: (command, multiSelect = false) => {
    set((state) => {
      const isAlreadySelected = state.selectedCommands.some(
        (c) => c.elementId === command.elementId && 
               c.commandIndex === command.commandIndex && 
               c.pointIndex === command.pointIndex
      );
      
      let newSelectedCommands;
      if (multiSelect) {
        if (isAlreadySelected) {
          newSelectedCommands = state.selectedCommands.filter(
            (c) => !(c.elementId === command.elementId && 
                     c.commandIndex === command.commandIndex && 
                     c.pointIndex === command.pointIndex)
          );
        } else {
          // Check if there's already a selection in the same element for range selection
          const existingSelectionInElement = state.selectedCommands.filter(
            (c) => c.elementId === command.elementId
          );
          
          if (existingSelectionInElement.length === 1) {
            // Do range selection: select all points between the existing selection and new point
            const existingCmd = existingSelectionInElement[0];
            const pointsInRange = get().getPointsInRange(
              command.elementId,
              existingCmd.commandIndex,
              existingCmd.pointIndex,
              command.commandIndex,
              command.pointIndex
            );
            
            newSelectedCommands = [...state.selectedCommands, ...pointsInRange];
          } else {
            // Multiple or no existing selection in element, just add the single command
            newSelectedCommands = [...state.selectedCommands, command];
          }
        }
      } else {
        newSelectedCommands = isAlreadySelected ? [] : [command];
      }

      return {
        selectedCommands: newSelectedCommands
      };
    });

    // Update control point alignment info for selected commands immediately
    const currentState = get() as FullCanvasState;
    currentState.selectedCommands.forEach(cmd => {
      currentState.updateControlPointAlignment(cmd.elementId, cmd.commandIndex, cmd.pointIndex);
    });

    // Set active plugin to 'edit' when selecting commands
    if (currentState.activePlugin !== 'edit') {
      currentState.setActivePlugin('edit');
    }
  },

  clearSelectedCommands: () => {
    set({ selectedCommands: [] });
  },

  deleteSelectedCommands: () => {
    const state = get() as FullCanvasState;
    const selectedCommands = state.selectedCommands;

    if (selectedCommands.length === 0) return;

    // Group commands by elementId
    const commandsByElement = (selectedCommands as SelectedCommand[]).reduce((acc: Record<string, SelectedCommand[]>, cmd: SelectedCommand) => {
      if (!acc[cmd.elementId]) acc[cmd.elementId] = [];
      acc[cmd.elementId].push(cmd);
      return acc;
    }, {} as Record<string, SelectedCommand[]>);

    // Process each element
    (Object.entries(commandsByElement) as [string, SelectedCommand[]][]).forEach(([elementId, commands]) => {
      const element = state.elements.find((el: CanvasElement) => el.id === elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as PathData;
        const parsedCommands = parsePathD(pathData.d);
        const allPoints = extractEditablePoints(parsedCommands);

        // Find selected points
        const selectedPoints = allPoints.filter((point) =>
          commands.some((cmd) =>
            cmd.commandIndex === point.commandIndex &&
            cmd.pointIndex === point.pointIndex
          )
        );

        if (selectedPoints.length > 0) {
          // Sort selected points by command index and point index (process in reverse order to maintain indices)
          const sortedSelectedPoints = selectedPoints.sort((a, b) => {
            if (a.commandIndex !== b.commandIndex) return b.commandIndex - a.commandIndex;
            return b.pointIndex - a.pointIndex;
          });

          let updatedCommands = [...parsedCommands];

          // Process each selected point for deletion
          sortedSelectedPoints.forEach(selectedPoint => {
            const cmdIndex = selectedPoint.commandIndex;
            const pointIndex = selectedPoint.pointIndex;
            const command = updatedCommands[cmdIndex];

            if (!command) return;

            // Handle different command types
            if (command.type === 'M') {
              // For M commands, we need special handling
              if (cmdIndex < updatedCommands.length - 1) {
                // Find the next non-Z command to convert to M
                let nextNonZIndex = cmdIndex + 1;
                while (nextNonZIndex < updatedCommands.length && updatedCommands[nextNonZIndex]?.type === 'Z') {
                  nextNonZIndex++;
                }

                if (nextNonZIndex < updatedCommands.length) {
                  const nextCommand = updatedCommands[nextNonZIndex];
                  if (nextCommand.type === 'C' && nextCommand.points.length >= 3) {
                    // For C commands, convert to M using only the end point (last point)
                    updatedCommands[nextNonZIndex] = {
                      type: 'M' as const,
                      points: [nextCommand.points[nextCommand.points.length - 1]] // Keep only the end point
                    };
                  } else {
                    // For other commands, convert to M normally
                    updatedCommands[nextNonZIndex] = {
                      ...nextCommand,
                      type: 'M' as const
                    };
                  }
                }
              }
              // Remove the M command
              updatedCommands.splice(cmdIndex, 1);
            } else if (command.type === 'L') {
              // For L commands, remove the entire command
              updatedCommands.splice(cmdIndex, 1);
            } else if (command.type === 'C') {
              // For C commands, handle control points
              if (pointIndex === 0 || pointIndex === 1) {
                // Remove control points, convert to L command
                updatedCommands[cmdIndex] = {
                  type: 'L' as const,
                  points: [command.points[2]] // Keep only the end point
                };
              } else if (pointIndex === 2) {
                // Remove end point, remove the entire command
                updatedCommands.splice(cmdIndex, 1);
              }
            } else if (command.type === 'Z') {
              // Can't delete Z command directly, but if it's the only command left, handle it
              if (updatedCommands.length === 1) {
                // If only Z is left, we'll handle this below
              }
            }
          });

          // Filter out any null commands and clean up
          updatedCommands = updatedCommands.filter(cmd => cmd !== null);

          // Normalize the commands to remove duplicates and clean up
          const normalizedCommands = normalizePathCommands(updatedCommands);

          // Check if the path is now empty after normalization
          if (normalizedCommands.length === 0) {
            // Delete the entire element
            (set as (fn: (state: FullCanvasState) => Partial<FullCanvasState>) => void)((currentState) => ({
              ...currentState,
              elements: currentState.elements.filter((el) => el.id !== elementId)
            }));
            return;
          }

          // Reconstruct path string from normalized commands
          const newPathD = normalizedCommands.map(cmd => {
            if (cmd.type === 'Z') return 'Z';

            const pointStr = cmd.points.map(p => `${formatToPrecision(p.x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(p.y, PATH_DECIMAL_PRECISION)}`).join(' ');
            return `${cmd.type} ${pointStr}`;
          }).join(' ');

          // Update the element with the new path
          (set as (fn: (state: FullCanvasState) => Partial<FullCanvasState>) => void)((currentState) => ({
            ...currentState,
            elements: currentState.elements.map((el) =>
              el.id === elementId
                ? { ...el, data: { ...pathData, d: newPathD } }
                : el
            )
          }));

        }
      }
    });

    // Clear selection after processing
    set({ selectedCommands: [] });
  },

  alignLeftCommands: () => {
    const state = get() as FullCanvasState;
    const selectedCommands = state.selectedCommands;
    
    if (selectedCommands.length < 2) return;
    
    // Group commands by elementId
    const commandsByElement = selectedCommands.reduce((acc: Record<string, SelectedCommand[]>, cmd: SelectedCommand) => {
      if (!acc[cmd.elementId]) acc[cmd.elementId] = [];
      acc[cmd.elementId].push(cmd);
      return acc;
    }, {} as Record<string, SelectedCommand[]>);
    
    // Process each element
    Object.entries(commandsByElement).forEach(([elementId, commands]) => {
      const element = state.elements.find((el: CanvasElement) => el.id === elementId);
      if (element && element.type === 'path' && commands.length >= 2) {
        const pathData = element.data as PathData;
        const parsedCommands = parsePathD(pathData.d);
        const allPoints = extractEditablePoints(parsedCommands);
        
        // Find selected points
        const selectedPoints = allPoints.filter((point) => 
          (commands).some((cmd) => 
            cmd.commandIndex === point.commandIndex && 
            cmd.pointIndex === point.pointIndex
          )
        );
        
        if (selectedPoints.length >= 2) {
          // Find the leftmost point
          const minX = Math.min(...selectedPoints.map(p => p.x));
          
          // Move all selected points to align with the leftmost
          const updatedPoints = selectedPoints.map(point => ({
            ...point,
            x: minX
          }));
          
          // Update the path
          const newPathD = updatePathD(parsedCommands, updatedPoints);
          const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
          setStore((currentState) => ({
            elements: currentState.elements.map((el) =>
              el.id === elementId 
                ? { ...el, data: { ...pathData, d: newPathD } }
                : el
            )
          }));
        }
      }
    });
  },

  alignCenterCommands: () => {
    const state = get() as FullCanvasState;
    const selectedCommands = state.selectedCommands;
    
    if (selectedCommands.length < 2) return;
    
    // Group commands by elementId
    const commandsByElement = selectedCommands.reduce((acc: Record<string, typeof cmd[]>, cmd) => {
      if (!acc[cmd.elementId]) acc[cmd.elementId] = [];
      acc[cmd.elementId].push(cmd);
      return acc;
    }, {} as Record<string, typeof selectedCommands>);
    
    // Process each element
    Object.entries(commandsByElement).forEach(([elementId, commands]) => {
      const element = state.elements.find((el) => el.id === elementId);
      if (element && element.type === 'path' && (commands).length >= 2) {
        const pathData = element.data as PathData;
        const parsedCommands = parsePathD(pathData.d);
        const allPoints = extractEditablePoints(parsedCommands);
        
        // Find selected points
        const selectedPoints = allPoints.filter((point) => 
          (commands).some((cmd) => 
            cmd.commandIndex === point.commandIndex && 
            cmd.pointIndex === point.pointIndex
          )
        );
        
        if (selectedPoints.length >= 2) {
          // Calculate center X of all selected points
          const minX = Math.min(...selectedPoints.map(p => p.x));
          const maxX = Math.max(...selectedPoints.map(p => p.x));
          const centerX = (minX + maxX) / 2;
          
          // Move all selected points to align with the center
          const updatedPoints = selectedPoints.map(point => ({
            ...point,
            x: centerX
          }));
          
          // Update the path
          const newPathD = updatePathD(parsedCommands, updatedPoints);
          const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
          setStore((currentState) => ({
            elements: currentState.elements.map((el) =>
              el.id === elementId 
                ? { ...el, data: { ...pathData, d: newPathD } }
                : el
            )
          }));
        }
      }
    });
  },

  alignRightCommands: () => {
    const state = get() as FullCanvasState;
    const selectedCommands = state.selectedCommands;
    
    if (selectedCommands.length < 2) return;
    
    // Group commands by elementId
    const commandsByElement = selectedCommands.reduce((acc: Record<string, typeof cmd[]>, cmd) => {
      if (!acc[cmd.elementId]) acc[cmd.elementId] = [];
      acc[cmd.elementId].push(cmd);
      return acc;
    }, {} as Record<string, typeof selectedCommands>);
    
    // Process each element
    Object.entries(commandsByElement).forEach(([elementId, commands]) => {
      const element = state.elements.find((el) => el.id === elementId);
      if (element && element.type === 'path' && (commands).length >= 2) {
        const pathData = element.data as PathData;
        const parsedCommands = parsePathD(pathData.d);
        const allPoints = extractEditablePoints(parsedCommands);
        
        // Find selected points
        const selectedPoints = allPoints.filter((point) => 
          (commands).some((cmd) => 
            cmd.commandIndex === point.commandIndex && 
            cmd.pointIndex === point.pointIndex
          )
        );
        
        if (selectedPoints.length >= 2) {
          // Find the rightmost point
          const maxX = Math.max(...selectedPoints.map(p => p.x));
          
          // Move all selected points to align with the rightmost
          const updatedPoints = selectedPoints.map(point => ({
            ...point,
            x: maxX
          }));
          
          // Update the path
          const newPathD = updatePathD(parsedCommands, updatedPoints);
          const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
          setStore((currentState) => ({
            elements: currentState.elements.map((el) =>
              el.id === elementId 
                ? { ...el, data: { ...pathData, d: newPathD } }
                : el
            )
          }));
        }
      }
    });
  },

  alignTopCommands: () => {
    const state = get() as FullCanvasState;
    const selectedCommands = state.selectedCommands;
    
    if (selectedCommands.length < 2) return;
    
    // Group commands by elementId
    const commandsByElement = selectedCommands.reduce((acc: Record<string, typeof cmd[]>, cmd) => {
      if (!acc[cmd.elementId]) acc[cmd.elementId] = [];
      acc[cmd.elementId].push(cmd);
      return acc;
    }, {} as Record<string, typeof selectedCommands>);
    
    // Process each element
    Object.entries(commandsByElement).forEach(([elementId, commands]) => {
      const element = state.elements.find((el) => el.id === elementId);
      if (element && element.type === 'path' && (commands).length >= 2) {
        const pathData = element.data as PathData;
        const parsedCommands = parsePathD(pathData.d);
        const allPoints = extractEditablePoints(parsedCommands);
        
        // Find selected points
        const selectedPoints = allPoints.filter((point) => 
          (commands).some((cmd) => 
            cmd.commandIndex === point.commandIndex && 
            cmd.pointIndex === point.pointIndex
          )
        );
        
        if (selectedPoints.length >= 2) {
          // Find the topmost point
          const minY = Math.min(...selectedPoints.map(p => p.y));
          
          // Move all selected points to align with the topmost
          const updatedPoints = selectedPoints.map(point => ({
            ...point,
            y: minY
          }));
          
          // Update the path
          const newPathD = updatePathD(parsedCommands, updatedPoints);
          const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
          setStore((currentState) => ({
            elements: currentState.elements.map((el) =>
              el.id === elementId 
                ? { ...el, data: { ...pathData, d: newPathD } }
                : el
            )
          }));
        }
      }
    });
  },

  alignMiddleCommands: () => {
    const state = get() as FullCanvasState;
    const selectedCommands = state.selectedCommands;
    
    if (selectedCommands.length < 2) return;
    
    // Group commands by elementId
    const commandsByElement = selectedCommands.reduce((acc: Record<string, typeof cmd[]>, cmd) => {
      if (!acc[cmd.elementId]) acc[cmd.elementId] = [];
      acc[cmd.elementId].push(cmd);
      return acc;
    }, {} as Record<string, typeof selectedCommands>);
    
    // Process each element
    Object.entries(commandsByElement).forEach(([elementId, commands]) => {
      const element = state.elements.find((el) => el.id === elementId);
      if (element && element.type === 'path' && (commands).length >= 2) {
        const pathData = element.data as PathData;
        const parsedCommands = parsePathD(pathData.d);
        const allPoints = extractEditablePoints(parsedCommands);
        
        // Find selected points
        const selectedPoints = allPoints.filter((point) => 
          (commands).some((cmd) => 
            cmd.commandIndex === point.commandIndex && 
            cmd.pointIndex === point.pointIndex
          )
        );
        
        if (selectedPoints.length >= 2) {
          // Calculate center Y of all selected points
          const minY = Math.min(...selectedPoints.map(p => p.y));
          const maxY = Math.max(...selectedPoints.map(p => p.y));
          const centerY = (minY + maxY) / 2;
          
          // Move all selected points to align with the center
          const updatedPoints = selectedPoints.map(point => ({
            ...point,
            y: centerY
          }));
          
          // Update the path
          const newPathD = updatePathD(parsedCommands, updatedPoints);
          const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
          setStore((currentState) => ({
            elements: currentState.elements.map((el) =>
              el.id === elementId 
                ? { ...el, data: { ...pathData, d: newPathD } }
                : el
            )
          }));
        }
      }
    });
  },

  alignBottomCommands: () => {
    const state = get() as FullCanvasState;
    const selectedCommands = state.selectedCommands;
    
    if (selectedCommands.length < 2) return;
    
    // Group commands by elementId
    const commandsByElement = selectedCommands.reduce((acc: Record<string, typeof cmd[]>, cmd) => {
      if (!acc[cmd.elementId]) acc[cmd.elementId] = [];
      acc[cmd.elementId].push(cmd);
      return acc;
    }, {} as Record<string, typeof selectedCommands>);
    
    // Process each element
    Object.entries(commandsByElement).forEach(([elementId, commands]) => {
      const element = state.elements.find((el) => el.id === elementId);
      if (element && element.type === 'path' && (commands).length >= 2) {
        const pathData = element.data as PathData;
        const parsedCommands = parsePathD(pathData.d);
        const allPoints = extractEditablePoints(parsedCommands);
        
        // Find selected points
        const selectedPoints = allPoints.filter((point) => 
          (commands).some((cmd) => 
            cmd.commandIndex === point.commandIndex && 
            cmd.pointIndex === point.pointIndex
          )
        );
        
        if (selectedPoints.length >= 2) {
          // Find the bottommost point
          const maxY = Math.max(...selectedPoints.map(p => p.y));
          
          // Move all selected points to align with the bottommost
          const updatedPoints = selectedPoints.map(point => ({
            ...point,
            y: maxY
          }));
          
          // Update the path
          const newPathD = updatePathD(parsedCommands, updatedPoints);
          const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
          setStore((currentState) => ({
            elements: currentState.elements.map((el) =>
              el.id === elementId 
                ? { ...el, data: { ...pathData, d: newPathD } }
                : el
            )
          }));
        }
      }
    });
  },

  distributeHorizontallyCommands: () => {
    const state = get() as FullCanvasState;
    const selectedCommands = state.selectedCommands;
    
    if (selectedCommands.length < 3) return;
    
    // For distribution, we need a consistent grouping strategy
    const commandsByElement = selectedCommands.reduce((acc: Record<string, typeof cmd[]>, cmd) => {
      if (!acc[cmd.elementId]) acc[cmd.elementId] = [];
      acc[cmd.elementId].push(cmd);
      return acc;
    }, {} as Record<string, typeof selectedCommands>);
    
    const allSelectedPoints: Array<{
      elementId: string;
      commandIndex: number;
      pointIndex: number;
      x: number;
      y: number;
    }> = [];
    
    // First collect all selected points with their current positions
    Object.entries(commandsByElement).forEach(([elementId, commands]) => {
      const element = state.elements.find((el) => el.id === elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as PathData;
        const parsedCommands = parsePathD(pathData.d);
        const allPoints = extractEditablePoints(parsedCommands);
        
        (commands).forEach((cmd) => {
          const point = allPoints.find((p) => 
            p.commandIndex === cmd.commandIndex && 
            p.pointIndex === cmd.pointIndex
          );
          
          if (point) {
            allSelectedPoints.push({
              elementId: cmd.elementId,
              commandIndex: cmd.commandIndex,
              pointIndex: cmd.pointIndex,
              x: point.x,
              y: point.y
            });
          }
        });
      }
    });
    
    if (allSelectedPoints.length < 3) return;
    
    // Sort by current X position
    allSelectedPoints.sort((a, b) => a.x - b.x);
    
    // Calculate distribution
    const leftmost = allSelectedPoints[0].x;
    const rightmost = allSelectedPoints[allSelectedPoints.length - 1].x;
    const totalDistance = rightmost - leftmost;
    const spacing = totalDistance / (allSelectedPoints.length - 1);
    
    // Group updates by element for efficiency
    const elementUpdates = new Map<string, Array<{
      commandIndex: number;
      pointIndex: number;
      x: number;
      y: number;
      isControl: boolean;
    }>>();
    
    allSelectedPoints.forEach((pointInfo, index) => {
      if (index === 0 || index === allSelectedPoints.length - 1) {
        // Keep first and last points in place
        return;
      }
      
      const newX = leftmost + (index * spacing);
      
      if (!elementUpdates.has(pointInfo.elementId)) {
        elementUpdates.set(pointInfo.elementId, []);
      }
      
      elementUpdates.get(pointInfo.elementId)!.push({
        commandIndex: pointInfo.commandIndex,
        pointIndex: pointInfo.pointIndex,
        x: newX,
        y: pointInfo.y, // Keep Y unchanged
        isControl: false
      });
    });
    
    // Apply updates to each element
    elementUpdates.forEach((updates, elementId) => {
      const element = state.elements.find((el) => el.id === elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as PathData;
        const parsedCommands = parsePathD(pathData.d);
        
        const newPathD = updatePathD(parsedCommands, updates);
        const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
          setStore((currentState) => ({
          elements: currentState.elements.map((el) =>
            el.id === elementId 
              ? { ...el, data: { ...pathData, d: newPathD } }
              : el
          )
        }));
      }
    });
  },

  distributeVerticallyCommands: () => {
    const state = get() as FullCanvasState;
    const selectedCommands = state.selectedCommands;
    
    if (selectedCommands.length < 3) return;
    
    // For distribution, we need a consistent grouping strategy
    const commandsByElement = selectedCommands.reduce((acc: Record<string, typeof cmd[]>, cmd) => {
      if (!acc[cmd.elementId]) acc[cmd.elementId] = [];
      acc[cmd.elementId].push(cmd);
      return acc;
    }, {} as Record<string, typeof selectedCommands>);
    
    const allSelectedPoints: Array<{
      elementId: string;
      commandIndex: number;
      pointIndex: number;
      x: number;
      y: number;
    }> = [];
    
    // First collect all selected points with their current positions
    Object.entries(commandsByElement).forEach(([elementId, commands]) => {
      const element = state.elements.find((el) => el.id === elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as PathData;
        const parsedCommands = parsePathD(pathData.d);
        const allPoints = extractEditablePoints(parsedCommands);
        
        (commands).forEach((cmd) => {
          const point = allPoints.find((p) => 
            p.commandIndex === cmd.commandIndex && 
            p.pointIndex === cmd.pointIndex
          );
          
          if (point) {
            allSelectedPoints.push({
              elementId: cmd.elementId,
              commandIndex: cmd.commandIndex,
              pointIndex: cmd.pointIndex,
              x: point.x,
              y: point.y
            });
          }
        });
      }
    });
    
    if (allSelectedPoints.length < 3) return;
    
    // Sort by current Y position
    allSelectedPoints.sort((a, b) => a.y - b.y);
    
    // Calculate distribution
    const topmost = allSelectedPoints[0].y;
    const bottommost = allSelectedPoints[allSelectedPoints.length - 1].y;
    const totalDistance = bottommost - topmost;
    const spacing = totalDistance / (allSelectedPoints.length - 1);
    
    // Group updates by element for efficiency
    const elementUpdates = new Map<string, Array<{
      commandIndex: number;
      pointIndex: number;
      x: number;
      y: number;
      isControl: boolean;
    }>>();
    
    allSelectedPoints.forEach((pointInfo, index) => {
      if (index === 0 || index === allSelectedPoints.length - 1) {
        // Keep first and last points in place
        return;
      }
      
      const newY = topmost + (index * spacing);
      
      if (!elementUpdates.has(pointInfo.elementId)) {
        elementUpdates.set(pointInfo.elementId, []);
      }
      
      elementUpdates.get(pointInfo.elementId)!.push({
        commandIndex: pointInfo.commandIndex,
        pointIndex: pointInfo.pointIndex,
        x: pointInfo.x, // Keep X unchanged
        y: newY,
        isControl: false
      });
    });
    
    // Apply updates to each element
    elementUpdates.forEach((updates, elementId) => {
      const element = state.elements.find((el) => el.id === elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as PathData;
        const parsedCommands = parsePathD(pathData.d);
        
        const newPathD = updatePathD(parsedCommands, updates);
        const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
          setStore((currentState) => ({
          elements: currentState.elements.map((el) =>
            el.id === elementId 
              ? { ...el, data: { ...pathData, d: newPathD } }
              : el
          )
        }));
      }
    });
  },

  // Check if edit should work with subpaths instead of all points
  isWorkingWithSubpaths: () => {
    const state = get() as FullCanvasState;
    return state.selectedSubpaths && state.selectedSubpaths.length > 0;
  },

  // Get filtered editable points - either from selected subpaths or all points
  getFilteredEditablePoints: (elementId: string) => {
    const state = get() as FullCanvasState;
    const isSubpathMode = (get() as FullCanvasState).isWorkingWithSubpaths();
    
    const element = state.elements.find((el) => el.id === elementId);
    if (!element || element.type !== 'path') return [];

    const pathData = element.data as PathData;
    const commands = parsePathD(pathData.d);
    const allPoints = extractEditablePoints(commands);

    if (!isSubpathMode) {
      // Normal mode: return all points
      return allPoints;
    }

    // Subpath mode: filter points to only include those from selected subpaths
    const selectedSubpaths = state.selectedSubpaths.filter((sp) => sp.elementId === elementId);
    if (selectedSubpaths.length === 0) return [];

    const subpaths = extractSubpaths(commands);
    const filteredPoints: typeof allPoints = [];

    selectedSubpaths.forEach((selected: { subpathIndex: number }) => {
      const subpathData = subpaths[selected.subpathIndex];
      if (subpathData) {
        // Include points that fall within this subpath's command range
        const pointsInSubpath = allPoints.filter(point => 
          point.commandIndex >= subpathData.startIndex && 
          point.commandIndex <= subpathData.endIndex
        );
        filteredPoints.push(...pointsInSubpath);
      }
    });

    return filteredPoints;
  },

  updateSmoothBrush: (brush) => {
    set((state) => ({
      smoothBrush: { ...state.smoothBrush, ...brush },
    }));
  },

    applySmoothBrush: (centerX?: number, centerY?: number) => {
    const state = get() as FullCanvasState;
    const { radius, strength, simplifyPoints: shouldSimplifyPoints, simplificationTolerance, minDistance } = state.smoothBrush;

    // Find the active element (first selected or the one being edited)
    let targetElementId = null;
    if (state.selectedCommands.length > 0) {
      targetElementId = state.selectedCommands[0].elementId;
    } else if (state.editingPoint) {
      targetElementId = state.editingPoint.elementId;
    } else if ((state as CanvasStore).selectedIds && (state as CanvasStore).selectedIds.length > 0) {
      // Fallback to first selected element
      targetElementId = (state as CanvasStore).selectedIds[0];
    }

    if (!targetElementId) {
      return;
    }

    const elements = (get() as FullCanvasState).elements;
    const element = elements.find((el) => el.id === targetElementId);
    if (!element || element.type !== 'path') {
      return;
    }

    const pathData = element.data;
    const commands = parsePathD(pathData.d);
    const editablePoints = extractEditablePoints(commands);

    let rebuildPath = false;
    let simplifiedPointsForRebuild: Array<{
      commandIndex: number;
      pointIndex: number;
      x: number;
      y: number;
      isControl: boolean;
    }> = [];

    // Calculate affected points for feedback
    const affectedPoints: Array<{
      commandIndex: number;
      pointIndex: number;
      x: number;
      y: number;
    }> = [];

    // Apply smoothing to points
    const updatedPoints: Array<{
      commandIndex: number;
      pointIndex: number;
      x: number;
      y: number;
      isControl: boolean;
    }> = [];

    if (state.selectedCommands.length > 0) {
      // Apply smoothing only to selected commands
      
      state.selectedCommands.forEach((selectedCmd) => {
        const point = editablePoints.find(p => 
          p.commandIndex === selectedCmd.commandIndex && 
          p.pointIndex === selectedCmd.pointIndex
        );
        
        if (point) {
          // Skip start and end points of the path
          const pointIndex = editablePoints.indexOf(point);
          if (pointIndex === 0 || pointIndex === editablePoints.length - 1) return;
          
          affectedPoints.push({
            commandIndex: point.commandIndex,
            pointIndex: point.pointIndex,
            x: point.x,
            y: point.y,
          });

          // Calculate smoothed position by averaging with neighbors
          let sumX = 0, sumY = 0, count = 0;
          
          // Include current point and neighbors
          for (let offset = -1; offset <= 1; offset++) {
            const neighborIndex = editablePoints.findIndex(p => 
              p.commandIndex === point.commandIndex && 
              p.pointIndex === point.pointIndex
            ) + offset;
            if (neighborIndex >= 0 && neighborIndex < editablePoints.length) {
              const neighbor = editablePoints[neighborIndex];
              sumX += neighbor.x;
              sumY += neighbor.y;
              count++;
            }
          }
          
          if (count > 0) {
            const avgX = sumX / count;
            const avgY = sumY / count;
            
            const newX = point.x + (avgX - point.x) * strength;
            const newY = point.y + (avgY - point.y) * strength;
            
            updatedPoints.push({
              commandIndex: point.commandIndex,
              pointIndex: point.pointIndex,
              x: newX,
              y: newY,
              isControl: point.isControl,
            });
          }
        }
      });
    } else {
      // Original radius-based behavior
      editablePoints.forEach((point, index) => {
        // Skip start and end points of the path
        if (index === 0 || index === editablePoints.length - 1) return;
        
        // If center is provided, only affect points within radius
        if (centerX !== undefined && centerY !== undefined) {
          const distance = Math.sqrt((point.x - centerX) ** 2 + (point.y - centerY) ** 2);
          if (distance > radius) return;
        }
        
        // Add to affected points for feedback
        affectedPoints.push({
          commandIndex: point.commandIndex,
          pointIndex: point.pointIndex,
          x: point.x,
          y: point.y,
        });

        // Calculate smoothed position by averaging with neighbors
        let sumX = 0, sumY = 0, count = 0;
        
        // Include current point and neighbors
        for (let offset = -1; offset <= 1; offset++) {
          const neighborIndex = index + offset;
          if (neighborIndex >= 0 && neighborIndex < editablePoints.length) {
            const neighbor = editablePoints[neighborIndex];
            sumX += neighbor.x;
            sumY += neighbor.y;
            count++;
          }
        }
        
        if (count > 0) {
          const avgX = sumX / count;
          const avgY = sumY / count;
          
          // Weight based on distance (closer = more smoothing) if center is provided
          let weight = strength;
          if (centerX !== undefined && centerY !== undefined) {
            const distance = Math.sqrt((point.x - centerX) ** 2 + (point.y - centerY) ** 2);
            weight = strength * (1 - distance / radius);
          }
          
          const newX = point.x + (avgX - point.x) * weight;
          const newY = point.y + (avgY - point.y) * weight;
          
          updatedPoints.push({
            commandIndex: point.commandIndex,
            pointIndex: point.pointIndex,
            x: newX,
            y: newY,
            isControl: point.isControl,
          });
        }
      });
    }

    // Update affected points for feedback
    set((currentState) => ({
      smoothBrush: { ...currentState.smoothBrush, affectedPoints },
    }));

    // Update the path if points were affected
    if (updatedPoints.length > 0) {
      const finalPoints = updatedPoints;
      
      // Apply point simplification if enabled
      if (shouldSimplifyPoints) {
        
        if (state.selectedCommands.length > 0) {
          // When points are selected, get all points after partial smoothing to apply simplification
          const smoothedCommands = updatePathD(commands, updatedPoints);
          const smoothedPathData = parsePathD(smoothedCommands);
          const allPointsAfterSmoothing = extractEditablePoints(smoothedPathData);
          
          // Simplify all points
          const simplifiedPoints = simplifyPoints(allPointsAfterSmoothing, simplificationTolerance, minDistance);
          
          // Rebuild the path from simplified points
          simplifiedPointsForRebuild = simplifiedPoints;
          rebuildPath = true;
        } else {
          // When no points are selected, simplify all points after smoothing
          
          if (centerX !== undefined && centerY !== undefined) {
            // When clicking in brush mode, get all points after partial smoothing to apply simplification
            const smoothedCommands = updatePathD(commands, updatedPoints);
            const smoothedPathData = parsePathD(smoothedCommands);
            const allPointsAfterSmoothing = extractEditablePoints(smoothedPathData);
            
            // Simplify all points
            const simplifiedPoints = simplifyPoints(allPointsAfterSmoothing, simplificationTolerance, minDistance);
            
            // Rebuild the path from simplified points
            simplifiedPointsForRebuild = simplifiedPoints;
            rebuildPath = true;
          } else {
            // When dragging in brush mode, simplify all points after smoothing
            // Get all editable points after smoothing to apply simplification
            const smoothedCommands = updatePathD(commands, updatedPoints);
            const smoothedPathData = parsePathD(smoothedCommands);
            const allPointsAfterSmoothing = extractEditablePoints(smoothedPathData);
            
            // Simplify the points
            const simplifiedPoints = simplifyPoints(allPointsAfterSmoothing, simplificationTolerance, minDistance);
            
            // For brush mode, rebuild the path from simplified points
            simplifiedPointsForRebuild = simplifiedPoints;
            rebuildPath = true;
          }
        }
      }
      
      let newD: string;
      if (rebuildPath) {
        if (simplifiedPointsForRebuild.length > 0) {
          // Extract original subpaths to maintain separation
          const originalSubpaths = extractSubpaths(commands);
          
          if (originalSubpaths.length > 1) {
            // Multiple subpaths - rebuild each subpath separately
            const subpathStrings: string[] = [];
            
            // Group simplified points by their original subpath
            const pointsBySubpath: Array<Array<{ x: number; y: number; commandIndex: number; pointIndex: number; isControl: boolean }>> = [];
            
            originalSubpaths.forEach((subpath) => {
              const subpathPoints = simplifiedPointsForRebuild.filter(point => 
                point.commandIndex >= subpath.startIndex && point.commandIndex <= subpath.endIndex
              );
              pointsBySubpath.push(subpathPoints);
            });
            
            // Rebuild each subpath
            pointsBySubpath.forEach((subpathPoints) => {
              if (subpathPoints.length > 0) {
                let subpathD = `M ${formatToPrecision(subpathPoints[0].x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(subpathPoints[0].y, PATH_DECIMAL_PRECISION)}`;
                for (let i = 1; i < subpathPoints.length; i++) {
                  subpathD += ` L ${formatToPrecision(subpathPoints[i].x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(subpathPoints[i].y, PATH_DECIMAL_PRECISION)}`;
                }
                subpathStrings.push(subpathD);
              }
            });
            
            newD = subpathStrings.join(' ');
          } else {
            // Single subpath - use original logic
            newD = `M ${formatToPrecision(simplifiedPointsForRebuild[0].x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(simplifiedPointsForRebuild[0].y, PATH_DECIMAL_PRECISION)}`;
            for (let i = 1; i < simplifiedPointsForRebuild.length; i++) {
              newD += ` L ${formatToPrecision(simplifiedPointsForRebuild[i].x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(simplifiedPointsForRebuild[i].y, PATH_DECIMAL_PRECISION)}`;
            }
          }
        } else {
          newD = '';
        }
      } else {
        newD = updatePathD(commands, finalPoints);
      }
      
      (get() as FullCanvasState).updateElement(targetElementId, {
        data: {
          ...pathData,
          d: newD,
        },
      });
      
    }
  },

  activateSmoothBrush: () => {
    set((state) => ({
      smoothBrush: { ...state.smoothBrush, isActive: true },
    }));
  },

  deactivateSmoothBrush: () => {
    set((state) => ({
      smoothBrush: { ...state.smoothBrush, isActive: false, affectedPoints: [] },
    }));
  },

  updateSmoothBrushCursor: (x: number, y: number) => {
    set((state) => ({
      smoothBrush: { ...state.smoothBrush, cursorX: x, cursorY: y },
    }));
  },

  updateControlPointAlignment: (elementId: string, commandIndex: number, pointIndex: number) => {
    const state = get() as FullCanvasState;
    const element = state.elements.find(el => el.id === elementId);
    if (!element || element.type !== 'path') return;

    const key = `${elementId}-${commandIndex}-${pointIndex}`;
    if (state.controlPointAlignment.controlPoints[key]) {
      return; // Already has alignment info, don't update
    }

    const pathData = element.data as PathData;
    const commands = parsePathD(pathData.d);
    const command = commands[commandIndex];
    
    if (!command || command.type !== 'C' || (pointIndex !== 0 && pointIndex !== 1)) return;

    // Find paired control point
    const paired = findPairedControlPoint(commands, commandIndex, pointIndex);
    if (!paired) {
      // No paired control point, mark as independent
      const key = `${elementId}-${commandIndex}-${pointIndex}`;
      const controlPointInfo: import('../../../types').ControlPointInfo = {
        commandIndex,
        pointIndex,
        type: 'independent',
        anchor: { x: command.points[2].x, y: command.points[2].y }
      };
      set((currentState) => ({
        controlPointAlignment: {
          ...currentState.controlPointAlignment,
          controlPoints: {
            ...currentState.controlPointAlignment.controlPoints,
            [key]: controlPointInfo
          }
        }
      }));
      return;
    }

    // Determine alignment type
    const alignmentType = determineControlPointAlignment(
      commands,
      commandIndex,
      pointIndex,
      paired.commandIndex,
      paired.pointIndex,
      paired.anchor
    );

    // Update both control points
    const key1 = `${elementId}-${commandIndex}-${pointIndex}`;
    const key2 = `${elementId}-${paired.commandIndex}-${paired.pointIndex}`;

    const info1: import('../../../types').ControlPointInfo = {
      commandIndex,
      pointIndex,
      type: alignmentType,
      pairedCommandIndex: paired.commandIndex,
      pairedPointIndex: paired.pointIndex,
      anchor: paired.anchor
    };

    const info2: import('../../../types').ControlPointInfo = {
      commandIndex: paired.commandIndex,
      pointIndex: paired.pointIndex,
      type: alignmentType,
      pairedCommandIndex: commandIndex,
      pairedPointIndex: pointIndex,
      anchor: paired.anchor
    };

    set((currentState) => ({
      controlPointAlignment: {
        ...currentState.controlPointAlignment,
        controlPoints: {
          ...currentState.controlPointAlignment.controlPoints,
          [key1]: info1,
          [key2]: info2
        }
      }
    }));
  },  getControlPointInfo: (elementId: string, commandIndex: number, pointIndex: number) => {
    const state = get() as FullCanvasState;
    const key = `${elementId}-${commandIndex}-${pointIndex}`;
    return state.controlPointAlignment.controlPoints[key] || null;
  },

  setControlPointAlignmentType: (elementId: string, commandIndex1: number, pointIndex1: number, commandIndex2: number, pointIndex2: number, type: import('../../../types').ControlPointType) => {
    const state = get() as FullCanvasState;
    const element = state.elements.find(el => el.id === elementId);
    if (!element || element.type !== 'path') return;

    const pathData = element.data as PathData;
    const commands = parsePathD(pathData.d);
    const points = extractEditablePoints(commands);

    // Find the shared anchor between the two control points
    const point1 = points.find(p => p.commandIndex === commandIndex1 && p.pointIndex === pointIndex1);
    const point2 = points.find(p => p.commandIndex === commandIndex2 && p.pointIndex === pointIndex2);
    
    if (!point1 || !point2 || !point1.isControl || !point2.isControl) return;

    // Determine the shared anchor
    let sharedAnchor: Point;
    if (point1.commandIndex === point2.commandIndex) {
      // Same command - both control points of the same curve
      const command = commands[point1.commandIndex];
      sharedAnchor = { x: command.points[2].x, y: command.points[2].y }; // End point
    } else {
      // Different commands - find the connection point
      const paired1 = findPairedControlPoint(commands, commandIndex1, pointIndex1);
      const paired2 = findPairedControlPoint(commands, commandIndex2, pointIndex2);
      
      if (paired1 && paired2 && 
          paired1.commandIndex === commandIndex2 && paired1.pointIndex === pointIndex2) {
        sharedAnchor = paired1.anchor;
      } else if (commandIndex1 + 1 === commandIndex2 && pointIndex1 === 1 && pointIndex2 === 0) {
        sharedAnchor = commands[commandIndex1].points[2];
      } else {
        return; // Not a valid pair
      }
    }

    // Update the control point info
    const key1 = `${elementId}-${commandIndex1}-${pointIndex1}`;
    const key2 = `${elementId}-${commandIndex2}-${pointIndex2}`;

    const info1: import('../../../types').ControlPointInfo = {
      commandIndex: commandIndex1,
      pointIndex: pointIndex1,
      type,
      pairedCommandIndex: commandIndex2,
      pairedPointIndex: pointIndex2,
      anchor: sharedAnchor
    };

    const info2: import('../../../types').ControlPointInfo = {
      commandIndex: commandIndex2,
      pointIndex: pointIndex2,
      type,
      pairedCommandIndex: commandIndex1,
      pairedPointIndex: pointIndex1,
      anchor: sharedAnchor
    };

    // If setting to aligned or mirrored, adjust the positions
    if (type === 'aligned' || type === 'mirrored') {
      const vector1 = {
        x: point1.x - sharedAnchor.x,
        y: point1.y - sharedAnchor.y
      };
      const magnitude1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
      
      if (magnitude1 > 0) {
        const unitVector1 = {
          x: vector1.x / magnitude1,
          y: vector1.y / magnitude1
        };

        let newPoint2X: number;
        let newPoint2Y: number;

        if (type === 'mirrored') {
          // Opposite direction, same magnitude
          newPoint2X = sharedAnchor.x + (-unitVector1.x * magnitude1);
          newPoint2Y = sharedAnchor.y + (-unitVector1.y * magnitude1);
        } else {
          // Opposite direction, maintain point2's original magnitude
          const vector2 = {
            x: point2.x - sharedAnchor.x,
            y: point2.y - sharedAnchor.y
          };
          const magnitude2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);
          newPoint2X = sharedAnchor.x + (-unitVector1.x * magnitude2);
          newPoint2Y = sharedAnchor.y + (-unitVector1.y * magnitude2);
        }

        // Update point2 position
        const point2ToUpdate = points.find(p => 
          p.commandIndex === commandIndex2 && p.pointIndex === pointIndex2
        );
        if (point2ToUpdate) {
          point2ToUpdate.x = formatToPrecision(newPoint2X, PATH_DECIMAL_PRECISION);
          point2ToUpdate.y = formatToPrecision(newPoint2Y, PATH_DECIMAL_PRECISION);
          
          // Update the path
          const newPathD = updatePathD(commands, [point2ToUpdate]);
          (get() as FullCanvasState).updateElement(elementId, {
            data: {
              ...pathData,
              d: newPathD
            }
          });
        }
      }
    }

    // Update the control point alignment state
    set((currentState) => ({
      controlPointAlignment: {
        ...currentState.controlPointAlignment,
        controlPoints: {
          ...currentState.controlPointAlignment.controlPoints,
          [key1]: info1,
          [key2]: info2
        }
      }
    }));
  },

  applyControlPointAlignment: (elementId: string, commandIndex: number, pointIndex: number, newX: number, newY: number) => {
    const state = get() as FullCanvasState;
    const element = state.elements.find((el: CanvasElement) => el.id === elementId);
    if (!element || element.type !== 'path') return;

    const pathData = element.data as PathData;
    const commands = parsePathD(pathData.d);
    const points = extractEditablePoints(commands);

    // Find the control point that was moved
    const movedPoint = points.find(p => p.commandIndex === commandIndex && p.pointIndex === pointIndex);
    if (!movedPoint || !movedPoint.isControl) return;

    // Get the alignment info for this point
    const key = `${elementId}-${commandIndex}-${pointIndex}`;
    const alignmentInfo = state.controlPointAlignment.controlPoints[key];
    if (!alignmentInfo || alignmentInfo.type === 'independent') return;

    // Find the paired point
    const pairedPoint = points.find(p => 
      p.commandIndex === alignmentInfo.pairedCommandIndex && 
      p.pointIndex === alignmentInfo.pairedPointIndex
    );
    if (!pairedPoint) return;

    // Calculate the new position for the paired point based on alignment type
    const sharedAnchor = alignmentInfo.anchor;
    const newVector = {
      x: newX - sharedAnchor.x,
      y: newY - sharedAnchor.y
    };

    let newPairedX: number;
    let newPairedY: number;

    if (alignmentInfo.type === 'mirrored') {
      // Mirror the movement
      const magnitude = Math.sqrt(newVector.x * newVector.x + newVector.y * newVector.y);
      const unitVector = magnitude > 0 ? {
        x: newVector.x / magnitude,
        y: newVector.y / magnitude
      } : { x: 0, y: 0 };

      newPairedX = sharedAnchor.x + (-unitVector.x * magnitude);
      newPairedY = sharedAnchor.y + (-unitVector.y * magnitude);
    } else { // aligned
      // Maintain opposite direction with same magnitude
      const magnitude = Math.sqrt(newVector.x * newVector.x + newVector.y * newVector.y);
      const unitVector = magnitude > 0 ? {
        x: newVector.x / magnitude,
        y: newVector.y / magnitude
      } : { x: 0, y: 0 };

      newPairedX = sharedAnchor.x + (-unitVector.x * magnitude);
      newPairedY = sharedAnchor.y + (-unitVector.y * magnitude);
    }

    // Update the paired point position
    pairedPoint.x = formatToPrecision(newPairedX, PATH_DECIMAL_PRECISION);
    pairedPoint.y = formatToPrecision(newPairedY, PATH_DECIMAL_PRECISION);

    // Update the path
    const newPathD = updatePathD(commands, [pairedPoint]);
    (get() as FullCanvasState).updateElement(elementId, {
      data: {
        ...pathData,
        d: newPathD
      }
    });
  },

  finalizePointMove: (elementId: string, commandIndex: number, pointIndex: number, newX: number, newY: number) => {
    // Apply control point alignment if this point has alignment configured
    get().applyControlPointAlignment(elementId, commandIndex, pointIndex, newX, newY);
  },

  deleteZCommandForMPoint: (elementId: string, commandIndex: number) => {
    const state = get() as FullCanvasState;
    const element = state.elements.find((el: CanvasElement) => el.id === elementId);
    
    if (!element || element.type !== 'path') return;
    
    const pathData = element.data as PathData;
    const commands = parsePathD(pathData.d);
    
    // Check if the command at commandIndex is an M command
    if (commands[commandIndex]?.type !== 'M') return;
    
    // Find if there's a Z command that closes to this M point
    // A Z command closes to the most recent M command
    let hasClosingZ = false;
    let zCommandIndex = -1;
    
    // Look for Z commands after this M command
    for (let i = commandIndex + 1; i < commands.length; i++) {
      if (commands[i].type === 'Z') {
        // Check if this Z closes to our M point
        // A Z closes to the last M before it
        let lastMIndex = -1;
        for (let j = i - 1; j >= 0; j--) {
          if (commands[j].type === 'M') {
            lastMIndex = j;
            break;
          }
        }
        
        if (lastMIndex === commandIndex) {
          hasClosingZ = true;
          zCommandIndex = i;
          break;
        }
      } else if (commands[i].type === 'M') {
        // If we hit another M, stop looking
        break;
      }
    }
    
    if (hasClosingZ && zCommandIndex !== -1) {
      // Remove the Z command
      const updatedCommands = commands.filter((_, index) => index !== zCommandIndex);
      
      // Normalize and reconstruct path
      const normalizedCommands = normalizePathCommands(updatedCommands);
      const newPathD = normalizedCommands.map(cmd => {
        if (cmd.type === 'Z') return 'Z';
        const pointStr = cmd.points.map(p => `${formatToPrecision(p.x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(p.y, PATH_DECIMAL_PRECISION)}`).join(' ');
        return `${cmd.type} ${pointStr}`;
      }).join(' ');
      
      // Update the element
      (set as (fn: (state: FullCanvasState) => Partial<FullCanvasState>) => void)((currentState) => ({
        ...currentState,
        elements: currentState.elements.map((el) =>
          el.id === elementId
            ? { ...el, data: { ...pathData, d: newPathD } }
            : el
        )
      }));
    }
  },

  moveToM: (elementId: string, commandIndex: number, pointIndex: number) => {
    const state = get() as FullCanvasState;
    const element = state.elements.find((el: CanvasElement) => el.id === elementId);
    
    if (!element || element.type !== 'path') return;
    
    const pathData = element.data as PathData;
    const commands = parsePathD(pathData.d);
    
    // Check if the command exists and is L or C
    const command = commands[commandIndex];
    if (!command || (command.type !== 'L' && command.type !== 'C')) return;
    
    // Check if this is the last point of the command
    const isLastPoint = pointIndex === command.points.length - 1;
    if (!isLastPoint) return;
    
    // Check if this is the last command in the path or before a Z/M
    const isLastCommandInSubpath = commandIndex === commands.length - 1 || 
                                   commands[commandIndex + 1].type === 'M' || 
                                   commands[commandIndex + 1].type === 'Z';
    
    if (!isLastCommandInSubpath) return;
    
    // Find the M command for this subpath (the last M before this command)
    let subpathMIndex = -1;
    for (let i = commandIndex - 1; i >= 0; i--) {
      if (commands[i].type === 'M') {
        subpathMIndex = i;
        break;
      }
    }
    
    if (subpathMIndex === -1) return; // No M found
    
    // Get the point to move to M position
    const pointToMove = command.points[pointIndex];
    if (!pointToMove) return;
    
    const updatedCommands = [...commands];
    
    // Move the last point to the M position to close the subpath
    updatedCommands[commandIndex] = {
      ...command,
      points: command.points.map((point, index) => 
        index === pointIndex ? commands[subpathMIndex].points[0] : point
      )
    };
    
    // For C commands, we need to adjust control points to maintain curve shape
    if (command.type === 'C' && command.points.length >= 3) {
      // For a C command, points are: [control1, control2, endpoint]
      // When moving the endpoint to the M position, we need to adjust control points
      const mPosition = commands[subpathMIndex].points[0];
      const originalEndpoint = command.points[2];
      
      // Calculate the offset
      const offsetX = mPosition.x - originalEndpoint.x;
      const offsetY = mPosition.y - originalEndpoint.y;
      
      // Move control points by the same offset to maintain relative positions
      updatedCommands[commandIndex] = {
        ...command,
        points: [
          { x: command.points[0].x + offsetX, y: command.points[0].y + offsetY }, // control point 1
          { x: command.points[1].x + offsetX, y: command.points[1].y + offsetY }, // control point 2
          mPosition // endpoint moved to M position
        ]
      };
    }
    
    // Normalize and reconstruct path
    const normalizedCommands = normalizePathCommands(updatedCommands);
    const newPathD = normalizedCommands.map(cmd => {
      if (cmd.type === 'Z') return 'Z';
      const pointStr = cmd.points.map(p => `${formatToPrecision(p.x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(p.y, PATH_DECIMAL_PRECISION)}`).join(' ');
      return `${cmd.type} ${pointStr}`;
    }).join(' ');
    
    // Update the element
    (set as (fn: (state: FullCanvasState) => Partial<FullCanvasState>) => void)((currentState) => ({
      ...currentState,
      elements: currentState.elements.map((el) =>
        el.id === elementId
          ? { ...el, data: { ...pathData, d: newPathD } }
          : el
      )
    }));
  },

  convertCommandType: (elementId: string, commandIndex: number) => {
    const state = get() as FullCanvasState;
    const element = state.elements.find((el: CanvasElement) => el.id === elementId);
    
    if (!element || element.type !== 'path') return;
    
    const pathData = element.data as PathData;
    const commands = parsePathD(pathData.d);
    
    const command = commands[commandIndex];
    if (!command) return;
    
    // Helper function to get command end point
    const getCommandEndPoint = (cmd: PathCommand) => {
      if (cmd.points && cmd.points.length > 0) {
        return cmd.points[cmd.points.length - 1];
      }
      return null;
    };
    
    const updatedCommands = [...commands];
    
    if (command.type === 'L') {
      // Convert L to C: need to add control points
      // For a smooth conversion, place control points at 1/3 and 2/3 of the line
      const startPoint = commandIndex > 0 ? getCommandEndPoint(commands[commandIndex - 1]) : { x: 0, y: 0 };
      const endPoint = command.points[0];
      
      if (startPoint) {
        // Calculate control points at 1/3 and 2/3 of the line
        const control1 = {
          x: startPoint.x + (endPoint.x - startPoint.x) * (1/3),
          y: startPoint.y + (endPoint.y - startPoint.y) * (1/3)
        };
        const control2 = {
          x: startPoint.x + (endPoint.x - startPoint.x) * (2/3),
          y: startPoint.y + (endPoint.y - startPoint.y) * (2/3)
        };
        
        updatedCommands[commandIndex] = {
          type: 'C',
          points: [control1, control2, endPoint]
        };
      }
    } else if (command.type === 'C') {
      // Convert C to L: keep only the endpoint
      const endPoint = command.points[2]; // Last point is the endpoint
      updatedCommands[commandIndex] = {
        type: 'L',
        points: [endPoint]
      };
    }
    
    // Normalize and reconstruct path
    const normalizedCommands = normalizePathCommands(updatedCommands);
    const newPathD = normalizedCommands.map(cmd => {
      if (cmd.type === 'Z') return 'Z';
      const pointStr = cmd.points.map(p => `${formatToPrecision(p.x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(p.y, PATH_DECIMAL_PRECISION)}`).join(' ');
      return `${cmd.type} ${pointStr}`;
    }).join(' ');
    
    // Update the element
    (set as (fn: (state: FullCanvasState) => Partial<FullCanvasState>) => void)((currentState) => ({
      ...currentState,
      elements: currentState.elements.map((el) =>
        el.id === elementId
          ? { ...el, data: { ...pathData, d: newPathD } }
          : el
      )
    }));
  },});
