import type { StateCreator } from 'zustand';
import type { CanvasElement } from '../../types';
import { parsePathD, extractEditablePoints, updatePathD, type ControlPoint } from '../../utils/pathParserUtils';

export interface BaseSlice {
  // State
  elements: CanvasElement[];
  activePlugin: string | null;
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
  } | null;

  // Actions
  addElement: (element: Omit<CanvasElement, 'id' | 'zIndex'>) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  deleteElement: (id: string) => void;
  deleteSelectedElements: () => void;
  setActivePlugin: (plugin: string | null) => void;
  setMode: (mode: string) => void;
  setEditingPoint: (point: { elementId: string; commandIndex: number; pointIndex: number } | null) => void;
  startDraggingPoint: (elementId: string, commandIndex: number, pointIndex: number, offsetX: number, offsetY: number) => void;
  updateDraggingPoint: (x: number, y: number) => void;
  stopDraggingPoint: () => void;
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
}

type ModeRule = {
  canToggleOff: boolean;
  defaultFallback?: string;
};

const modeRules: Record<string, ModeRule> = {
  select: { canToggleOff: false },
  pan: { canToggleOff: false },
  pencil: { canToggleOff: false },
  text: { canToggleOff: false },
  shape: { canToggleOff: false },
  transformation: { canToggleOff: true, defaultFallback: 'select' },
  edit: { canToggleOff: true, defaultFallback: 'select' },
};

