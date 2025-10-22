import { useState, useCallback, useMemo } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { SelectionController, type SelectionCallbacks } from '../canvas/interactions/SelectionController';
import type { Point } from '../types';

export const useCanvasPointerSelection = (isShiftPressed: boolean = false) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<Point | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<Point | null>(null);
  const [justSelected, setJustSelected] = useState(false);

  const {
    activePlugin,
    clearSelectedCommands,
    clearSubpathSelection
  } = useCanvasStore();

  const callbacks: SelectionCallbacks = useMemo(() => ({
    selectCommands: (commands, isShift) => {
      if (isShift) {
        useCanvasStore.setState(state => {
          const combined = [...(state.selectedCommands ?? []), ...commands];
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
        useCanvasStore.setState({ selectedCommands: commands });
      }
    },
    selectSubpaths: (subpaths, isShift) => {
      if (isShift) {
        useCanvasStore.setState(state => {
          const combined = [...(state.selectedSubpaths ?? []), ...subpaths];
          const unique = combined.filter((subpath, index, self) =>
            index === self.findIndex(s =>
              s.elementId === subpath.elementId &&
              s.subpathIndex === subpath.subpathIndex
            )
          );
          return { selectedSubpaths: unique };
        });
      } else {
        useCanvasStore.setState({ selectedSubpaths: subpaths });
      }
    },
    selectElements: (elementIds, isShift) => {
      if (isShift) {
        const currentSelectedIds = useCanvasStore.getState().selectedIds;
        const newSelectedIds = [...new Set([...currentSelectedIds, ...elementIds])];
        useCanvasStore.getState().selectElements(newSelectedIds);
      } else {
        useCanvasStore.getState().selectElements(elementIds);
      }
    }
  }), []);

  const selectionController = useMemo(() => new SelectionController(callbacks), [callbacks]);

  const beginSelectionRectangle = useCallback((point: Point, shouldClearCommands = false, shouldClearSubpaths = false) => {
    setIsSelecting(true);
    setSelectionStart(point);
    setSelectionEnd(point);

    if (shouldClearCommands) {
      clearSelectedCommands?.();
    }
    if (shouldClearSubpaths) {
      clearSubpathSelection?.();
    }
  }, [clearSelectedCommands, clearSubpathSelection]);

  const updateSelectionRectangle = useCallback((point: Point) => {
    if (isSelecting) {
      setSelectionEnd(point);
    }
  }, [isSelecting]);

  const completeSelectionRectangle = useCallback(() => {
    if (!isSelecting || !selectionStart || !selectionEnd || !activePlugin) return;

    // Get current state
    const { elements, viewport, selectedIds, getFilteredEditablePoints } = useCanvasStore.getState();

    // Handle selection using the controller
    selectionController.completeSelection(
      selectionStart, 
      selectionEnd, 
      activePlugin, 
      elements, 
      viewport.zoom, 
      isShiftPressed,
      selectedIds,
      getFilteredEditablePoints
    );

    // Reset selection state
    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
    setJustSelected(true);
    setTimeout(() => setJustSelected(false), 100);
  }, [isSelecting, selectionStart, selectionEnd, activePlugin, isShiftPressed, selectionController]);

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