import { useState, useCallback } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { extractEditablePoints } from '../utils/pathParserUtils';
import { measurePath } from '../utils/measurementUtils';
import type { Point, PathData } from '../types';

export const useCanvasPointerSelection = (isShiftPressed: boolean = false) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<Point | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<Point | null>(null);
  const [justSelected, setJustSelected] = useState(false);

  const {
    activePlugin,
    elements,
    viewport,
    clearSelectedCommands,
    clearSubpathSelection
  } = useCanvasStore();

  const beginSelectionRectangle = useCallback((point: Point, shouldClearCommands = false, shouldClearSubpaths = false) => {
    setIsSelecting(true);
    setSelectionStart(point);
    setSelectionEnd(point);

    if (shouldClearCommands) {
      clearSelectedCommands();
    }
    if (shouldClearSubpaths) {
      clearSubpathSelection();
    }
  }, [clearSelectedCommands, clearSubpathSelection]);

  const updateSelectionRectangle = useCallback((point: Point) => {
    if (isSelecting) {
      setSelectionEnd(point);
    }
  }, [isSelecting]);

  const completeSelectionRectangle = useCallback(() => {
    if (!isSelecting || !selectionStart || !selectionEnd) return;

    const minX = Math.min(selectionStart.x, selectionEnd.x);
    const maxX = Math.max(selectionStart.x, selectionEnd.x);
    const minY = Math.min(selectionStart.y, selectionEnd.y);
    const maxY = Math.max(selectionStart.y, selectionEnd.y);

    // Handle selection based on active plugin
    switch (activePlugin) {
      case 'edit': {
        // Select commands within the rectangle
        const selectedCommands: Array<{ elementId: string, commandIndex: number, pointIndex: number }> = [];

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

        // Select all found commands
        if (isShiftPressed) {
          // Add to existing selection
          useCanvasStore.setState(state => {
            const combined = [...state.selectedCommands, ...selectedCommands];
            // Remove duplicates
            const unique = combined.filter((command, index, self) =>
              index === self.findIndex(c =>
                c.elementId === command.elementId &&
                c.commandIndex === command.commandIndex &&
                c.pointIndex === command.pointIndex
              )
            );
            return { selectedCommands: unique };
          });
        } else {
          // Replace selection
          useCanvasStore.setState({ selectedCommands });
        }
        break;
      }

      case 'subpath': {
        // Select subpaths within the selection box
        const selectedSubpathsList: Array<{ elementId: string, subpathIndex: number }> = [];

        elements.forEach(el => {
          if (el.type === 'path') {
            const pathData = el.data as PathData;

            pathData.subPaths.forEach((subpathData, index) => {
              // Check if subpath intersects with selection box
              const subpathBounds = measurePath([subpathData], pathData.strokeWidth, viewport.zoom);

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

        // Select all found subpaths
        if (isShiftPressed) {
          // Add to existing selection
          useCanvasStore.setState(state => {
            const combined = [...state.selectedSubpaths, ...selectedSubpathsList];
            // Remove duplicates
            const unique = combined.filter((subpath, index, self) =>
              index === self.findIndex(s =>
                s.elementId === subpath.elementId &&
                s.subpathIndex === subpath.subpathIndex
              )
            );
            return { selectedSubpaths: unique };
          });
        } else {
          // Replace selection
          useCanvasStore.setState({ selectedSubpaths: selectedSubpathsList });
        }
        break;
      }

      case 'select': {
        // Select elements within the rectangle based on their bounds
        const selectedElementIds = elements
          .filter(el => {
            if (el.type === 'path') {
              const pathData = el.data as PathData;
              // Check if the path bounds intersect with the selection box
              const pathBounds = measurePath(pathData.subPaths, pathData.strokeWidth, viewport.zoom);

              // Check for intersection between path bounds and selection bounds
              const intersects = !(pathBounds.maxX < minX ||
                pathBounds.minX > maxX ||
                pathBounds.maxY < minY ||
                pathBounds.minY > maxY);

              return intersects;
            }
            return false;
          })
          .map(el => el.id);

        // Select the found elements
        if (selectedElementIds.length > 0) {
          if (isShiftPressed) {
            // Add to existing selection
            const currentSelectedIds = useCanvasStore.getState().selectedIds;
            const newSelectedIds = [...new Set([...currentSelectedIds, ...selectedElementIds])];
            useCanvasStore.getState().selectElements(newSelectedIds);
          } else {
            // Replace selection
            useCanvasStore.getState().selectElements(selectedElementIds);
          }
        }
        break;
      }
    }

    // Reset selection state
    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
    setJustSelected(true);
    setTimeout(() => setJustSelected(false), 100);
  }, [isSelecting, selectionStart, selectionEnd, activePlugin, elements, viewport.zoom, isShiftPressed]);

  return {
    isSelecting,
    selectionStart,
    selectionEnd,
    justSelected,
    beginSelectionRectangle,
    updateSelectionRectangle,
    completeSelectionRectangle
  };
};