export const createBaseSlice: StateCreator<BaseSlice> = (set, get, _api) => ({
  // Initial state
  elements: [],
  activePlugin: 'select',
  editingPoint: null,
  selectedCommands: [],
  draggingSelection: null,

  // Actions
  addElement: (element) => {
    const id = `element_${Date.now()}_${Math.random()}`;
    const zIndex = get().elements.length;
    set((state) => ({
      elements: [...state.elements, { ...element, id, zIndex }],
    }));
  },

  updateElement: (id, updates) => {
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, ...updates } : el
      ),
    }));
  },

  deleteElement: (id) => {
    set((state) => ({
      elements: state.elements.filter((el) => el.id !== id),
    }));
  },

  deleteSelectedElements: () => {
    // This will be implemented in the selection slice
    // For now, just a placeholder
  },

  setActivePlugin: (plugin) => {
    set({ activePlugin: plugin });
  },

  setMode: (mode) => {
    const current = get().activePlugin;
    const rule = modeRules[mode] || { canToggleOff: false };

    if (current === mode) {
      if (rule.canToggleOff) {
        // Apagar, pero pasar al fallback o al mismo
        const fallback = rule.defaultFallback || mode;
        set({ activePlugin: fallback });
      }
      // Para modos que no se pueden apagar, no hacer nada
    } else {
      set({ activePlugin: mode });
    }
  },

  setEditingPoint: (point) => {
    set({ editingPoint: point ? { ...point, isDragging: false, offsetX: 0, offsetY: 0 } : null });
  },

  startDraggingPoint: (elementId, commandIndex, pointIndex, offsetX, offsetY) => {
    const state = get();
    
    // Check if the point being dragged is in the selection
    const isSelected = state.selectedCommands.some(cmd => 
      cmd.elementId === elementId && 
      cmd.commandIndex === commandIndex && 
      cmd.pointIndex === pointIndex
    );
    
    // If the point is not selected, select it first (single selection)
    if (!isSelected) {
      set({ selectedCommands: [{ elementId, commandIndex, pointIndex }] });
    }
    
    // Now determine the drag type based on current selection
    const currentState = get();
    const currentIsSelected = currentState.selectedCommands.some(cmd => 
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
      currentState.selectedCommands.forEach(cmd => {
        const element = currentState.elements.find(el => el.id === cmd.elementId);
        if (element && element.type === 'path') {
          const pathData = element.data as import('../../types').PathData;
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
      // Handle group drag of selected points
      const deltaX = x - state.draggingSelection.startX;
      const deltaY = y - state.draggingSelection.startY;
      
      // Group updates by element to avoid multiple state updates
      const elementUpdates: Record<string, ControlPoint[]> = {};
      
      // Collect all point updates for each element
      state.draggingSelection.initialPositions.forEach(initialPos => {
        const element = state.elements.find(el => el.id === initialPos.elementId);
        if (element && element.type === 'path') {
          if (!elementUpdates[initialPos.elementId]) {
            elementUpdates[initialPos.elementId] = [];
          }
          
          elementUpdates[initialPos.elementId].push({
            commandIndex: initialPos.commandIndex,
            pointIndex: initialPos.pointIndex,
            x: initialPos.x + deltaX,
            y: initialPos.y + deltaY,
            isControl: false
          });
        }
      });
      
      // Update all elements at once
      set((currentState) => {
        const updatedElements = currentState.elements.map((element) => {
          const updates = elementUpdates[element.id];
          if (updates && element.type === 'path') {
            const pathData = element.data as import('../../types').PathData;
            const commands = parsePathD(pathData.d);
            const newPathD = updatePathD(commands, updates);
            
            return {
              ...element,
              data: { ...pathData, d: newPathD }
            };
          }
          return element;
        });
        
        return { elements: updatedElements };
      });
    } else if (state.editingPoint && state.editingPoint.isDragging) {
      // Handle single point drag
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
      if (state.editingPoint && state.editingPoint.isDragging) {
        // Apply the drag changes to the actual path
        const element = state.elements.find(el => el.id === state.editingPoint!.elementId);
        if (element && element.type === 'path') {
          const pathData = element.data as import('../../types').PathData;
          const commands = parsePathD(pathData.d);
          const points = extractEditablePoints(commands);
          
          const pointToUpdate = points.find(p => 
            p.commandIndex === state.editingPoint!.commandIndex && 
            p.pointIndex === state.editingPoint!.pointIndex
          );
          
          if (pointToUpdate) {
            pointToUpdate.x = state.editingPoint!.offsetX;
            pointToUpdate.y = state.editingPoint!.offsetY;
            
            const newPathD = updatePathD(commands, [pointToUpdate]);
            
            return {
              elements: state.elements.map(el =>
                el.id === state.editingPoint!.elementId
                  ? { ...el, data: { ...pathData, d: newPathD } }
                  : el
              ),
              editingPoint: {
                ...state.editingPoint,
                isDragging: false
              },
              draggingSelection: null
            };
          }
        }
      }
      
      return {
        ...state,
        draggingSelection: null
      };
    });
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
    const state = get();
    const selectedCommands = state.selectedCommands;

    if (selectedCommands.length === 0) return;

    // Group commands by elementId
    const commandsByElement = selectedCommands.reduce((acc, cmd) => {
      if (!acc[cmd.elementId]) acc[cmd.elementId] = [];
      acc[cmd.elementId].push(cmd);
      return acc;
    }, {} as Record<string, typeof selectedCommands>);

    // Process each element
    Object.entries(commandsByElement).forEach(([elementId, commands]) => {
      const element = state.elements.find(el => el.id === elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as import('../../types').PathData;
        const parsedCommands = parsePathD(pathData.d);
        const allPoints = extractEditablePoints(parsedCommands);

        // Find selected points
        const selectedPoints = allPoints.filter(point =>
          commands.some(cmd =>
            cmd.commandIndex === point.commandIndex &&
            cmd.pointIndex === point.pointIndex
          )
        );

        if (selectedPoints.length > 0) {
          // Create updated commands by removing selected points
          const updatedCommands = parsedCommands.map((cmd, cmdIndex) => {
            const commandSelectedPoints = selectedPoints.filter(p => p.commandIndex === cmdIndex);

            if (commandSelectedPoints.length === 0) {
              return cmd; // No points to delete in this command
            }

            // Handle different command types
            if (cmd.type === 'M') {
              // Can't delete M point as it's required for path start
              return cmd;
            } else if (cmd.type === 'L') {
              // For L commands, we can remove the entire command if the point is selected
              if (commandSelectedPoints.some(p => p.pointIndex === 0 && !p.isControl)) {
                return null; // Mark for removal
              }
              return cmd;
            } else if (cmd.type === 'C') {
              // For C commands, removing control points is complex
              // For now, we'll try to simplify the curve to a line
              if (commandSelectedPoints.some(p => p.pointIndex === 0 || p.pointIndex === 1)) {
                // Remove control points, convert to L command
                return {
                  type: 'L' as const,
                  points: [cmd.points[2]] // Keep only the end point
                };
              } else if (commandSelectedPoints.some(p => p.pointIndex === 2 && !p.isControl)) {
                // Remove end point, convert to L to previous point or remove command
                return null; // Mark for removal
              }
              return cmd;
            } else if (cmd.type === 'Z') {
              // Can't delete Z command
              return cmd;
            }

            return cmd;
          }).filter(cmd => cmd !== null); // Remove null commands

          // Reconstruct path string
          const newPathD = updatedCommands.map(cmd => {
            if (!cmd) return '';
            if (cmd.type === 'Z') return 'Z';

            let pointStr = '';
            if (cmd.type === 'C' && cmd.points.length >= 3) {
              pointStr = cmd.points.map(p => `${p.x} ${p.y}`).join(' ');
            } else {
              pointStr = cmd.points.map(p => `${p.x} ${p.y}`).join(' ');
            }

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
    const state = get();
    const selectedCommands = state.selectedCommands;
    
    if (selectedCommands.length < 2) return;
    
    // Group commands by elementId
    const commandsByElement = selectedCommands.reduce((acc, cmd) => {
      if (!acc[cmd.elementId]) acc[cmd.elementId] = [];
      acc[cmd.elementId].push(cmd);
      return acc;
    }, {} as Record<string, typeof selectedCommands>);
    
    // Process each element
    Object.entries(commandsByElement).forEach(([elementId, commands]) => {
      const element = state.elements.find(el => el.id === elementId);
      if (element && element.type === 'path' && commands.length >= 2) {
        const pathData = element.data as import('../../types').PathData;
        const parsedCommands = parsePathD(pathData.d);
        const allPoints = extractEditablePoints(parsedCommands);
        
        // Find selected points
        const selectedPoints = allPoints.filter(point => 
          commands.some(cmd => 
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
    const state = get();
    const selectedCommands = state.selectedCommands;
    
    if (selectedCommands.length < 2) return;
    
    // Group commands by elementId
    const commandsByElement = selectedCommands.reduce((acc, cmd) => {
      if (!acc[cmd.elementId]) acc[cmd.elementId] = [];
      acc[cmd.elementId].push(cmd);
      return acc;
    }, {} as Record<string, typeof selectedCommands>);
    
    // Process each element
    Object.entries(commandsByElement).forEach(([elementId, commands]) => {
      const element = state.elements.find(el => el.id === elementId);
      if (element && element.type === 'path' && commands.length >= 2) {
        const pathData = element.data as import('../../types').PathData;
        const parsedCommands = parsePathD(pathData.d);
        const allPoints = extractEditablePoints(parsedCommands);
        
        // Find selected points
        const selectedPoints = allPoints.filter(point => 
          commands.some(cmd => 
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
    const state = get();
    const selectedCommands = state.selectedCommands;
    
    if (selectedCommands.length < 2) return;
    
    // Group commands by elementId
    const commandsByElement = selectedCommands.reduce((acc, cmd) => {
      if (!acc[cmd.elementId]) acc[cmd.elementId] = [];
      acc[cmd.elementId].push(cmd);
      return acc;
    }, {} as Record<string, typeof selectedCommands>);
    
    // Process each element
    Object.entries(commandsByElement).forEach(([elementId, commands]) => {
      const element = state.elements.find(el => el.id === elementId);
      if (element && element.type === 'path' && commands.length >= 2) {
        const pathData = element.data as import('../../types').PathData;
        const parsedCommands = parsePathD(pathData.d);
        const allPoints = extractEditablePoints(parsedCommands);
        
        // Find selected points
        const selectedPoints = allPoints.filter(point => 
          commands.some(cmd => 
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
    const state = get();
    const selectedCommands = state.selectedCommands;
    
    if (selectedCommands.length < 2) return;
    
    // Group commands by elementId
    const commandsByElement = selectedCommands.reduce((acc, cmd) => {
      if (!acc[cmd.elementId]) acc[cmd.elementId] = [];
      acc[cmd.elementId].push(cmd);
      return acc;
    }, {} as Record<string, typeof selectedCommands>);
    
    // Process each element
    Object.entries(commandsByElement).forEach(([elementId, commands]) => {
      const element = state.elements.find(el => el.id === elementId);
      if (element && element.type === 'path' && commands.length >= 2) {
        const pathData = element.data as import('../../types').PathData;
        const parsedCommands = parsePathD(pathData.d);
        const allPoints = extractEditablePoints(parsedCommands);
        
        // Find selected points
        const selectedPoints = allPoints.filter(point => 
          commands.some(cmd => 
            cmd.commandIndex === point.commandIndex && 
            cmd.pointIndex === point.pointIndex
          )
        );
        
        if (selectedPoints.length >= 2) {
          // Find the topmost point (smallest Y)
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
    const state = get();
    const selectedCommands = state.selectedCommands;
    
    if (selectedCommands.length < 2) return;
    
    // Group commands by elementId
    const commandsByElement = selectedCommands.reduce((acc, cmd) => {
      if (!acc[cmd.elementId]) acc[cmd.elementId] = [];
      acc[cmd.elementId].push(cmd);
      return acc;
    }, {} as Record<string, typeof selectedCommands>);
    
    // Process each element
    Object.entries(commandsByElement).forEach(([elementId, commands]) => {
      const element = state.elements.find(el => el.id === elementId);
      if (element && element.type === 'path' && commands.length >= 2) {
        const pathData = element.data as import('../../types').PathData;
        const parsedCommands = parsePathD(pathData.d);
        const allPoints = extractEditablePoints(parsedCommands);
        
        // Find selected points
        const selectedPoints = allPoints.filter(point => 
          commands.some(cmd => 
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
    const state = get();
    const selectedCommands = state.selectedCommands;
    
    if (selectedCommands.length < 2) return;
    
    // Group commands by elementId
    const commandsByElement = selectedCommands.reduce((acc, cmd) => {
      if (!acc[cmd.elementId]) acc[cmd.elementId] = [];
      acc[cmd.elementId].push(cmd);
      return acc;
    }, {} as Record<string, typeof selectedCommands>);
    
    // Process each element
    Object.entries(commandsByElement).forEach(([elementId, commands]) => {
      const element = state.elements.find(el => el.id === elementId);
      if (element && element.type === 'path' && commands.length >= 2) {
        const pathData = element.data as import('../../types').PathData;
        const parsedCommands = parsePathD(pathData.d);
        const allPoints = extractEditablePoints(parsedCommands);
        
        // Find selected points
        const selectedPoints = allPoints.filter(point => 
          commands.some(cmd => 
            cmd.commandIndex === point.commandIndex && 
            cmd.pointIndex === point.pointIndex
          )
        );
        
        if (selectedPoints.length >= 2) {
          // Find the bottommost point (largest Y)
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
    const state = get();
    const selectedCommands = state.selectedCommands;
    
    if (selectedCommands.length < 3) return;
    
    // Group commands by elementId
    const commandsByElement = selectedCommands.reduce((acc, cmd) => {
      if (!acc[cmd.elementId]) acc[cmd.elementId] = [];
      acc[cmd.elementId].push(cmd);
      return acc;
    }, {} as Record<string, typeof selectedCommands>);
    
    // Process each element
    Object.entries(commandsByElement).forEach(([elementId, commands]) => {
      const element = state.elements.find(el => el.id === elementId);
      if (element && element.type === 'path' && commands.length >= 3) {
        const pathData = element.data as import('../../types').PathData;
        const parsedCommands = parsePathD(pathData.d);
        const allPoints = extractEditablePoints(parsedCommands);
        
        // Find selected points
        const selectedPoints = allPoints.filter(point => 
          commands.some(cmd => 
            cmd.commandIndex === point.commandIndex && 
            cmd.pointIndex === point.pointIndex
          )
        );
        
        if (selectedPoints.length >= 3) {
          // Sort points by X position
          selectedPoints.sort((a, b) => a.x - b.x);
          
          // Calculate the total width and spacing
          const minX = selectedPoints[0].x;
          const maxX = selectedPoints[selectedPoints.length - 1].x;
          const totalWidth = maxX - minX;
          const spacing = totalWidth / (selectedPoints.length - 1);
          
          // Distribute points evenly
          const updatedPoints = selectedPoints.map((point, index) => ({
            ...point,
            x: minX + (spacing * index)
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

  distributeVerticallyCommands: () => {
    const state = get();
    const selectedCommands = state.selectedCommands;
    
    if (selectedCommands.length < 3) return;
    
    // Group commands by elementId
    const commandsByElement = selectedCommands.reduce((acc, cmd) => {
      if (!acc[cmd.elementId]) acc[cmd.elementId] = [];
      acc[cmd.elementId].push(cmd);
      return acc;
    }, {} as Record<string, typeof selectedCommands>);
    
    // Process each element
    Object.entries(commandsByElement).forEach(([elementId, commands]) => {
      const element = state.elements.find(el => el.id === elementId);
      if (element && element.type === 'path' && commands.length >= 3) {
        const pathData = element.data as import('../../types').PathData;
        const parsedCommands = parsePathD(pathData.d);
        const allPoints = extractEditablePoints(parsedCommands);
        
        // Find selected points
        const selectedPoints = allPoints.filter(point => 
          commands.some(cmd => 
            cmd.commandIndex === point.commandIndex && 
            cmd.pointIndex === point.pointIndex
          )
        );
        
        if (selectedPoints.length >= 3) {
          // Sort points by Y position
          selectedPoints.sort((a, b) => a.y - b.y);
          
          // Calculate the total height and spacing
          const minY = selectedPoints[0].y;
          const maxY = selectedPoints[selectedPoints.length - 1].y;
          const totalHeight = maxY - minY;
          const spacing = totalHeight / (selectedPoints.length - 1);
          
          // Distribute points evenly
          const updatedPoints = selectedPoints.map((point, index) => ({
            ...point,
            y: minY + (spacing * index)
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
});