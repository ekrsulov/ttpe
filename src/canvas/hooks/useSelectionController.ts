import { useCallback, useEffect, useMemo, useState } from 'react';
import { SelectionController, type SelectionControllerState } from '../selection/SelectionController';
import { useCanvasEventBus } from '../CanvasEventBusContext';
import { useCanvasStore } from '../../store/canvasStore';
import { useCanvasPointerSelection } from './useCanvasPointerSelection';

export interface UseSelectionControllerResult {
  isSelecting: ReturnType<typeof useCanvasPointerSelection>['isSelecting'];
  selectionStart: ReturnType<typeof useCanvasPointerSelection>['selectionStart'];
  selectionEnd: ReturnType<typeof useCanvasPointerSelection>['selectionEnd'];
  beginSelectionRectangle: ReturnType<typeof useCanvasPointerSelection>['beginSelectionRectangle'];
  updateSelectionRectangle: ReturnType<typeof useCanvasPointerSelection>['updateSelectionRectangle'];
  completeSelectionRectangle: ReturnType<typeof useCanvasPointerSelection>['completeSelectionRectangle'];
  selectElement: (elementId: string, toggle: boolean) => void;
  toggleSelection: (elementId: string) => void;
  clearSelection: () => void;
  modifiers: SelectionControllerState;
}

export const useSelectionController = (): UseSelectionControllerResult => {
  const eventBus = useCanvasEventBus();
  const selectElementAction = useCanvasStore(state => state.selectElement);
  const clearSelectionAction = useCanvasStore(state => state.clearSelection);

  const getSelectedIds = useCallback(() => useCanvasStore.getState().selectedIds, []);

  const [modifiers, setModifiers] = useState<SelectionControllerState>({
    isShiftPressed: false,
    isCtrlPressed: false,
    isMultiSelectActive: false,
    lastTargetId: null,
  });

  const handleStateChange = useCallback((state: SelectionControllerState) => {
    setModifiers(state);
  }, []);

  const controller = useMemo(
    () =>
      new SelectionController({
        eventBus,
        selectElement: selectElementAction,
        clearSelection: clearSelectionAction,
        getSelectedIds,
        onStateChange: handleStateChange,
      }),
    [eventBus, selectElementAction, clearSelectionAction, getSelectedIds, handleStateChange]
  );

  useEffect(() => () => controller.destroy(), [controller]);

  const {
    isSelecting,
    selectionStart,
    selectionEnd,
    beginSelectionRectangle,
    updateSelectionRectangle,
    completeSelectionRectangle,
  } = useCanvasPointerSelection(modifiers.isShiftPressed || modifiers.isCtrlPressed);

  const handleSelectElement = useCallback(
    (elementId: string, toggle: boolean) => {
      if (toggle) {
        controller.toggleSelection(elementId);
      } else {
        controller.selectElement(elementId);
      }
    },
    [controller]
  );

  const handleToggleSelection = useCallback(
    (elementId: string) => {
      controller.toggleSelection(elementId);
    },
    [controller]
  );

  const handleClearSelection = useCallback(() => {
    controller.clearSelection();
  }, [controller]);

  return {
    isSelecting,
    selectionStart,
    selectionEnd,
    beginSelectionRectangle,
    updateSelectionRectangle,
    completeSelectionRectangle,
    selectElement: handleSelectElement,
    toggleSelection: handleToggleSelection,
    clearSelection: handleClearSelection,
    modifiers,
  };
};
