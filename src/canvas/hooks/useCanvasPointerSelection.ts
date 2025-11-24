import { useState, useCallback, useMemo } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { SelectionController, type SelectionCallbacks } from '../interactions/SelectionController';
import type { Point } from '../../types';
import { mergeUniqueByKey } from '../../utils/coreHelpers';
import type { SelectionData } from '../selection/SelectionStrategy';

export const useCanvasPointerSelection = (isShiftPressed: boolean = false) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<Point | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<Point | null>(null);
  const [justSelected, setJustSelected] = useState(false);

  const {
    activePlugin,
    clearSelectedCommands,
    clearSubpathSelection,
    setSelectionPath,
    clearSelectionPath,
    selectionPath
  } = useCanvasStore();

  const callbacks: SelectionCallbacks = useMemo(() => ({
    selectCommands: (commands, isShift) => {
      if (isShift) {
        useCanvasStore.setState(state => {
          const unique = mergeUniqueByKey(
            state.selectedCommands ?? [],
            commands,
            (c) => `${c.elementId}-${c.commandIndex}-${c.pointIndex}`
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
          const unique = mergeUniqueByKey(
            state.selectedSubpaths ?? [],
            subpaths,
            (s) => `${s.elementId}-${s.subpathIndex}`
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
    setSelectionPath([point]);

    if (shouldClearCommands) {
      clearSelectedCommands?.();
    }
    if (shouldClearSubpaths) {
      clearSubpathSelection?.();
    }
  }, [clearSelectedCommands, clearSubpathSelection, setSelectionPath]);

  const updateSelectionRectangle = useCallback((point: Point) => {
    if (isSelecting) {
      setSelectionEnd(point);
      setSelectionPath([...selectionPath, point]);
    }
  }, [isSelecting, selectionPath, setSelectionPath]);

  const completeSelectionRectangle = useCallback(() => {
    if (!isSelecting || !selectionStart || !selectionEnd || !activePlugin) return;

    // Get current state
    const { elements, viewport, selectedIds, getFilteredEditablePoints } = useCanvasStore.getState();
    const lassoClosed = useCanvasStore.getState().lassoClosed ?? true;

    // Determine selection strategy ID (plugins can provide their own via store state)
    const state = useCanvasStore.getState() as Record<string, unknown>;
    const activeStrategyId = (state.activeSelectionStrategy as string | undefined) ?? 'rectangle';

    // Build selection data
    const selectionData: SelectionData = {
      start: selectionStart,
      end: selectionEnd,
      path: selectionPath.length > 2 ? selectionPath : undefined,
      closed: lassoClosed,
    };

    // Handle selection using the controller with the active strategy
    selectionController.completeSelection(
      selectionData,
      activeStrategyId,
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
    clearSelectionPath();
    setJustSelected(true);
    setTimeout(() => setJustSelected(false), 100);
  }, [isSelecting, selectionStart, selectionEnd, selectionPath, activePlugin, isShiftPressed, selectionController, clearSelectionPath]);

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