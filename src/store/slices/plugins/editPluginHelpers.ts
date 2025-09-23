import type { CanvasElement, PathData, Command } from '../../../types';
import type { CanvasStore } from '../../canvasStore';
import { extractEditablePoints, updateCommands, extractSubpaths } from '../../../utils/pathParserUtils';

export type SelectedCommand = {
  elementId: string;
  commandIndex: number;
  pointIndex: number;
};

export type PathElementContext = {
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

export type PointUpdate = {
  commandIndex: number;
  pointIndex: number;
  x: number;
  y: number;
  isControl: boolean;
};

/**
 * Groups selected commands by element ID
 */
export function groupSelectedCommandsByElement(selectedCommands: SelectedCommand[]): Record<string, SelectedCommand[]> {
  return selectedCommands.reduce((acc: Record<string, SelectedCommand[]>, cmd: SelectedCommand) => {
    if (!acc[cmd.elementId]) acc[cmd.elementId] = [];
    acc[cmd.elementId].push(cmd);
    return acc;
  }, {});
}

/**
 * Gets path element context including parsed data and editable points
 */
export function getPathElementContext(state: CanvasStore, elementId: string): PathElementContext | null {
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
export function getSelectedPoints(
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
export function applyPointUpdates(
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
    elements: currentState.elements.map((el) =>
      el.id === elementId
        ? { ...el, data: { ...pathData, subPaths: newSubPaths } }
        : el
    )
  }));
}

/**
 * Alignment strategy type - calculates new coordinate value based on points
 */
export type AlignmentStrategy = (points: PathElementContext['editablePoints']) => number;

/**
 * Alignment strategies for different alignment types
 */
export const alignmentStrategies = {
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
export function applyAlignment(
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
 * Distribution axis type
 */
export type DistributionAxis = 'x' | 'y';

/**
 * Collects all selected points across elements with their positions
 */
export function collectAllSelectedPoints(
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
export function applyDistribution(
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