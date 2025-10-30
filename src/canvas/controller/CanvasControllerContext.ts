import { createContext, useContext, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { CanvasElement, Point } from '../../types';
import { pluginManager } from '../../utils/pluginManager';
import { buildElementMap } from '../../utils/coreHelpers';

export interface CanvasControllerValue
  extends Pick<
    CanvasStore,
    |
      'elements'
    | 'viewport'
    | 'activePlugin'
    | 'transformation'
    | 'shape'
    | 'selectedIds'
    | 'editingPoint'
    | 'selectedCommands'
    | 'selectedSubpaths'
    | 'draggingSelection'
    | 'guidelines'
    | 'grid'
    | 'pencil'
    | 'addPointMode'
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
    | 'applySmoothBrush'
    | 'zoom'
  > {
  sortedElements: CanvasElement[];
  elementMap: Map<string, CanvasElement>;
  // Compatibility functions that delegate to plugin APIs
  startPath: (point: Point) => void;
  addPointToPath: (point: Point) => void;
  finalizePath: (points: Point[]) => void;
}

export const CanvasControllerContext = createContext<CanvasControllerValue | null>(null);

export const useCanvasControllerSource = (): CanvasControllerValue => {
  const state = useCanvasStore(
    useShallow((store) => ({
      elements: store.elements,
      viewport: store.viewport,
      activePlugin: store.activePlugin,
      transformation: store.transformation,
      shape: store.shape,
      selectedIds: store.selectedIds,
      editingPoint: store.editingPoint,
      selectedCommands: store.selectedCommands,
      selectedSubpaths: store.selectedSubpaths,
      draggingSelection: store.draggingSelection,
      guidelines: store.guidelines,
      grid: store.grid,
      pencil: store.pencil,
      addPointMode: store.addPointMode,
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
      applySmoothBrush: store.applySmoothBrush,
      zoom: store.zoom,
    }))
  );

  const sortedElements = useMemo(() => {
    return [...state.elements].sort((a, b) => a.zIndex - b.zIndex);
  }, [state.elements]);

  const elementMap = useMemo(() => buildElementMap(state.elements), [state.elements]);

  // Compatibility functions that delegate to plugin APIs
  const startPath = useMemo(() => (point: Point) => {
    pluginManager.callPluginApi('pencil', 'startPath', point);
  }, []);

  const addPointToPath = useMemo(() => (point: Point) => {
    pluginManager.callPluginApi('pencil', 'addPointToPath', point);
  }, []);

  const finalizePath = useMemo(() => (points: Point[]) => {
    pluginManager.callPluginApi('pencil', 'finalizePath', points);
  }, []);

  return useMemo(
    () => ({
      ...state,
      sortedElements,
      elementMap,
      startPath,
      addPointToPath,
      finalizePath,
    }),
    [state, sortedElements, elementMap, startPath, addPointToPath, finalizePath]
  );
};

export const useCanvasController = (): CanvasControllerValue => {
  const context = useContext(CanvasControllerContext);
  if (!context) {
    throw new Error('useCanvasController must be used within a CanvasControllerProvider');
  }
  return context;
};
