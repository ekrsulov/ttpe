import { extractEditablePoints } from '../../utils/path';
import { measurePath, measureSubpathBounds } from '../../utils/geometry';
import type { Point, PathData, CanvasElement } from '../../types';

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
   * Complete the selection rectangle for the given plugin
   */
  completeSelection(
    selectionStart: Point,
    selectionEnd: Point,
    activePlugin: string,
    elements: CanvasElement[],
    viewportZoom: number,
    isShiftPressed: boolean
  ): void {
    const minX = Math.min(selectionStart.x, selectionEnd.x);
    const maxX = Math.max(selectionStart.x, selectionEnd.x);
    const minY = Math.min(selectionStart.y, selectionEnd.y);
    const maxY = Math.max(selectionStart.y, selectionEnd.y);

    switch (activePlugin) {
      case 'edit':
        this.completeEditSelection(minX, maxX, minY, maxY, elements, isShiftPressed);
        break;
      case 'subpath':
        this.completeSubpathSelection(minX, maxX, minY, maxY, elements, viewportZoom, isShiftPressed);
        break;
      case 'select':
        this.completeElementSelection(minX, maxX, minY, maxY, elements, viewportZoom, isShiftPressed);
        break;
    }
  }

  private completeEditSelection(
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    elements: CanvasElement[],
    isShiftPressed: boolean
  ): void {
    const selectedCommands: Array<{ elementId: string; commandIndex: number; pointIndex: number }> = [];

    elements.forEach(el => {
      if (el.type === 'path') {
        const pathData = el.data as PathData;
        const commands = pathData.subPaths.flat();
        const points = extractEditablePoints(commands);

        points.forEach(point => {
          if (point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY) {
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
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
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

          const intersects = !(subpathBounds.maxX < minX ||
            subpathBounds.minX > maxX ||
            subpathBounds.maxY < minY ||
            subpathBounds.minY > maxY);

          if (intersects) {
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
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    elements: CanvasElement[],
    viewportZoom: number,
    isShiftPressed: boolean
  ): void {
    const selectedElementIds = elements
      .filter(el => {
        if (el.type === 'path') {
          const pathData = el.data as PathData;
          const pathBounds = measurePath(pathData.subPaths, pathData.strokeWidth, viewportZoom);

          const intersects = !(pathBounds.maxX < minX ||
            pathBounds.minX > maxX ||
            pathBounds.maxY < minY ||
            pathBounds.minY > maxY);

          return intersects;
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