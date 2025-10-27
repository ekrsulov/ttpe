import type { StateCreator } from 'zustand';
import { extractEditablePoints, updateCommands, normalizePathCommands, extractSubpaths, simplifyPoints, adjustControlPointForAlignment, getControlPointAlignmentInfo, getCommandStartPoint } from '../../utils/pathParserUtils';
import { performPathSimplifyPaperJS, performPathRound } from '../../utils/pathOperationsUtils';
import { formatToPrecision, PATH_DECIMAL_PRECISION } from '../../utils';
import type { CanvasElement, PathData, Point, Command, SubPath } from '../../types';
import type { CanvasStore } from '../../store/canvasStore';
import { buildElementUpdatesMap } from '../../utils/elementUpdateUtils';

// Type for the full store state (needed for get() calls)
type FullCanvasState = CanvasStore;

// ===== HELPER TYPES =====
type SelectedCommand = {
  elementId: string;
  commandIndex: number;
  pointIndex: number;
};

type PathElementContext = {
  element: CanvasElement;
  pathData: PathData;
  parsedCommands: Command[];
  editablePoints: Array<{
    commandIndex: number;
    pointIndex: number;
    x: number;
    y: number;
    isControl: boolean;
    anchor?: { x: number; y: number };
  }>;
};

type PointUpdate = {
  commandIndex: number;
  pointIndex: number;
  x: number;
  y: number;
  isControl: boolean;
};

type AlignmentStrategy = (points: PathElementContext['editablePoints']) => number;
type DistributionAxis = 'x' | 'y';

// ===== HELPER FUNCTIONS =====

/**
 * Finds the closing Z command index for a given M command
 * Returns -1 if no closing Z is found
 */
function findClosingZForMove(commands: Command[], mCommandIndex: number): number {
  // Check if the command at commandIndex is an M command
  if (commands[mCommandIndex]?.type !== 'M') return -1;

  // Look for Z commands after this M command
  for (let i = mCommandIndex + 1; i < commands.length; i++) {
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

      if (lastMIndex === mCommandIndex) {
        return i;
      }
    } else if (commands[i].type === 'M') {
      // If we hit another M, stop looking
      break;
    }
  }

  return -1;
}

/**
 * Groups selected commands by element ID
 */
function groupSelectedCommandsByElement(selectedCommands: SelectedCommand[]): Record<string, SelectedCommand[]> {
  return selectedCommands.reduce((acc: Record<string, SelectedCommand[]>, cmd: SelectedCommand) => {
    if (!acc[cmd.elementId]) acc[cmd.elementId] = [];
    acc[cmd.elementId].push(cmd);
    return acc;
  }, {});
}

/**
 * Gets path element context including parsed data and editable points
 */
function getPathElementContext(state: CanvasStore, elementId: string): PathElementContext | null {
  const element = state.elements.find((el: CanvasElement) => el.id === elementId);
  if (!element || element.type !== 'path') return null;

  const pathData = element.data as PathData;
  const parsedCommands = pathData.subPaths.flat();
  const editablePoints = extractEditablePoints(parsedCommands);

  return {
    element,
    pathData,
    parsedCommands,
    editablePoints
  };
}

/**
 * Gets selected points from a set of commands for a specific element
 */
function getSelectedPoints(
  commands: SelectedCommand[],
  editablePoints: PathElementContext['editablePoints']
): PathElementContext['editablePoints'] {
  return editablePoints.filter((point) =>
    commands.some((cmd) =>
      cmd.commandIndex === point.commandIndex &&
      cmd.pointIndex === point.pointIndex
    )
  );
}

/**
 * Applies point updates to an element and updates the store
 */
function applyPointUpdates(
  elementId: string,
  pathData: PathData,
  parsedCommands: Command[],
  updates: PointUpdate[],
  setStore: (updater: (state: CanvasStore) => Partial<CanvasStore>) => void
): void {
  const updatedCommands = updateCommands(parsedCommands, updates.map(u => ({
    ...u,
    type: 'independent' as const,
    anchor: { x: u.x, y: u.y }
  })));
  const newSubPaths = extractSubpaths(updatedCommands).map(s => s.commands);

  setStore((currentState) => ({
    elements: currentState.elements.map((el) => {
      if (el.id === elementId && el.type === 'path') {
        return { ...el, data: { ...pathData, subPaths: newSubPaths } };
      }
      return el;
    }) as CanvasElement[],
  }));
}

/**
 * Alignment strategies for different alignment types
 */
const alignmentStrategies = {
  left: (points: PathElementContext['editablePoints']) => Math.min(...points.map(p => p.x)),
  center: (points: PathElementContext['editablePoints']) => {
    const minX = Math.min(...points.map(p => p.x));
    const maxX = Math.max(...points.map(p => p.x));
    return (minX + maxX) / 2;
  },
  right: (points: PathElementContext['editablePoints']) => Math.max(...points.map(p => p.x)),
  top: (points: PathElementContext['editablePoints']) => Math.min(...points.map(p => p.y)),
  middle: (points: PathElementContext['editablePoints']) => {
    const minY = Math.min(...points.map(p => p.y));
    const maxY = Math.max(...points.map(p => p.y));
    return (minY + maxY) / 2;
  },
  bottom: (points: PathElementContext['editablePoints']) => Math.max(...points.map(p => p.y))
};

/**
 * Generic alignment function that applies a strategy to selected points
 */
function applyAlignment(
  selectedCommands: SelectedCommand[],
  strategy: AlignmentStrategy,
  axis: 'x' | 'y',
  state: CanvasStore,
  setStore: (updater: (state: CanvasStore) => Partial<CanvasStore>) => void
): void {
  if (selectedCommands.length < 2) return;

  const commandsByElement = groupSelectedCommandsByElement(selectedCommands);

  Object.entries(commandsByElement).forEach(([elementId, commands]) => {
    const context = getPathElementContext(state, elementId);
    if (!context || commands.length < 2) return;

    const selectedPoints = getSelectedPoints(commands, context.editablePoints);
    if (selectedPoints.length < 2) return;

    const newValue = strategy(selectedPoints);
    const updatedPoints: PointUpdate[] = selectedPoints.map(point => ({
      ...point,
      [axis]: newValue
    }));

    applyPointUpdates(elementId, context.pathData, context.parsedCommands, updatedPoints, setStore);
  });
}

/**
 * Collects all selected points across elements with their positions
 */
