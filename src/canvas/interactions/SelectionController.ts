import { extractEditablePoints } from '../../utils/path';
import { measurePath, measureSubpathBounds } from '../../utils/geometry';
import type { PathData, CanvasElement } from '../../types';
import { selectionStrategyRegistry, type SelectionData } from '../selection/SelectionStrategy';

export interface SelectionCallbacks {
  selectCommands: (commands: Array<{ elementId: string; commandIndex: number; pointIndex: number }>, isShiftPressed: boolean) => void;
  selectSubpaths: (subpaths: Array<{ elementId: string; subpathIndex: number }>, isShiftPressed: boolean) => void;
  selectElements: (elementIds: string[], isShiftPressed: boolean) => void;
}

export class SelectionController {
  private callbacks: SelectionCallbacks;

  constructor(callbacks: SelectionCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Complete the selection using the appropriate strategy
   */
  completeSelection(
    selectionData: SelectionData,
    strategyId: string,
    activePlugin: string,
    elements: CanvasElement[],
    viewportZoom: number,
    isShiftPressed: boolean,
    selectedIds?: string[],
    getFilteredEditablePoints?: (elementId: string) => Array<{ x: number; y: number; commandIndex: number; pointIndex: number }>
  ): void {
    const strategy = selectionStrategyRegistry.get(strategyId);

    switch (activePlugin) {
      case 'edit':
        this.completeEditSelection(strategy, selectionData, elements, isShiftPressed, selectedIds, getFilteredEditablePoints);
        break;
      case 'subpath':
        this.completeSubpathSelection(strategy, selectionData, elements, viewportZoom, isShiftPressed);
        break;
      case 'select':
        this.completeElementSelection(strategy, selectionData, elements, viewportZoom, isShiftPressed);
        break;
    }
  }

  private completeEditSelection(
    strategy: import('../selection/SelectionStrategy').SelectionStrategy,
    selectionData: SelectionData,
    elements: CanvasElement[],
    isShiftPressed: boolean,
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

    this.callbacks.selectCommands(selectedCommands, isShiftPressed);
  }

  private completeSubpathSelection(
    strategy: import('../selection/SelectionStrategy').SelectionStrategy,
    selectionData: SelectionData,
    elements: CanvasElement[],
    viewportZoom: number,
    isShiftPressed: boolean
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

    this.callbacks.selectSubpaths(selectedSubpathsList, isShiftPressed);
  }

  private completeElementSelection(
    strategy: import('../selection/SelectionStrategy').SelectionStrategy,
    selectionData: SelectionData,
    elements: CanvasElement[],
    viewportZoom: number,
    isShiftPressed: boolean
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
      this.callbacks.selectElements(selectedElementIds, isShiftPressed);
    } else if (!isShiftPressed) {
      this.callbacks.selectElements([], false);
    }
  }
}