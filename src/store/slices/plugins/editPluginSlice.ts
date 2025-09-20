import type { StateCreator } from 'zustand';
import { parsePathD, extractEditablePoints, updatePathD, normalizePathCommands, extractSubpaths } from '../../../utils/pathParserUtils';
import { formatToPrecision, PATH_DECIMAL_PRECISION } from '../../../utils';

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

  // Actions
  setEditingPoint: (point: { elementId: string; commandIndex: number; pointIndex: number } | null) => void;
  startDraggingPoint: (elementId: string, commandIndex: number, pointIndex: number, offsetX: number, offsetY: number) => void;
  updateDraggingPoint: (x: number, y: number) => void;
  stopDraggingPoint: () => void;
  emergencyCleanupDrag: () => void;
  selectCommand: (command: { elementId: string; commandIndex: number; pointIndex: number }, multiSelect?: boolean) => void;
  clearSelectedCommands: () => void;
  deleteSelectedCommands: () => void;
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
}

export const createEditPluginSlice: StateCreator<EditPluginSlice, [], [], EditPluginSlice> = (set, get) => ({
  // Initial state
  editingPoint: null,
  selectedCommands: [],
  draggingSelection: null,

  // Actions
  setEditingPoint: (point) => {
    set({ editingPoint: point ? { ...point, isDragging: false, offsetX: 0, offsetY: 0 } : null });
  },

  startDraggingPoint: (elementId, commandIndex, pointIndex, offsetX, offsetY) => {
    const state = get() as any;
    
    // Check if the point being dragged is in the selection
    const isSelected = state.selectedCommands.some((cmd: any) => 
      cmd.elementId === elementId && 
      cmd.commandIndex === commandIndex && 
      cmd.pointIndex === pointIndex
    );
    
    // If the point is not selected, select it first (single selection)
    if (!isSelected) {
      set({ selectedCommands: [{ elementId, commandIndex, pointIndex }] });
    }
    
    // Now determine the drag type based on current selection
    const currentState = get() as any;
    const currentIsSelected = currentState.selectedCommands.some((cmd: any) => 
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
      currentState.selectedCommands.forEach((cmd: any) => {
        const element = state.elements.find((el: any) => el.id === cmd.elementId);
        if (element && element.type === 'path') {
          const pathData = element.data as any;
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
    const state = get();
    
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

  selectCommand: (command, multiSelect = false) => {
    set((state) => {
      const isAlreadySelected = state.selectedCommands.some(
        (c) => c.elementId === command.elementId && 
               c.commandIndex === command.commandIndex && 
               c.pointIndex === command.pointIndex
      );
      
      if (multiSelect) {
        if (isAlreadySelected) {
          return {
            selectedCommands: state.selectedCommands.filter(
              (c) => !(c.elementId === command.elementId && 
                       c.commandIndex === command.commandIndex && 
                       c.pointIndex === command.pointIndex)
            )
          };
        } else {
          return {
            selectedCommands: [...state.selectedCommands, command]
          };
        }
      } else {
        return {
          selectedCommands: isAlreadySelected ? [] : [command]
        };
      }
    });
  },

  clearSelectedCommands: () => {
    set({ selectedCommands: [] });
  },

  deleteSelectedCommands: () => {
    const state = get() as any;
    const selectedCommands = state.selectedCommands;

    if (selectedCommands.length === 0) return;

    // Group commands by elementId
    const commandsByElement = selectedCommands.reduce((acc: any, cmd: any) => {
      if (!acc[cmd.elementId]) acc[cmd.elementId] = [];
      acc[cmd.elementId].push(cmd);
      return acc;
    }, {} as Record<string, typeof selectedCommands>);

    // Process each element
    Object.entries(commandsByElement).forEach(([elementId, commands]) => {
      const element = state.elements.find((el: any) => el.id === elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as any;
        const parsedCommands = parsePathD(pathData.d);
        const allPoints = extractEditablePoints(parsedCommands);

        // Find selected points
        const selectedPoints = allPoints.filter((point: any) =>
          (commands as any).some((cmd: any) =>
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
            (set as any)((currentState: any) => ({
              elements: currentState.elements.filter((el: any) => el.id !== elementId)
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
          (set as any)((currentState: any) => ({
            elements: currentState.elements.map((el: any) =>
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
    const state = get() as any;
    const selectedCommands = state.selectedCommands;
    
    if (selectedCommands.length < 2) return;
    
    // Group commands by elementId
    const commandsByElement = selectedCommands.reduce((acc: any, cmd: any) => {
      if (!acc[cmd.elementId]) acc[cmd.elementId] = [];
      acc[cmd.elementId].push(cmd);
      return acc;
    }, {} as Record<string, typeof selectedCommands>);
    
    // Process each element
    Object.entries(commandsByElement).forEach(([elementId, commands]) => {
      const element = state.elements.find((el: any) => el.id === elementId);
      if (element && element.type === 'path' && (commands as any).length >= 2) {
        const pathData = element.data as any;
        const parsedCommands = parsePathD(pathData.d);
        const allPoints = extractEditablePoints(parsedCommands);
        
        // Find selected points
        const selectedPoints = allPoints.filter((point: any) => 
          (commands as any).some((cmd: any) => 
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
          (set as any)((currentState: any) => ({
            elements: currentState.elements.map((el: any) =>
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
    const state = get() as any;
    const selectedCommands = state.selectedCommands;
    
    if (selectedCommands.length < 2) return;
    
    // Group commands by elementId
    const commandsByElement = selectedCommands.reduce((acc: any, cmd: any) => {
      if (!acc[cmd.elementId]) acc[cmd.elementId] = [];
      acc[cmd.elementId].push(cmd);
      return acc;
    }, {} as Record<string, typeof selectedCommands>);
    
    // Process each element
    Object.entries(commandsByElement).forEach(([elementId, commands]) => {
      const element = state.elements.find((el: any) => el.id === elementId);
      if (element && element.type === 'path' && (commands as any).length >= 2) {
        const pathData = element.data as any;
        const parsedCommands = parsePathD(pathData.d);
        const allPoints = extractEditablePoints(parsedCommands);
        
        // Find selected points
        const selectedPoints = allPoints.filter((point: any) => 
          (commands as any).some((cmd: any) => 
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
          (set as any)((currentState: any) => ({
            elements: currentState.elements.map((el: any) =>
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
    const state = get() as any;
    const selectedCommands = state.selectedCommands;
    
    if (selectedCommands.length < 2) return;
    
    // Group commands by elementId
    const commandsByElement = selectedCommands.reduce((acc: any, cmd: any) => {
      if (!acc[cmd.elementId]) acc[cmd.elementId] = [];
      acc[cmd.elementId].push(cmd);
      return acc;
    }, {} as Record<string, typeof selectedCommands>);
    
    // Process each element
    Object.entries(commandsByElement).forEach(([elementId, commands]) => {
      const element = state.elements.find((el: any) => el.id === elementId);
      if (element && element.type === 'path' && (commands as any).length >= 2) {
        const pathData = element.data as any;
        const parsedCommands = parsePathD(pathData.d);
        const allPoints = extractEditablePoints(parsedCommands);
        
        // Find selected points
        const selectedPoints = allPoints.filter((point: any) => 
          (commands as any).some((cmd: any) => 
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
          (set as any)((currentState: any) => ({
            elements: currentState.elements.map((el: any) =>
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
    const state = get() as any;
    const selectedCommands = state.selectedCommands;
    
    if (selectedCommands.length < 2) return;
    
    // Group commands by elementId
    const commandsByElement = selectedCommands.reduce((acc: any, cmd: any) => {
      if (!acc[cmd.elementId]) acc[cmd.elementId] = [];
      acc[cmd.elementId].push(cmd);
      return acc;
    }, {} as Record<string, typeof selectedCommands>);
    
    // Process each element
    Object.entries(commandsByElement).forEach(([elementId, commands]) => {
      const element = state.elements.find((el: any) => el.id === elementId);
      if (element && element.type === 'path' && (commands as any).length >= 2) {
        const pathData = element.data as any;
        const parsedCommands = parsePathD(pathData.d);
        const allPoints = extractEditablePoints(parsedCommands);
        
        // Find selected points
        const selectedPoints = allPoints.filter((point: any) => 
          (commands as any).some((cmd: any) => 
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
          (set as any)((currentState: any) => ({
            elements: currentState.elements.map((el: any) =>
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
    const state = get() as any;
    const selectedCommands = state.selectedCommands;
    
    if (selectedCommands.length < 2) return;
    
    // Group commands by elementId
    const commandsByElement = selectedCommands.reduce((acc: any, cmd: any) => {
      if (!acc[cmd.elementId]) acc[cmd.elementId] = [];
      acc[cmd.elementId].push(cmd);
      return acc;
    }, {} as Record<string, typeof selectedCommands>);
    
    // Process each element
    Object.entries(commandsByElement).forEach(([elementId, commands]) => {
      const element = state.elements.find((el: any) => el.id === elementId);
      if (element && element.type === 'path' && (commands as any).length >= 2) {
        const pathData = element.data as any;
        const parsedCommands = parsePathD(pathData.d);
        const allPoints = extractEditablePoints(parsedCommands);
        
        // Find selected points
        const selectedPoints = allPoints.filter((point: any) => 
          (commands as any).some((cmd: any) => 
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
          (set as any)((currentState: any) => ({
            elements: currentState.elements.map((el: any) =>
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
    const state = get() as any;
    const selectedCommands = state.selectedCommands;
    
    if (selectedCommands.length < 2) return;
    
    // Group commands by elementId
    const commandsByElement = selectedCommands.reduce((acc: any, cmd: any) => {
      if (!acc[cmd.elementId]) acc[cmd.elementId] = [];
      acc[cmd.elementId].push(cmd);
      return acc;
    }, {} as Record<string, typeof selectedCommands>);
    
    // Process each element
    Object.entries(commandsByElement).forEach(([elementId, commands]) => {
      const element = state.elements.find((el: any) => el.id === elementId);
      if (element && element.type === 'path' && (commands as any).length >= 2) {
        const pathData = element.data as any;
        const parsedCommands = parsePathD(pathData.d);
        const allPoints = extractEditablePoints(parsedCommands);
        
        // Find selected points
        const selectedPoints = allPoints.filter((point: any) => 
          (commands as any).some((cmd: any) => 
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
          (set as any)((currentState: any) => ({
            elements: currentState.elements.map((el: any) =>
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
    const state = get() as any;
    const selectedCommands = state.selectedCommands;
    
    if (selectedCommands.length < 3) return;
    
    // For distribution, we need a consistent grouping strategy
    const commandsByElement = selectedCommands.reduce((acc: any, cmd: any) => {
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
      const element = state.elements.find((el: any) => el.id === elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as any;
        const parsedCommands = parsePathD(pathData.d);
        const allPoints = extractEditablePoints(parsedCommands);
        
        (commands as any).forEach((cmd: any) => {
          const point = allPoints.find((p: any) => 
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
      const element = state.elements.find((el: any) => el.id === elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as any;
        const parsedCommands = parsePathD(pathData.d);
        
        const newPathD = updatePathD(parsedCommands, updates);
        (set as any)((currentState: any) => ({
          elements: currentState.elements.map((el: any) =>
            el.id === elementId 
              ? { ...el, data: { ...pathData, d: newPathD } }
              : el
          )
        }));
      }
    });
  },

  distributeVerticallyCommands: () => {
    const state = get() as any;
    const selectedCommands = state.selectedCommands;
    
    if (selectedCommands.length < 3) return;
    
    // For distribution, we need a consistent grouping strategy
    const commandsByElement = selectedCommands.reduce((acc: any, cmd: any) => {
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
      const element = state.elements.find((el: any) => el.id === elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as any;
        const parsedCommands = parsePathD(pathData.d);
        const allPoints = extractEditablePoints(parsedCommands);
        
        (commands as any).forEach((cmd: any) => {
          const point = allPoints.find((p: any) => 
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
      const element = state.elements.find((el: any) => el.id === elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as any;
        const parsedCommands = parsePathD(pathData.d);
        
        const newPathD = updatePathD(parsedCommands, updates);
        (set as any)((currentState: any) => ({
          elements: currentState.elements.map((el: any) =>
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
    const state = get() as any;
    return state.selectedSubpaths && state.selectedSubpaths.length > 0;
  },

  // Get filtered editable points - either from selected subpaths or all points
  getFilteredEditablePoints: (elementId: string) => {
    const state = get() as any;
    const isSubpathMode = (get() as any).isWorkingWithSubpaths();
    
    const element = state.elements.find((el: any) => el.id === elementId);
    if (!element || element.type !== 'path') return [];

    const pathData = element.data as any;
    const commands = parsePathD(pathData.d);
    const allPoints = extractEditablePoints(commands);

    if (!isSubpathMode) {
      // Normal mode: return all points
      return allPoints;
    }

    // Subpath mode: filter points to only include those from selected subpaths
    const selectedSubpaths = state.selectedSubpaths.filter((sp: any) => sp.elementId === elementId);
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
});