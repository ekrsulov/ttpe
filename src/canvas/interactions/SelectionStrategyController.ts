

import { extractEditablePoints } from '../../utils/path';
import { measurePath, measureSubpathBounds } from '../../utils/geometry';
import type { PathData, CanvasElement } from '../../types';
import { selectionStrategyRegistry, type SelectionData } from '../selection/SelectionStrategy';
import type { PluginSelectionMode } from '../../types/plugins';

export interface SelectionCallbacks {
  selectCommands: (commands: Array<{ elementId: string; commandIndex: number; pointIndex: number }>, isShiftPressed: boolean) => void;
  selectSubpaths: (subpaths: Array<{ elementId: string; subpathIndex: number }>, isShiftPressed: boolean) => void;
  selectElements: (elementIds: string[], isShiftPressed: boolean) => void;
}

/**
 * Complete the selection using the appropriate strategy.
 * Uses the plugin's declared selectionMode instead of hardcoded plugin IDs.
 */
export function completeSelection(
  selectionData: SelectionData,
  strategyId: string,
  selectionMode: PluginSelectionMode,
  elements: CanvasElement[],
  viewportZoom: number,
  isShiftPressed: boolean,
  callbacks: SelectionCallbacks,
  selectedIds?: string[],
  getFilteredEditablePoints?: (elementId: string) => Array<{ x: number; y: number; commandIndex: number; pointIndex: number }>
): void {
  const strategy = selectionStrategyRegistry.get(strategyId);

  switch (selectionMode) {
    case 'commands':
      completeEditSelection(strategy, selectionData, elements, isShiftPressed, callbacks, selectedIds, getFilteredEditablePoints);
      break;
    case 'subpaths':
      completeSubpathSelection(strategy, selectionData, elements, viewportZoom, isShiftPressed, callbacks);
      break;
    case 'elements':
    default:
      completeElementSelection(strategy, selectionData, elements, viewportZoom, isShiftPressed, callbacks);
      break;
  }
}

function completeEditSelection(
  strategy: import('../selection/SelectionStrategy').SelectionStrategy,
  selectionData: SelectionData,
  elements: CanvasElement[],
  isShiftPressed: boolean,
  callbacks: SelectionCallbacks,
  selectedIds?: string[],
  getFilteredEditablePoints?: (elementId: string) => Array<{ x: number; y: number; commandIndex: number; pointIndex: number }>
): void {
  const selectedCommands: Array<{ elementId: string; commandIndex: number; pointIndex: number }> = [];

  // In edit mode, only process elements that are currently selected
  const elementsToProcess = selectedIds && selectedIds.length > 0
    ? elements.filter(el => selectedIds.includes(el.id))
    : elements;

  elementsToProcess.forEach(el => {
    if (el.type === 'path') {
      // Use filtered points if available (respects subpath selection)
      const points = getFilteredEditablePoints
        ? getFilteredEditablePoints(el.id)
        : extractEditablePoints((el.data as PathData).subPaths.flat());

      points.forEach(point => {
        if (strategy.containsPoint(point, selectionData)) {
          selectedCommands.push({
            elementId: el.id,
            commandIndex: point.commandIndex,
            pointIndex: point.pointIndex
          });
        }
      });
    }
  });

  callbacks.selectCommands(selectedCommands, isShiftPressed);
}

function completeSubpathSelection(
  strategy: import('../selection/SelectionStrategy').SelectionStrategy,
  selectionData: SelectionData,
  elements: CanvasElement[],
  viewportZoom: number,
  isShiftPressed: boolean,
  callbacks: SelectionCallbacks
): void {
  const selectedSubpathsList: Array<{ elementId: string; subpathIndex: number }> = [];

  elements.forEach(el => {
    if (el.type === 'path') {
      const pathData = el.data as PathData;

      pathData.subPaths.forEach((subpathData, index) => {
        const subpathBounds = measureSubpathBounds(subpathData, pathData.strokeWidth, viewportZoom);

        if (strategy.intersectsBounds(subpathBounds, selectionData)) {
          selectedSubpathsList.push({
            elementId: el.id,
            subpathIndex: index
          });
        }
      });
    }
  });

  callbacks.selectSubpaths(selectedSubpathsList, isShiftPressed);
}

function completeElementSelection(
  strategy: import('../selection/SelectionStrategy').SelectionStrategy,
  selectionData: SelectionData,
  elements: CanvasElement[],
  viewportZoom: number,
  isShiftPressed: boolean,
  callbacks: SelectionCallbacks
): void {
  const selectedElementIds = elements
    .filter(el => {
      if (el.type === 'path') {
        const pathData = el.data as PathData;
        const pathBounds = measurePath(pathData.subPaths, pathData.strokeWidth, viewportZoom);

        return strategy.intersectsBounds(pathBounds, selectionData);
      }
      return false;
    })
    .map(el => el.id);

  if (selectedElementIds.length > 0) {
    callbacks.selectElements(selectedElementIds, isShiftPressed);
  } else if (!isShiftPressed) {
    callbacks.selectElements([], false);
  }
}