function collectAllSelectedPoints(
  selectedCommands: SelectedCommand[],
  state: CanvasStore
): Array<{
  elementId: string;
  commandIndex: number;
  pointIndex: number;
  x: number;
  y: number;
}> {
  const commandsByElement = groupSelectedCommandsByElement(selectedCommands);
  const allSelectedPoints: Array<{
    elementId: string;
    commandIndex: number;
    pointIndex: number;
    x: number;
    y: number;
  }> = [];

  Object.entries(commandsByElement).forEach(([elementId, commands]) => {
    const context = getPathElementContext(state, elementId);
    if (!context) return;

    commands.forEach((cmd) => {
      const point = context.editablePoints.find((p) =>
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
  });

  return allSelectedPoints;
}

/**
 * Generic distribution function for horizontal and vertical distribution
 */
function applyDistribution(
  selectedCommands: SelectedCommand[],
  axis: DistributionAxis,
  state: CanvasStore,
  setStore: (updater: (state: CanvasStore) => Partial<CanvasStore>) => void
): void {
  if (selectedCommands.length < 3) return;

  const allSelectedPoints = collectAllSelectedPoints(selectedCommands, state);
  if (allSelectedPoints.length < 3) return;

  // Sort by current position on the specified axis
  allSelectedPoints.sort((a, b) => a[axis] - b[axis]);

  // Calculate distribution
  const firstPoint = allSelectedPoints[0][axis];
  const lastPoint = allSelectedPoints[allSelectedPoints.length - 1][axis];
  const totalDistance = lastPoint - firstPoint;
  const spacing = totalDistance / (allSelectedPoints.length - 1);

  // Group updates by element for efficiency
  const elementUpdates = new Map<string, PointUpdate[]>();

  allSelectedPoints.forEach((pointInfo, index) => {
    if (index === 0 || index === allSelectedPoints.length - 1) {
      // Keep first and last points in place
      return;
    }

    const newValue = firstPoint + (index * spacing);

    if (!elementUpdates.has(pointInfo.elementId)) {
      elementUpdates.set(pointInfo.elementId, []);
    }

    elementUpdates.get(pointInfo.elementId)!.push({
      commandIndex: pointInfo.commandIndex,
      pointIndex: pointInfo.pointIndex,
      x: axis === 'x' ? newValue : pointInfo.x,
      y: axis === 'y' ? newValue : pointInfo.y,
      isControl: false
    });
  });

  // Apply updates to each element
  elementUpdates.forEach((updates, elementId) => {
    const context = getPathElementContext(state, elementId);
    if (!context) return;

    applyPointUpdates(elementId, context.pathData, context.parsedCommands, updates, setStore);
  });
}

// ===== MAIN INTERFACE =====

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
  pathSimplification: {
    tolerance: number;
  };
  pathRounding: {
    radius: number;
  };
  controlPointAlignment: {
    enabled: boolean;
  };
  addPointMode: {
    isActive: boolean;
    hoverPosition: Point | null;
    targetElement: string | null;
    targetSegment: { commandIndex: number; t: number } | null;
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
  convertZToLineForMPoint: (elementId: string, commandIndex: number) => void;
  moveToM: (elementId: string, commandIndex: number, pointIndex: number) => void;
  convertCommandType: (elementId: string, commandIndex: number) => void;
  cutSubpathAtPoint: (elementId: string, commandIndex: number, pointIndex: number) => void;
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
  resetSmoothBrush: () => void;
  updateSmoothBrushCursor: (x: number, y: number) => void;
  updatePathSimplification: (settings: Partial<EditPluginSlice['pathSimplification']>) => void;
  applyPathSimplification: () => void;
  updatePathRounding: (settings: Partial<EditPluginSlice['pathRounding']>) => void;
  applyPathRounding: () => void;
  getControlPointInfo: (elementId: string, commandIndex: number, pointIndex: number) => import('../../types').ControlPointInfo | null;
  setControlPointAlignmentType: (elementId: string, commandIndex1: number, pointIndex1: number, commandIndex2: number, pointIndex2: number, type: import('../../types').ControlPointType) => void;
  applyControlPointAlignment: (elementId: string, commandIndex: number, pointIndex: number, newX: number, newY: number) => void;
  finalizePointMove: (elementId: string, commandIndex: number, pointIndex: number, newX: number, newY: number) => void;
  moveSelectedPoints: (deltaX: number, deltaY: number) => void;
  activateAddPointMode: () => void;
  deactivateAddPointMode: () => void;
  updateAddPointHover: (position: Point | null, elementId: string | null, segmentInfo: { commandIndex: number; t: number } | null) => void;
  insertPointOnPath: () => { elementId: string; commandIndex: number; pointIndex: number } | null;
}

// Track last deletion time to prevent double-deletion
let lastDeletionTime = 0;
let isDeletingInProgress = false;
const DELETION_DEBOUNCE_MS = 200;

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
  pathSimplification: {
    tolerance: 1.0,
  },
  pathRounding: {
    radius: 5.0,
  },
  controlPointAlignment: {
    enabled: true,
  },
  addPointMode: {
    isActive: false,
    hoverPosition: null,
    targetElement: null,
    targetSegment: null,
  },

  // Actions
  setEditingPoint: (point) => {
    set({ editingPoint: point ? { ...point, isDragging: false, offsetX: 0, offsetY: 0 } : null });
  },

  startDraggingPoint: (elementId, commandIndex, pointIndex, offsetX, offsetY) => {
    const state = get() as FullCanvasState;

    // Check if the point being dragged is in the selection
    const isSelected = state.selectedCommands?.some((cmd) =>
      cmd.elementId === elementId &&
      cmd.commandIndex === commandIndex &&
      cmd.pointIndex === pointIndex
    ) ?? false;

    // If the point is not selected, select it first (single selection)
    if (!isSelected) {
      set({ selectedCommands: [{ elementId, commandIndex, pointIndex }] });
    }

    // Now determine the drag type based on current selection
    const currentState = get() as FullCanvasState;
    const currentIsSelected = currentState.selectedCommands?.some((cmd) =>
      cmd.elementId === elementId &&
      cmd.commandIndex === commandIndex &&
      cmd.pointIndex === pointIndex
    ) ?? false;

    if (currentIsSelected && (currentState.selectedCommands?.length ?? 0) > 1) {
      // Multiple points selected - prepare for group drag
      const initialPositions: Array<{
        elementId: string;
        commandIndex: number;
        pointIndex: number;
        x: number;
        y: number;
      }> = [];

      // Get initial positions of all selected points
      currentState.selectedCommands?.forEach((cmd) => {
        const element = state.elements.find((el) => el.id === cmd.elementId);
        if (element && element.type === 'path') {
          const pathData = element.data as PathData;
          const commands = pathData.subPaths.flat();
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
    const subpaths = pathData.subPaths;

    // Calculate start and end indices for each subpath
    const subpathInfos = subpaths.map((subpath, index) => {
      const startIndex = subpaths.slice(0, index).reduce((sum, sp) => sum + sp.length, 0);
      const endIndex = startIndex + subpath.length - 1;
      return { subpath, startIndex, endIndex };
    });

    // Find which subpath the start point belongs to
    let startSubpathIndex = -1;
    for (let i = 0; i < subpathInfos.length; i++) {
      const { startIndex, endIndex } = subpathInfos[i];
      if (startCommandIndex >= startIndex && startCommandIndex <= endIndex) {
        startSubpathIndex = i;
        break;
      }
    }

    // Find which subpath the end point belongs to
    let endSubpathIndex = -1;
    for (let i = 0; i < subpathInfos.length; i++) {
      const { startIndex, endIndex } = subpathInfos[i];
      if (endCommandIndex >= startIndex && endCommandIndex <= endIndex) {
        endSubpathIndex = i;
        break;
      }
    }

    // Only select range if both points are in the same subpath
    if (startSubpathIndex !== endSubpathIndex || startSubpathIndex === -1) return [];

    const { subpath, startIndex } = subpathInfos[startSubpathIndex];
    const allPoints = extractEditablePoints(subpath);

    // Adjust command indices to be relative to the full path
    const adjustedPoints = allPoints.map(p => ({
      ...p,
      commandIndex: p.commandIndex + startIndex
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
      // Get filtered points to check if this command is visible/selectable
      const fullState = get() as FullCanvasState;
      const filteredPoints = fullState.getFilteredEditablePoints?.(command.elementId) ?? [];
      
      // Check if the command is in the filtered points (visible in current mode)
      const isCommandVisible = filteredPoints.some(
        (p) => p.commandIndex === command.commandIndex && p.pointIndex === command.pointIndex
      );
      
      // If command is not visible, don't select it
      if (!isCommandVisible) {
        return state;
      }

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

            // Filter points in range to only include visible ones
            const visiblePointsInRange = pointsInRange.filter(p =>
              filteredPoints.some(fp => 
                fp.commandIndex === p.commandIndex && fp.pointIndex === p.pointIndex
              )
            );

            newSelectedCommands = [...state.selectedCommands, ...visiblePointsInRange];
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

    // Set active plugin to 'edit' when selecting commands
    const currentState = get() as FullCanvasState;
    if (currentState.activePlugin !== 'edit') {
      currentState.setActivePlugin('edit');
    }
  },

  clearSelectedCommands: () => {
    set({ selectedCommands: [] });
  },

  deleteSelectedCommands: () => {
    const now = Date.now();
    
    // Double protection: check both flag and timestamp
    if (isDeletingInProgress || now - lastDeletionTime < DELETION_DEBOUNCE_MS) {
      return;
    }
    
    isDeletingInProgress = true;
    lastDeletionTime = now;

    const state = get() as FullCanvasState;
    const selectedCommands = state.selectedCommands;

    if (!selectedCommands || selectedCommands.length === 0) {
      isDeletingInProgress = false;
      return;
    }

    // Check if only one point is selected to enable auto-selection of next point
    const isSinglePointSelected = selectedCommands.length === 1;
    const singleSelectedCommand = isSinglePointSelected ? selectedCommands[0] : null;

    // Group commands by elementId using helper
    const commandsByElement = groupSelectedCommandsByElement(selectedCommands);

    // Variable to track the next point coordinates to select (if applicable)
    let nextPointCoordinates: { x: number; y: number; elementId: string } | null = null;

    // Process each element
    Object.entries(commandsByElement).forEach(([elementId, commands]) => {
      const element = state.elements.find((el: CanvasElement) => el.id === elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as PathData;
        const parsedCommands = pathData.subPaths.flat();
        const allPoints = extractEditablePoints(parsedCommands);

        // Find selected points
        const selectedPoints = allPoints.filter((point) =>
          commands.some((cmd) =>
            cmd.commandIndex === point.commandIndex &&
            cmd.pointIndex === point.pointIndex
          )
        );

        // If single point selected, find the next available point before deletion
        if (isSinglePointSelected && singleSelectedCommand && singleSelectedCommand.elementId === elementId) {
          const currentPointIndex = allPoints.findIndex(p => 
            p.commandIndex === singleSelectedCommand.commandIndex &&
            p.pointIndex === singleSelectedCommand.pointIndex
          );

          if (currentPointIndex !== -1) {
            // Try to select the next command point (not control points)
            let nextIndex = currentPointIndex + 1;
            
            // Look for the next command point that won't be deleted
            while (nextIndex < allPoints.length) {
              const candidatePoint = allPoints[nextIndex];
              
              // Skip control points - only select command points
              if (candidatePoint.isControl) {
                nextIndex++;
                continue;
              }
              
              // Skip if this point is about to be deleted
              const willBeDeleted = selectedPoints.some(sp => 
                sp.commandIndex === candidatePoint.commandIndex && 
                sp.pointIndex === candidatePoint.pointIndex
              );
              
              if (!willBeDeleted) {
                // Found the next command point - save its coordinates
                nextPointCoordinates = {
                  x: candidatePoint.x,
                  y: candidatePoint.y,
                  elementId
                };
                break;
              }
              nextIndex++;
            }

            // If no next point found, try previous command point
            if (!nextPointCoordinates) {
              let prevIndex = currentPointIndex - 1;
              while (prevIndex >= 0) {
                const candidatePoint = allPoints[prevIndex];
                
                // Skip control points - only select command points
                if (candidatePoint.isControl) {
                  prevIndex--;
                  continue;
                }
                
                const willBeDeleted = selectedPoints.some(sp => 
                  sp.commandIndex === candidatePoint.commandIndex && 
                  sp.pointIndex === candidatePoint.pointIndex
                );
                
                if (!willBeDeleted) {
                  nextPointCoordinates = {
                    x: candidatePoint.x,
                    y: candidatePoint.y,
                    elementId
                  };
                  break;
                }
                prevIndex--;
              }
            }
          }
        }

        if (selectedPoints.length > 0) {
          // Group selected points by command index to handle multiple selections per command
          const pointsByCommand = new Map<number, Set<number>>();
          selectedPoints.forEach(point => {
            if (!pointsByCommand.has(point.commandIndex)) {
              pointsByCommand.set(point.commandIndex, new Set());
            }
            pointsByCommand.get(point.commandIndex)!.add(point.pointIndex);
          });

          // Sort command indices in reverse order to maintain indices during deletion
          const sortedCommandIndices = Array.from(pointsByCommand.keys()).sort((a, b) => b - a);

          let updatedCommands = [...parsedCommands];

          // Process each command with selected points
          sortedCommandIndices.forEach(cmdIndex => {
            const selectedPointIndices = pointsByCommand.get(cmdIndex)!;
            const command = updatedCommands[cmdIndex];

            if (!command) return;

            // Handle different command types
            if (command.type === 'M') {
              // For M commands, delete the entire command
              if (cmdIndex < updatedCommands.length - 1) {
                // Find the next non-Z command to convert to M
                let nextNonZIndex = cmdIndex + 1;
                while (nextNonZIndex < updatedCommands.length && updatedCommands[nextNonZIndex]?.type === 'Z') {
                  nextNonZIndex++;
                }

                if (nextNonZIndex < updatedCommands.length) {
                  const nextCommand = updatedCommands[nextNonZIndex];
                  // Convert to M using the end position
                  updatedCommands[nextNonZIndex] = {
                    type: 'M' as const,
                    position: (nextCommand as Command & { position: Point }).position
                  };
                }
              }
              // Remove the M command
              updatedCommands.splice(cmdIndex, 1);
            } else if (command.type === 'L') {
              // For L commands, remove the entire command
              updatedCommands.splice(cmdIndex, 1);
            } else if (command.type === 'C') {
              // For C commands, check which points are selected
              const hasControlPoint = selectedPointIndices.has(0) || selectedPointIndices.has(1);
              const hasEndPoint = selectedPointIndices.has(2);

              if (hasEndPoint) {
                // If end point is selected (regardless of control points), remove entire command
                updatedCommands.splice(cmdIndex, 1);
              } else if (hasControlPoint) {
                // Only control points selected, convert to L command
                updatedCommands[cmdIndex] = {
                  type: 'L' as const,
                  position: command.position // Keep only the end point
                };
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
            // Clear next point selection since element is deleted
            nextPointCoordinates = null;
            return;
          }

          // Reconstruct path string from normalized commands
          const newSubPaths = extractSubpaths(normalizedCommands).map(s => s.commands);

          // Update the element with the new path
          (set as (fn: (state: FullCanvasState) => Partial<FullCanvasState>) => void)((currentState) => ({
            ...currentState,
            elements: currentState.elements.map((el) => {
              if (el.id === elementId && el.type === 'path') {
                return { ...el, data: { ...pathData, subPaths: newSubPaths } };
              }
              return el;
            }) as CanvasElement[],
          }));
        }
      }
    });

    // Find and select the next point by coordinates after all deletions
    // IMPORTANT: Get fresh state after all updates
    const updatedState = get() as FullCanvasState;
    let nextPointToSelect: SelectedCommand | null = null;
    
    if (nextPointCoordinates) {
      const coords: { x: number; y: number; elementId: string } = nextPointCoordinates;
      const element = updatedState.elements.find((el) => el.id === coords.elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as PathData;
        const parsedCommands = pathData.subPaths.flat();
        const allPoints = extractEditablePoints(parsedCommands);

        // Find point with matching coordinates (with small tolerance for floating point)
        const TOLERANCE = 0.001;
        const foundPoint = allPoints.find(p => 
          Math.abs(p.x - coords.x) < TOLERANCE &&
          Math.abs(p.y - coords.y) < TOLERANCE
        );

        if (foundPoint) {
          nextPointToSelect = {
            elementId: coords.elementId,
            commandIndex: foundPoint.commandIndex,
            pointIndex: foundPoint.pointIndex
          };
        } else if (allPoints.length > 0) {
          // Fallback: select the first available non-control point
          const firstNonControl = allPoints.find(p => !p.isControl) || allPoints[0];
          nextPointToSelect = {
            elementId: coords.elementId,
            commandIndex: firstNonControl.commandIndex,
            pointIndex: firstNonControl.pointIndex
          };
        }
      }
    }

    // Set selection based on whether we have a next point to select
    if (nextPointToSelect) {
      set({ selectedCommands: [nextPointToSelect] });
    } else {
      // Clear selection after processing
      set({ selectedCommands: [] });
    }

    // Reset the deletion flag
    isDeletingInProgress = false;
  },

  alignLeftCommands: () => {
    const state = get() as FullCanvasState;
    const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
    applyAlignment(state.selectedCommands ?? [], alignmentStrategies.left, 'x', state, setStore);
  },

  alignCenterCommands: () => {
    const state = get() as FullCanvasState;
    const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
    applyAlignment(state.selectedCommands ?? [], alignmentStrategies.center, 'x', state, setStore);
  },

  alignRightCommands: () => {
    const state = get() as FullCanvasState;
    const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
    applyAlignment(state.selectedCommands ?? [], alignmentStrategies.right, 'x', state, setStore);
  },

  alignTopCommands: () => {
    const state = get() as FullCanvasState;
    const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
    applyAlignment(state.selectedCommands ?? [], alignmentStrategies.top, 'y', state, setStore);
  },

  alignMiddleCommands: () => {
    const state = get() as FullCanvasState;
    const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
    applyAlignment(state.selectedCommands ?? [], alignmentStrategies.middle, 'y', state, setStore);
  },

  alignBottomCommands: () => {
    const state = get() as FullCanvasState;
    const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
    applyAlignment(state.selectedCommands ?? [], alignmentStrategies.bottom, 'y', state, setStore);
  },

  distributeHorizontallyCommands: () => {
    const state = get() as FullCanvasState;
    const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
    applyDistribution(state.selectedCommands ?? [], 'x', state, setStore);
  },

  distributeVerticallyCommands: () => {
    const state = get() as FullCanvasState;
    const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
    applyDistribution(state.selectedCommands ?? [], 'y', state, setStore);
  },

  // Check if edit should work with subpaths instead of all points
  isWorkingWithSubpaths: () => {
    const state = get() as FullCanvasState;
    return (state.selectedSubpaths?.length ?? 0) > 0;
  },

  // Get filtered editable points - either from selected subpaths or all points
  getFilteredEditablePoints: (elementId: string) => {
    const state = get() as FullCanvasState;
    const hasSelectedSubpaths = state.selectedSubpaths && state.selectedSubpaths.length > 0;

    const element = state.elements.find((el) => el.id === elementId);
    if (!element || element.type !== 'path') return [];

    const pathData = element.data as PathData;
    const commands = pathData.subPaths.flat();
    const allPoints = extractEditablePoints(commands);

    if (!hasSelectedSubpaths) {
      // Normal mode: return all points
      return allPoints;
    }

    // Subpath mode: filter points to only include those from selected subpaths
    const selectedSubpaths = (state.selectedSubpaths ?? []).filter((sp) => sp.elementId === elementId);
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
    if (!state.smoothBrush) return;
    
    const { radius, strength, simplifyPoints: shouldSimplifyPoints, simplificationTolerance, minDistance } = state.smoothBrush;

    // Find the active element (first selected or the one being edited)
    let targetElementId: string | null = null;
    if ((state.selectedCommands?.length ?? 0) > 0 && state.selectedCommands) {
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
    const commands = pathData.subPaths.flat();
    let editablePoints = extractEditablePoints(commands);

    // Check if we have selected subpaths - filter editable points accordingly
    const hasSelectedSubpaths = (state.selectedSubpaths?.length ?? 0) > 0;
    const selectedSubpathsForElement = hasSelectedSubpaths 
      ? (state.selectedSubpaths ?? []).filter(sp => sp.elementId === targetElementId)
      : [];

    if (selectedSubpathsForElement.length > 0) {
      // Filter editable points to only those in selected subpaths
      const subpaths = extractSubpaths(commands);
      const filteredPoints: typeof editablePoints = [];

      selectedSubpathsForElement.forEach((selected: { subpathIndex: number }) => {
        const subpathData = subpaths[selected.subpathIndex];
        if (subpathData) {
          // Include points that fall within this subpath's command range
          const pointsInSubpath = editablePoints.filter(point =>
            point.commandIndex >= subpathData.startIndex &&
            point.commandIndex <= subpathData.endIndex
          );
          filteredPoints.push(...pointsInSubpath);
        }
      });

      editablePoints = filteredPoints;
    }

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

    if ((state.selectedCommands?.length ?? 0) > 0) {
      // Apply smoothing only to selected commands

      (state.selectedCommands ?? []).forEach((selectedCmd) => {
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

        if ((state.selectedCommands?.length ?? 0) > 0) {
          
          // When points are selected, simplify only the updated points (those that were smoothed)
          // First, create a map of the updated points for quick lookup
          const updatedPointsMap = new Map<string, typeof updatedPoints[0]>();
          updatedPoints.forEach(p => {
            const key = `${p.commandIndex}-${p.pointIndex}`;
            updatedPointsMap.set(key, p);
          });

          // Apply updates to get intermediate state
          const smoothedCommands = updateCommands(commands, updatedPoints.map(u => ({ ...u, type: 'independent' as const, anchor: { x: u.x, y: u.y } })));
          const allPointsAfterSmoothing = extractEditablePoints(smoothedCommands);

          // Filter to only the points that were actually updated (smoothed)
          const pointsToSimplify = allPointsAfterSmoothing.filter(p => {
            const key = `${p.commandIndex}-${p.pointIndex}`;
            return updatedPointsMap.has(key);
          });

          // Simplify only the updated points
          const simplifiedUpdatedPoints = simplifyPoints(pointsToSimplify, simplificationTolerance, minDistance);

          // Create final points array by replacing selected points with simplified points
          const finalPointsAfterSimplification: typeof allPointsAfterSmoothing = [];
          
          // Create a set of command-point keys that were simplified
          const originalSelectedKeys = new Set(updatedPoints.map(p => `${p.commandIndex}-${p.pointIndex}`));
          
          // First, add all points that were NOT in the original selection
          allPointsAfterSmoothing.forEach(p => {
            const key = `${p.commandIndex}-${p.pointIndex}`;
            if (!originalSelectedKeys.has(key)) {
              finalPointsAfterSimplification.push(p);
            }
          });
          
          // Then, add all the simplified points (this replaces the original selected points)
          // Convert simplified points to the proper format
          simplifiedUpdatedPoints.forEach(sp => {
            finalPointsAfterSimplification.push({
              commandIndex: sp.commandIndex,
              pointIndex: sp.pointIndex,
              x: sp.x,
              y: sp.y,
              isControl: sp.isControl,
              anchor: { x: sp.x, y: sp.y }
            });
          });
          
          // Sort by command index to maintain order
          finalPointsAfterSimplification.sort((a, b) => {
            if (a.commandIndex !== b.commandIndex) {
              return a.commandIndex - b.commandIndex;
            }
            return a.pointIndex - b.pointIndex;
          });

          // Rebuild the path from the mixed points (original + simplified selected)
          simplifiedPointsForRebuild = finalPointsAfterSimplification;
          rebuildPath = true;
        } else {
          // When no points are selected (brush mode), apply the same logic as with selected points
          // but using the brush-affected points instead of selected points
          
          // Create a map of the updated points for quick lookup
          const updatedPointsMap = new Map<string, typeof updatedPoints[0]>();
          updatedPoints.forEach(p => {
            const key = `${p.commandIndex}-${p.pointIndex}`;
            updatedPointsMap.set(key, p);
          });

          // Apply updates to get intermediate state
          const smoothedCommands = updateCommands(commands, updatedPoints.map(u => ({ ...u, type: 'independent' as const, anchor: { x: u.x, y: u.y } })));
          const allPointsAfterSmoothing = extractEditablePoints(smoothedCommands);

          // Filter to only the points that were actually updated (affected by brush)
          const pointsToSimplify = allPointsAfterSmoothing.filter(p => {
            const key = `${p.commandIndex}-${p.pointIndex}`;
            return updatedPointsMap.has(key);
          });

          // Simplify only the brush-affected points
          const simplifiedUpdatedPoints = simplifyPoints(pointsToSimplify, simplificationTolerance, minDistance);

          // Create final points array by replacing brush-affected points with simplified points
          const finalPointsAfterSimplification: typeof allPointsAfterSmoothing = [];
          const originalBrushKeys = new Set(updatedPoints.map(p => `${p.commandIndex}-${p.pointIndex}`));
          
          // First, add all points that were NOT affected by the brush
          allPointsAfterSmoothing.forEach(p => {
            const key = `${p.commandIndex}-${p.pointIndex}`;
            if (!originalBrushKeys.has(key)) {
              finalPointsAfterSimplification.push(p);
            }
          });
          
          // Then, add all the simplified points (this replaces the original brush-affected points)
          simplifiedUpdatedPoints.forEach(sp => {
            finalPointsAfterSimplification.push({
              commandIndex: sp.commandIndex,
              pointIndex: sp.pointIndex,
              x: sp.x,
              y: sp.y,
              isControl: sp.isControl,
              anchor: { x: sp.x, y: sp.y }
            });
          });
          
          // Sort by command index to maintain order
          finalPointsAfterSimplification.sort((a, b) => {
            if (a.commandIndex !== b.commandIndex) {
              return a.commandIndex - b.commandIndex;
            }
            return a.pointIndex - b.pointIndex;
          });

          // Rebuild the path from the mixed points (original + simplified brush-affected)
          simplifiedPointsForRebuild = finalPointsAfterSimplification;
          rebuildPath = true;
        }
      }

      if (rebuildPath) {
        if (simplifiedPointsForRebuild.length > 0) {
          // Extract original subpaths to maintain separation
          const originalSubpaths = extractSubpaths(commands);

          if (originalSubpaths.length > 1) {
            // Multiple subpaths - rebuild each subpath separately
            const newSubPaths: SubPath[] = [];

            // Group simplified points by their original subpath
            originalSubpaths.forEach((subpath) => {
              const subpathPoints = simplifiedPointsForRebuild.filter(point =>
                point.commandIndex >= subpath.startIndex && point.commandIndex <= subpath.endIndex
              );

              if (subpathPoints.length > 0) {
                const newSubPath: Command[] = [];

                // Start with M command
                newSubPath.push({
                  type: 'M',
                  position: { x: subpathPoints[0].x, y: subpathPoints[0].y }
                });

                // Add L commands for the rest of the points
                for (let i = 1; i < subpathPoints.length; i++) {
                  newSubPath.push({
                    type: 'L',
                    position: { x: subpathPoints[i].x, y: subpathPoints[i].y }
                  });
                }

                newSubPaths.push(newSubPath);
              }
            });

            // Update the element with the new subpaths
            (get() as FullCanvasState).updateElement(targetElementId, {
              data: {
                ...pathData,
                subPaths: newSubPaths
              },
            });

          } else {
            // Single subpath - rebuild from simplified points
            if (simplifiedPointsForRebuild.length > 0) {
              const newSubPath: Command[] = [];

              // Start with M command
              newSubPath.push({
                type: 'M',
                position: { x: simplifiedPointsForRebuild[0].x, y: simplifiedPointsForRebuild[0].y }
              });

              // Add L commands for the rest of the points
              for (let i = 1; i < simplifiedPointsForRebuild.length; i++) {
                newSubPath.push({
                  type: 'L',
                  position: { x: simplifiedPointsForRebuild[i].x, y: simplifiedPointsForRebuild[i].y }
                });
              }

              // Update the element with the new single subpath
              (get() as FullCanvasState).updateElement(targetElementId, {
                data: {
                  ...pathData,
                  subPaths: [newSubPath]
                },
              });
            }
          }
        }
      } else {
        const updatedCommands = updateCommands(commands, finalPoints.map(u => ({ ...u, type: 'independent' as const, anchor: { x: u.x, y: u.y } })));
        const newSubPaths = extractSubpaths(updatedCommands).map(s => s.commands);

        (get() as FullCanvasState).updateElement(targetElementId, {
          data: {
            ...pathData,
            subPaths: newSubPaths
          },
        });
      }

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

  resetSmoothBrush: () => {
    set(() => ({
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
    }));
  },

  updateSmoothBrushCursor: (x: number, y: number) => {
    set((state) => ({
      smoothBrush: { ...state.smoothBrush, cursorX: x, cursorY: y },
    }));
  },

  updatePathSimplification: (settings) => {
    set((state) => ({
      pathSimplification: { ...state.pathSimplification, ...settings },
    }));
  },

  applyPathSimplification: () => {
    const state = get() as FullCanvasState;
    const { tolerance } = state.pathSimplification ?? { tolerance: 1 };

    // Find the active element (first selected or the one being edited)
    let targetElementId: string | null = null;
    if ((state.selectedCommands?.length ?? 0) > 0) {
      targetElementId = state.selectedCommands?.[0].elementId ?? null;
    } else if (state.editingPoint) {
      targetElementId = state.editingPoint.elementId;
    } else if ((state as CanvasStore).selectedIds && (state as CanvasStore).selectedIds.length > 0) {
      // Fallback to first selected element
      targetElementId = (state as CanvasStore).selectedIds[0];
    }

    if (!targetElementId) return;

    const element = state.elements.find((el) => el.id === targetElementId);
    if (!element || element.type !== 'path') return;

    const pathData = element.data as import('../../types').PathData;
    const allCommands = pathData.subPaths.flat();

    // Check if we have selected subpaths
    const hasSelectedSubpaths = (state.selectedSubpaths?.length ?? 0) > 0;
    const selectedSubpathsForElement = hasSelectedSubpaths 
      ? (state.selectedSubpaths ?? []).filter(sp => sp.elementId === targetElementId)
      : [];

    if (selectedSubpathsForElement.length > 0) {
      // Apply simplification only to selected subpaths
      const subpaths = extractSubpaths(allCommands);
      const newSubPaths: SubPath[] = [];

      subpaths.forEach((subpathData, index) => {
        const isSelected = selectedSubpathsForElement.some(sp => sp.subpathIndex === index);
        
        if (isSelected) {
          // Simplify this subpath
          const tempPathData: import('../../types').PathData = {
            ...pathData,
            subPaths: [subpathData.commands]
          };

          const simplifiedTempPath = performPathSimplifyPaperJS(tempPathData, tolerance);
          
          if (simplifiedTempPath && simplifiedTempPath.subPaths.length > 0) {
            newSubPaths.push(simplifiedTempPath.subPaths[0]);
          } else {
            // If simplification failed, keep original
            newSubPaths.push(subpathData.commands);
          }
        } else {
          // Keep original subpath
          newSubPaths.push(subpathData.commands);
        }
      });

      // Update the element
      (get() as FullCanvasState).updateElement(targetElementId, {
        data: {
          ...pathData,
          subPaths: newSubPaths
        },
      });
    } else if ((state.selectedCommands?.length ?? 0) > 0) {
      // Simplify only the selected portion of the path
      const selectedElementId = state.selectedCommands?.[0].elementId ?? '';
      const selectedCommands = (state.selectedCommands ?? []).filter(cmd => cmd.elementId === selectedElementId);

      // Get the range of commands that contain the selected points
      const commandIndices = selectedCommands.map(cmd => cmd.commandIndex);
      const minCommandIndex = Math.min(...commandIndices);
      const maxCommandIndex = Math.max(...commandIndices);

      // Extract the subpath containing the selected commands
      let selectedSubPath = allCommands.slice(minCommandIndex, maxCommandIndex + 1);
      let addedArtificialM = false;

      // Ensure the subpath starts with M command for Paper.js compatibility
      if (selectedSubPath.length > 0 && selectedSubPath[0].type !== 'M') {
        // Find the position to start from - get it from the previous command or the first command's position
        let startPosition: { x: number; y: number } = { x: 0, y: 0 };
        
        if (minCommandIndex > 0) {
          // Get position from the previous command
          const prevCommand = allCommands[minCommandIndex - 1];
          if (prevCommand.type !== 'Z' && 'position' in prevCommand) {
            startPosition = prevCommand.position;
          }
        }
        
        // If we couldn't get position from previous command, try the first selected command
        if (startPosition.x === 0 && startPosition.y === 0) {
          const firstCmd = selectedSubPath[0];
          if (firstCmd.type !== 'Z' && 'position' in firstCmd) {
            startPosition = firstCmd.position;
          }
        }

        // Prepend M command to ensure Paper.js compatibility
        selectedSubPath = [
          { type: 'M' as const, position: startPosition },
          ...selectedSubPath
        ];
        addedArtificialM = true;
      }

      // Create a temporary path data with just the selected subpath
      const tempPathData: import('../../types').PathData = {
        ...pathData,
        subPaths: [selectedSubPath]
      };

      // Simplify the selected portion
      const simplifiedTempPath = performPathSimplifyPaperJS(tempPathData, tolerance);

      if (simplifiedTempPath && simplifiedTempPath.subPaths.length > 0) {
        let simplifiedCommands = simplifiedTempPath.subPaths[0];

        // If we added an artificial M command, remove it from the simplified result
        if (addedArtificialM && simplifiedCommands.length > 0 && simplifiedCommands[0].type === 'M') {
          simplifiedCommands = simplifiedCommands.slice(1);
        }

        // Fix continuity: if we're not at the beginning of the path and the first simplified command is M,
        // convert it to L to maintain path continuity
        if (minCommandIndex > 0 && simplifiedCommands.length > 0 && simplifiedCommands[0].type === 'M') {
          simplifiedCommands = [
            { type: 'L', position: simplifiedCommands[0].position },
            ...simplifiedCommands.slice(1)
          ];
        }

        // Replace the original commands with the simplified ones
        const newCommands = [...allCommands];
        newCommands.splice(minCommandIndex, maxCommandIndex - minCommandIndex + 1, ...simplifiedCommands);

        // Reconstruct subpaths
        const newSubPaths = extractSubpaths(newCommands).map(s => s.commands);

        // Update the element
        (get() as FullCanvasState).updateElement(targetElementId, {
          data: {
            ...pathData,
            subPaths: newSubPaths
          },
        });

        // Clear selection after simplification
        state.clearSelectedCommands?.();
      }
    } else {
      // No selection - simplify the entire path
      const simplifiedPathData = performPathSimplifyPaperJS(pathData, tolerance);

      if (simplifiedPathData) {
        // Update the element with the simplified path
        (get() as FullCanvasState).updateElement(targetElementId, {
          data: simplifiedPathData,
        });
      }
    }
  },

  getControlPointInfo: (elementId: string, commandIndex: number, pointIndex: number) => {
    const state = get() as FullCanvasState;
    const element = state.elements.find(el => el.id === elementId);
    if (!element || element.type !== 'path') return null;

    const pathData = element.data as PathData;
    const commands = pathData.subPaths.flat();
    const points = extractEditablePoints(commands);

    // Calculate alignment info on-demand
    const alignmentInfo = getControlPointAlignmentInfo(commands, points, commandIndex, pointIndex);
    
    if (!alignmentInfo) return null;

    return {
      commandIndex,
      pointIndex,
      anchor: alignmentInfo.anchor,
      isControl: true,
      // Include type and pairing info from alignment calculation
      type: alignmentInfo.type,
      pairedCommandIndex: alignmentInfo.pairedCommandIndex,
      pairedPointIndex: alignmentInfo.pairedPointIndex
    } as import('../../types').ControlPointInfo & { type: import('../../types').ControlPointType; pairedCommandIndex?: number; pairedPointIndex?: number };
  },

  setControlPointAlignmentType: (elementId: string, commandIndex1: number, pointIndex1: number, commandIndex2: number, pointIndex2: number, type: import('../../types').ControlPointType) => {
    const state = get() as FullCanvasState;
    const element = state.elements.find(el => el.id === elementId);
    if (!element || element.type !== 'path') return;

    const pathData = element.data as PathData;
    const commands = pathData.subPaths.flat();
    const points = extractEditablePoints(commands);

    // Find the control points
    const point1 = points.find(p => p.commandIndex === commandIndex1 && p.pointIndex === pointIndex1);
    const point2 = points.find(p => p.commandIndex === commandIndex2 && p.pointIndex === pointIndex2);

    if (!point1 || !point2 || !point1.isControl || !point2.isControl) return;

    // Verify they share the same anchor (they should be paired)
    const tolerance = 0.1;
    const anchorDistance = Math.sqrt(
      Math.pow(point1.anchor.x - point2.anchor.x, 2) +
      Math.pow(point1.anchor.y - point2.anchor.y, 2)
    );

    if (anchorDistance >= tolerance) return;

    const sharedAnchor = point1.anchor;

    // Calculate the new position for point1 based on the alignment type
    const newPoint1Position = adjustControlPointForAlignment(
      { x: point1.x, y: point1.y },
      { x: point2.x, y: point2.y },
      sharedAnchor,
      type
    );

    // Update point1 with new position
    point1.x = newPoint1Position.x;
    point1.y = newPoint1Position.y;

    // Update the path with modified points
    const newCommands = updateCommands(commands, [point1]);
    const newSubPaths = extractSubpaths(newCommands).map(s => s.commands);

    (get() as FullCanvasState).updateElement(elementId, {
      data: {
        ...pathData,
        subPaths: newSubPaths
      }
    });
  },

  applyControlPointAlignment: (elementId: string, commandIndex: number, pointIndex: number, newX: number, newY: number) => {
    const state = get() as FullCanvasState;
    const element = state.elements.find((el: CanvasElement) => el.id === elementId);
    if (!element || element.type !== 'path') return;

    const pathData = element.data as PathData;
    const commands = pathData.subPaths.flat();
    const points = extractEditablePoints(commands);

    // Find the control point that was moved
    const movedPoint = points.find(p => p.commandIndex === commandIndex && p.pointIndex === pointIndex);
    if (!movedPoint || !movedPoint.isControl) return;

    // Get the alignment info for this point (calculated on-demand)
    const alignmentInfo = getControlPointAlignmentInfo(commands, points, commandIndex, pointIndex);

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
    const updatedCommands = updateCommands(commands, [pairedPoint]);
    const newSubPaths = extractSubpaths(updatedCommands).map(s => s.commands);
    (get() as FullCanvasState).updateElement(elementId, {
      data: {
        ...pathData,
        subPaths: newSubPaths
      }
    });
  },

  finalizePointMove: (elementId: string, commandIndex: number, pointIndex: number, newX: number, newY: number) => {
    // Apply control point alignment if this point has alignment configured
    get().applyControlPointAlignment(elementId, commandIndex, pointIndex, newX, newY);
  },

  moveSelectedPoints: (deltaX: number, deltaY: number) => {
    const state = get() as FullCanvasState;
    const selectedCommands = get().selectedCommands;
    const precision = state.settings.keyboardMovementPrecision;

    if (selectedCommands.length === 0) return;

    // Group by elementId
    const commandsByElement = selectedCommands.reduce((acc, cmd) => {
      if (!acc[cmd.elementId]) {
        acc[cmd.elementId] = [];
      }
      acc[cmd.elementId].push(cmd);
      return acc;
    }, {} as Record<string, typeof selectedCommands>);

    // Process each element
    Object.entries(commandsByElement).forEach(([elementId, commands]) => {
      const element = state.elements.find((el) => el.id === elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as PathData;
        const allCommands = pathData.subPaths.flat();
        const newCommands = [...allCommands];

        commands.forEach(({ commandIndex, pointIndex }) => {
          if (commandIndex < newCommands.length) {
            const command = newCommands[commandIndex];
            if (command.type === 'M' || command.type === 'L') {
              if (pointIndex === 0) {
                command.position.x = formatToPrecision(command.position.x + deltaX, precision);
                command.position.y = formatToPrecision(command.position.y + deltaY, precision);
              }
            } else if (command.type === 'C') {
              if (pointIndex === 0) {
                command.controlPoint1.x = formatToPrecision(command.controlPoint1.x + deltaX, precision);
                command.controlPoint1.y = formatToPrecision(command.controlPoint1.y + deltaY, precision);
              } else if (pointIndex === 1) {
                command.controlPoint2.x = formatToPrecision(command.controlPoint2.x + deltaX, precision);
                command.controlPoint2.y = formatToPrecision(command.controlPoint2.y + deltaY, precision);
              } else if (pointIndex === 2) {
                command.position.x = formatToPrecision(command.position.x + deltaX, precision);
                command.position.y = formatToPrecision(command.position.y + deltaY, precision);
              }
            }
          }
        });

        // Reconstruct subPaths
        const extractedSubpaths = extractSubpaths(newCommands);
        const newSubPaths = extractedSubpaths.map(subpath => subpath.commands);
        state.updateElement(elementId, {
          data: { ...pathData, subPaths: newSubPaths }
        });
      }
    });
  },

  deleteZCommandForMPoint: (elementId: string, commandIndex: number) => {
    const state = get() as FullCanvasState;
    const element = state.elements.find((el: CanvasElement) => el.id === elementId);

    if (!element || element.type !== 'path') return;

    const pathData = element.data as PathData;
    const commands = pathData.subPaths.flat();

    const zCommandIndex = findClosingZForMove(commands, commandIndex);

    if (zCommandIndex !== -1) {
      // Remove the Z command
      const updatedCommands = commands.filter((_, index) => index !== zCommandIndex);

      // Normalize and reconstruct path
      const normalizedCommands = normalizePathCommands(updatedCommands);
      const newSubPaths = extractSubpaths(normalizedCommands).map(s => s.commands);

      // Update the element
      (set as (fn: (state: FullCanvasState) => Partial<FullCanvasState>) => void)((currentState) => ({
        ...currentState,
        elements: currentState.elements.map((el) => {
          if (el.id === elementId && el.type === 'path') {
            return { ...el, data: { ...pathData, subPaths: newSubPaths } };
          }
          return el;
        }) as CanvasElement[],
      }));
    }
  },

  convertZToLineForMPoint: (elementId: string, commandIndex: number) => {
    const state = get() as FullCanvasState;
    const element = state.elements.find((el: CanvasElement) => el.id === elementId);

    if (!element || element.type !== 'path') return;

    const pathData = element.data as PathData;
    const commands = pathData.subPaths.flat();

    const zCommandIndex = findClosingZForMove(commands, commandIndex);

    if (zCommandIndex !== -1) {
      // Replace the Z command with an L command to the M position
      const mCommand = commands[commandIndex];
      const updatedCommands = [...commands];
      
      // Type guard to ensure M command has position
      if (mCommand.type === 'M' && 'position' in mCommand) {
        updatedCommands[zCommandIndex] = {
          type: 'L' as const,
          position: mCommand.position
        };

        // Normalize and reconstruct path
        const normalizedCommands = normalizePathCommands(updatedCommands);
        const newSubPaths = extractSubpaths(normalizedCommands).map(s => s.commands);

        // Update the element
      (set as (fn: (state: FullCanvasState) => Partial<FullCanvasState>) => void)((currentState) => ({
        ...currentState,
        elements: currentState.elements.map((el) => {
          if (el.id === elementId && el.type === 'path') {
            return { ...el, data: { ...pathData, subPaths: newSubPaths } };
          }
          return el;
        }) as CanvasElement[],
      }));
      }
    }
  },

  moveToM: (elementId: string, commandIndex: number, pointIndex: number) => {
    const state = get() as FullCanvasState;
    const element = state.elements.find((el: CanvasElement) => el.id === elementId);

    if (!element || element.type !== 'path') return;

    const pathData = element.data as PathData;
    const commands = pathData.subPaths.flat();

    // Check if the command exists and is L or C
    const command = commands[commandIndex];
    if (!command || (command.type !== 'L' && command.type !== 'C')) return;

    // Check if this is the last point of the command
    let pointsLength = 0;
    if (command.type === 'L') pointsLength = 1;
    else if (command.type === 'C') pointsLength = 3;
    const isLastPoint = pointIndex === pointsLength - 1;
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
    let pointToMove: Point | null = null;
    if (command.type === 'L') {
      if (pointIndex === 0) pointToMove = command.position;
    } else if (command.type === 'C') {
      if (pointIndex === 0) pointToMove = command.controlPoint1;
      else if (pointIndex === 1) pointToMove = command.controlPoint2;
      else if (pointIndex === 2) pointToMove = command.position;
    }
    if (!pointToMove) return;

    const updatedCommands = [...commands];

    // Move the last point to the M position to close the subpath
    const mPosition = (commands[subpathMIndex] as Command & { type: 'M' }).position;
    const newCommand = { ...command };
    if (command.type === 'L') {
      const lCommand = newCommand as Command & { type: 'L' };
      if (pointIndex === 0) lCommand.position = mPosition;
      updatedCommands[commandIndex] = lCommand;
    } else if (command.type === 'C') {
      const cCommand = newCommand as Command & { type: 'C' };
      if (pointIndex === 0) cCommand.controlPoint1 = { ...command.controlPoint1, ...mPosition };
      else if (pointIndex === 1) cCommand.controlPoint2 = { ...command.controlPoint2, ...mPosition };
      else if (pointIndex === 2) cCommand.position = mPosition;
      updatedCommands[commandIndex] = cCommand;
    }

    // For C commands, we need to adjust control points to maintain curve shape
    if (command.type === 'C') {
      // For a C command, points are: [control1, control2, endpoint]
      // When moving the endpoint to the M position, we need to adjust control points
      const mPosition = (commands[subpathMIndex] as Command & { type: 'M' }).position;
      const originalEndpoint = command.position;

      // Calculate the offset
      const offsetX = mPosition.x - originalEndpoint.x;
      const offsetY = mPosition.y - originalEndpoint.y;

      // Move control points by the same offset to maintain relative positions
      updatedCommands[commandIndex] = {
        ...command,
        controlPoint1: { ...command.controlPoint1, x: command.controlPoint1.x + offsetX, y: command.controlPoint1.y + offsetY },
        controlPoint2: { ...command.controlPoint2, x: command.controlPoint2.x + offsetX, y: command.controlPoint2.y + offsetY },
        position: mPosition // endpoint moved to M position
      };
    }

    // Normalize and reconstruct path
    const normalizedCommands = normalizePathCommands(updatedCommands);

    const newSubPaths = extractSubpaths(normalizedCommands).map(s => s.commands);

    // Update the element
    (set as (fn: (state: FullCanvasState) => Partial<FullCanvasState>) => void)((currentState) => ({
      ...currentState,
      elements: currentState.elements.map((el) => {
        if (el.id === elementId && el.type === 'path') {
          return { ...el, data: { ...pathData, subPaths: newSubPaths } };
        }
        return el;
      }) as CanvasElement[],
    }));
  },

  convertCommandType: (elementId: string, commandIndex: number) => {
    const state = get() as FullCanvasState;
    const element = state.elements.find((el: CanvasElement) => el.id === elementId);

    if (!element || element.type !== 'path') return;

    const pathData = element.data as PathData;
    const commands = pathData.subPaths.flat();

    const command = commands[commandIndex];
    if (!command) return;

    // Helper function to get command end point
    const getCommandEndPoint = (cmd: Command): Point | null => {
      if (cmd.type === 'Z') return null;
      return cmd.position;
    };

    const updatedCommands = [...commands];

    if (command.type === 'L') {
      // Convert L to C: need to add control points
      // For a smooth conversion, place control points at 1/3 and 2/3 of the line
      const startPoint = commandIndex > 0 ? getCommandEndPoint(commands[commandIndex - 1]) : { x: 0, y: 0 };
      const endPoint = command.position;

      if (startPoint) {
        // Calculate control points at 1/3 and 2/3 of the line
        const control1 = {
          x: startPoint.x + (endPoint.x - startPoint.x) * (1 / 3),
          y: startPoint.y + (endPoint.y - startPoint.y) * (1 / 3)
        };
        const control2 = {
          x: startPoint.x + (endPoint.x - startPoint.x) * (2 / 3),
          y: startPoint.y + (endPoint.y - startPoint.y) * (2 / 3)
        };

        updatedCommands[commandIndex] = {
          type: 'C',
          controlPoint1: {
            ...control1,
            commandIndex,
            pointIndex: 0,
            anchor: startPoint,
            isControl: true
          },
          controlPoint2: {
            ...control2,
            commandIndex,
            pointIndex: 1,
            anchor: startPoint,
            isControl: true
          },
          position: endPoint
        };
      }
    } else if (command.type === 'C') {
      // Convert C to L: keep only the endpoint
      const endPoint = command.position; // Last point is the endpoint
      updatedCommands[commandIndex] = {
        type: 'L',
        position: endPoint
      };
    }

    // Normalize and reconstruct path
    const normalizedCommands = normalizePathCommands(updatedCommands);

    const newSubPaths = extractSubpaths(normalizedCommands).map(s => s.commands);

    // Update the element
    (set as (fn: (state: FullCanvasState) => Partial<FullCanvasState>) => void)((currentState) => ({
      ...currentState,
      elements: currentState.elements.map((el) => {
        if (el.id === elementId && el.type === 'path') {
          return { ...el, data: { ...pathData, subPaths: newSubPaths } };
        }
        return el;
      }) as CanvasElement[],
    }));
  },

  cutSubpathAtPoint: (elementId: string, commandIndex: number, _pointIndex: number) => {
    const state = get() as FullCanvasState;
    const element = state.elements.find((el: CanvasElement) => el.id === elementId);

    if (!element || element.type !== 'path') return;

    const pathData = element.data as PathData;
    const commands = pathData.subPaths.flat();

    const command = commands[commandIndex];
    if (!command || (command.type !== 'L' && command.type !== 'C')) return;

    // Get the current point position (always the command's position for cutting)
    const currentPoint = command.position;
    if (!currentPoint) return;

    const updatedCommands = [...commands];

    // Create new M command at current point + 5
    const newMCommand: Command = {
      type: 'M',
      position: {
        x: currentPoint.x + 5,
        y: currentPoint.y + 5
      }
    };

    // Insert the new M command right after the current command
    updatedCommands.splice(commandIndex + 1, 0, newMCommand);

    // The remaining commands after the original commandIndex are already in the right place

    // Normalize and reconstruct path
    const normalizedCommands = normalizePathCommands(updatedCommands);

    const newSubPaths = extractSubpaths(normalizedCommands).map(s => s.commands);

    // Update the element
    (set as (fn: (state: FullCanvasState) => Partial<FullCanvasState>) => void)((currentState) => ({
      ...currentState,
      elements: currentState.elements.map((el) => {
        if (el.id === elementId && el.type === 'path') {
          return { ...el, data: { ...pathData, subPaths: newSubPaths } };
        }
        return el;
      }) as CanvasElement[],
    }));

    // Clear selection after cutting subpath (indices may have changed)
    const currentState = get() as FullCanvasState;
    currentState.clearSelectedCommands?.();
  },  updatePathRounding: (settings) => {
    set((state) => ({
      pathRounding: { ...state.pathRounding, ...settings },
    }));
  },

  applyPathRounding: () => {
    const state = get() as FullCanvasState;
    const { radius } = state.pathRounding ?? { radius: 5 };

    // Find the active element (first selected or the one being edited)
    let targetElementId: string | null = null;
    if ((state.selectedCommands?.length ?? 0) > 0) {
      targetElementId = state.selectedCommands?.[0].elementId ?? null;
    } else if (state.editingPoint) {
      targetElementId = state.editingPoint.elementId;
    } else if ((state as CanvasStore).selectedIds && (state as CanvasStore).selectedIds.length > 0) {
      // Fallback to first selected element
      targetElementId = (state as CanvasStore).selectedIds[0];
    }

    if (!targetElementId) return;

    const element = state.elements.find((el) => el.id === targetElementId);
    if (!element || element.type !== 'path') return;

    const pathData = element.data as import('../../types').PathData;

    // Check if we have selected subpaths
    const hasSelectedSubpaths = (state.selectedSubpaths?.length ?? 0) > 0;
    const selectedSubpathsForElement = hasSelectedSubpaths 
      ? (state.selectedSubpaths ?? []).filter(sp => sp.elementId === targetElementId)
      : [];

    if (selectedSubpathsForElement.length > 0) {
      // Apply rounding only to selected subpaths
      const allCommands = pathData.subPaths.flat();
      const subpaths = extractSubpaths(allCommands);
      const newSubPaths: SubPath[] = [];

      subpaths.forEach((subpathData, index) => {
        const isSelected = selectedSubpathsForElement.some(sp => sp.subpathIndex === index);
        
        if (isSelected) {
          // Round this subpath
          const tempPathData: import('../../types').PathData = {
            ...pathData,
            subPaths: [subpathData.commands]
          };

          const roundedTempPath = performPathRound(tempPathData, radius);
          
          if (roundedTempPath && roundedTempPath.subPaths.length > 0) {
            newSubPaths.push(roundedTempPath.subPaths[0]);
          } else {
            // If rounding failed, keep original
            newSubPaths.push(subpathData.commands);
          }
        } else {
          // Keep original subpath
          newSubPaths.push(subpathData.commands);
        }
      });

      // Update the element
      (get() as FullCanvasState).updateElement(targetElementId, {
        data: {
          ...pathData,
          subPaths: newSubPaths
        },
      });

      // Clear selection after rounding
      state.clearSelectedCommands?.();
    } else {
      // Apply path rounding using the utility function to the entire path
      const roundedPathData = performPathRound(pathData, radius);

      if (roundedPathData) {
        // Update the element with the rounded path
        (get() as FullCanvasState).updateElement(targetElementId, {
          data: roundedPathData,
        });

        // Clear selection after rounding
        state.clearSelectedCommands?.();
      }
    }
  },

  // Add Point Mode Actions
  activateAddPointMode: () => {
    set((state) => ({
      addPointMode: {
        ...state.addPointMode,
        isActive: true,
      },
    }));
  },

  deactivateAddPointMode: () => {
    set(() => ({
      addPointMode: {
        isActive: false,
        hoverPosition: null,
        targetElement: null,
        targetSegment: null,
      },
    }));
  },

  updateAddPointHover: (position: Point | null, elementId: string | null, segmentInfo: { commandIndex: number; t: number } | null) => {
    set((state) => ({
      addPointMode: {
        ...state.addPointMode,
        hoverPosition: position,
        targetElement: elementId,
        targetSegment: segmentInfo,
      },
    }));
  },

  insertPointOnPath: () => {
    const state = get() as FullCanvasState;
    const addPointMode = state.addPointMode;

    if (!addPointMode || !addPointMode.isActive || !addPointMode.hoverPosition || !addPointMode.targetElement || !addPointMode.targetSegment) {
      return null;
    }

    const element = state.elements.find((el: CanvasElement) => el.id === addPointMode.targetElement);
    if (!element || element.type !== 'path') return null;

    const pathData = element.data as PathData;
    const commands = pathData.subPaths.flat();
    const { commandIndex, t } = addPointMode.targetSegment;
    
    const command = commands[commandIndex];
    if (!command || (command.type !== 'L' && command.type !== 'C')) return null;

    // Get the start point for this command
    const startPoint = getCommandStartPoint(commands, commandIndex);
    if (!startPoint) return null;

    const newCommands = [...commands];
    const insertPosition = addPointMode.hoverPosition;
    
    // Store info about the newly inserted point
    let newPointInfo: { elementId: string; commandIndex: number; pointIndex: number } | null = null;

    if (command.type === 'L') {
      // For line segments, insert a new L command
      newCommands.splice(commandIndex, 1, 
        { type: 'L', position: insertPosition },
        { type: 'L', position: command.position }
      );
      // The new point is at commandIndex, and L commands have pointIndex 0
      newPointInfo = { elementId: addPointMode.targetElement, commandIndex, pointIndex: 0 };
    } else if (command.type === 'C') {
      // For cubic bezier segments, we need to split the curve
      // Using De Casteljau's algorithm to split at parameter t
      const p0 = startPoint;
      const p1 = command.controlPoint1;
      const p2 = command.controlPoint2;
      const p3 = command.position;

      // First level interpolation
      const p01 = { x: p0.x + t * (p1.x - p0.x), y: p0.y + t * (p1.y - p0.y) };
      const p12 = { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
      const p23 = { x: p2.x + t * (p3.x - p2.x), y: p2.y + t * (p3.y - p2.y) };

      // Second level interpolation
      const p012 = { x: p01.x + t * (p12.x - p01.x), y: p01.y + t * (p12.y - p01.y) };
      const p123 = { x: p12.x + t * (p23.x - p12.x), y: p12.y + t * (p23.y - p12.y) };

      // Third level interpolation - the point on curve
      const pOnCurve = { x: p012.x + t * (p123.x - p012.x), y: p012.y + t * (p123.y - p012.y) };

      // Create two new cubic bezier commands
      newCommands.splice(commandIndex, 1,
        {
          type: 'C',
          controlPoint1: { ...p01, commandIndex, pointIndex: 0, anchor: pOnCurve, isControl: true },
          controlPoint2: { ...p012, commandIndex, pointIndex: 1, anchor: pOnCurve, isControl: true },
          position: pOnCurve
        },
        {
          type: 'C',
          controlPoint1: { ...p123, commandIndex: commandIndex + 1, pointIndex: 0, anchor: p3, isControl: true },
          controlPoint2: { ...p23, commandIndex: commandIndex + 1, pointIndex: 1, anchor: p3, isControl: true },
          position: p3
        }
      );
      // The new point is at commandIndex, pointIndex 2 (the position of the first C command)
      newPointInfo = { elementId: addPointMode.targetElement, commandIndex, pointIndex: 2 };
    }

    // Update the path with new commands
    const newSubPaths = extractSubpaths(newCommands).map(s => s.commands);
    state.updateElement(addPointMode.targetElement, {
      data: {
        ...pathData,
        subPaths: newSubPaths
      }
    });

    // Select the newly created point (but don't start dragging yet)
    // The dragging will start when the user moves the mouse (handled by useCanvasDragInteractions)
    if (newPointInfo) {
      set({
        selectedCommands: [newPointInfo],
        editingPoint: {
          elementId: newPointInfo.elementId,
          commandIndex: newPointInfo.commandIndex,
          pointIndex: newPointInfo.pointIndex,
          isDragging: true, // Start dragging immediately
          offsetX: insertPosition.x,
          offsetY: insertPosition.y
        },
        draggingSelection: null,
        addPointMode: {
          ...addPointMode,
          hoverPosition: null,
          targetElement: null,
          targetSegment: null,
        },
      });
    } else {
      // Clear hover state after inserting if no point info
      set((state) => ({
        addPointMode: {
          ...state.addPointMode,
          hoverPosition: null,
          targetElement: null,
          targetSegment: null,
        },
      }));
    }
    
    return newPointInfo;
  },
});

