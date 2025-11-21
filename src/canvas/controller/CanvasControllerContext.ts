import { createContext, useContext, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { CanvasElement } from '../../types';
import { buildElementMap } from '../../utils/coreHelpers';

export interface CanvasControllerValue
  extends Pick<
    CanvasStore,
    |
    'elements'
    | 'viewport'
    | 'activePlugin'
    | 'selectedIds'
    | 'editingPoint'
    | 'selectedCommands'
    | 'selectedSubpaths'
    | 'draggingSelection'
    | 'guidelines'
    | 'grid'
    | 'updateElement'
    | 'startDraggingPoint'
    | 'stopDraggingPoint'
    | 'emergencyCleanupDrag'
    | 'selectCommand'
    | 'selectSubpath'
    | 'isWorkingWithSubpaths'
    | 'getFilteredEditablePoints'
    | 'getControlPointInfo'
    | 'saveAsPng'
    | 'snapToGrid'
    | 'clearGuidelines'
    | 'isElementHidden'
    | 'isElementLocked'
    | 'moveSelectedElements'
    | 'moveSelectedSubpaths'
    | 'selectElement'
    | 'setMode'
    | 'zoom'
  > {
  sortedElements: CanvasElement[];
  elementMap: Map<string, CanvasElement>;
}

export const CanvasControllerContext = createContext<CanvasControllerValue | null>(null);

export const useCanvasControllerSource = (): CanvasControllerValue => {
  const state = useCanvasStore(
    useShallow((store) => ({
      elements: store.elements,
      viewport: store.viewport,
      activePlugin: store.activePlugin,
      selectedIds: store.selectedIds,
      editingPoint: store.editingPoint,
      selectedCommands: store.selectedCommands,
      selectedSubpaths: store.selectedSubpaths,
      draggingSelection: store.draggingSelection,
      guidelines: store.guidelines,
      grid: store.grid,
      updateElement: store.updateElement,
      startDraggingPoint: store.startDraggingPoint,
      stopDraggingPoint: store.stopDraggingPoint,
      emergencyCleanupDrag: store.emergencyCleanupDrag,
      selectCommand: store.selectCommand,
      selectSubpath: store.selectSubpath,
      isWorkingWithSubpaths: store.isWorkingWithSubpaths,
      getFilteredEditablePoints: store.getFilteredEditablePoints,
      getControlPointInfo: store.getControlPointInfo,
      saveAsPng: store.saveAsPng,
      snapToGrid: store.snapToGrid,
      clearGuidelines: store.clearGuidelines,
      isElementHidden: store.isElementHidden,
      isElementLocked: store.isElementLocked,
      moveSelectedElements: store.moveSelectedElements,
      moveSelectedSubpaths: store.moveSelectedSubpaths,
      selectElement: store.selectElement,
      setMode: store.setMode,
      zoom: store.zoom,
    }))
  );

  const sortedElements = useMemo(() => {
    return [...state.elements].sort((a, b) => a.zIndex - b.zIndex);
  }, [state.elements]);

  const elementMap = useMemo(() => buildElementMap(state.elements), [state.elements]);

  return useMemo(
    () => ({
      ...state,
      sortedElements,
      elementMap,
    }),
    [state, sortedElements, elementMap]
  );
};

export const useCanvasController = (): CanvasControllerValue => {
  const context = useContext(CanvasControllerContext);
  if (!context) {
    throw new Error('useCanvasController must be used within a CanvasControllerProvider');
  }
  return context;
};
