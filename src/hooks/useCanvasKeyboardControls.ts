import { useState, useEffect } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { isTextFieldFocused } from '../utils/domHelpers';
import { useCanvasCurves } from '../plugins/curves/useCanvasCurves';
import { getDeletionScope, executeDeletion } from '../utils/deletionScopeUtils';

export const useCanvasKeyboardControls = () => {
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const isVirtualShiftActive = useCanvasStore(state => state.isVirtualShiftActive);
  const {
    selectedCommands,
    selectedSubpaths,
    selectedIds,
    settings,
    deleteSelectedCommands,
    deleteSelectedSubpaths,
    deleteSelectedElements,
    moveSelectedPoints,
    moveSelectedSubpaths,
    moveSelectedElements,
    activePlugin,
    curveState,
    finishCurve,
    cancelCurve,
  } = useCanvasStore();

  // Get curves methods when in curves mode
  const { deleteSelectedPoint } = useCanvasCurves();

  // Computed effective shift state (physical OR virtual)
  const isEffectiveShiftPressed = isShiftPressed || isVirtualShiftActive;

  // Handle space and delete keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't activate pan mode if user is typing in an input or textarea
      if (e.code === 'Space' && !e.repeat) {
        if (!isTextFieldFocused()) {
          setIsSpacePressed(true);
          e.preventDefault();
        }
      }

      // Handle Shift key
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        setIsShiftPressed(true);
      }

      // Handle Delete key for deleting selected commands
      if (e.code === 'Delete' || e.code === 'Backspace') {
        // Only delete if not typing in an input and we have selected commands
        if (!isTextFieldFocused() && (selectedCommands?.length ?? 0) > 0 && deleteSelectedCommands) {
          deleteSelectedCommands();
          e.preventDefault();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        setIsShiftPressed(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedCommands?.length, deleteSelectedCommands]);

  // Handle arrow keys for movement and delete for other selections
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not typing in an input
      if (isTextFieldFocused()) return;

      const delta = e.shiftKey ? 10 : 1;
      let deltaX = 0;
      let deltaY = 0;

      switch (e.key) {
        case 'ArrowUp':
          deltaY = -delta;
          break;
        case 'ArrowDown':
          deltaY = delta;
          break;
        case 'ArrowLeft':
          deltaX = -delta;
          break;
        case 'ArrowRight':
          deltaX = delta;
          break;
      }

      if (deltaX !== 0 || deltaY !== 0) {
        // Apply precision rounding based on settings
        const precision = settings.keyboardMovementPrecision;
        const roundedDeltaX = precision === 0 ? Math.round(deltaX) : parseFloat(deltaX.toFixed(precision));
        const roundedDeltaY = precision === 0 ? Math.round(deltaY) : parseFloat(deltaY.toFixed(precision));

        // Check what is selected and move accordingly
        // Priority: points > subpaths > paths
        if ((selectedCommands?.length ?? 0) > 0 && moveSelectedPoints) {
          // Move selected points
          moveSelectedPoints(roundedDeltaX, roundedDeltaY);
        } else if ((selectedSubpaths?.length ?? 0) > 0 && moveSelectedSubpaths) {
          // Move selected subpaths
          moveSelectedSubpaths(roundedDeltaX, roundedDeltaY);
        } else if (selectedIds.length > 0) {
          // Move selected elements (paths)
          moveSelectedElements(roundedDeltaX, roundedDeltaY);
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        // Delete selected items using priority-based strategy
        const scope = getDeletionScope({
          selectedCommandsCount: selectedCommands?.length ?? 0,
          selectedSubpathsCount: selectedSubpaths?.length ?? 0,
          selectedElementsCount: selectedIds.length,
        }, false);
        
        const deleted = executeDeletion(scope, {
          deleteSelectedCommands,
          deleteSelectedSubpaths,
          deleteSelectedElements,
        });
        
        if (deleted) {
          e.preventDefault();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedCommands?.length, selectedSubpaths?.length, selectedIds.length, settings.keyboardMovementPrecision, moveSelectedPoints, moveSelectedSubpaths, moveSelectedElements, deleteSelectedCommands, deleteSelectedSubpaths, deleteSelectedElements]);

  // Handle curves mode keyboard shortcuts
  useEffect(() => {
    if (activePlugin !== 'curves') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not typing in an input
      if (isTextFieldFocused()) return;

      // Delete selected curve point
      if ((e.key === 'Delete' || e.key === 'Backspace') && curveState?.selectedPointId) {
        deleteSelectedPoint();
        e.preventDefault();
      }

      // Escape to cancel curve
      if (e.key === 'Escape' && (curveState?.points.length ?? 0) > 0 && cancelCurve) {
        cancelCurve();
        e.preventDefault();
      }

      // Enter to finish curve
      if (e.key === 'Enter' && (curveState?.points.length ?? 0) >= 2 && finishCurve) {
        finishCurve();
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activePlugin, curveState?.selectedPointId, curveState?.points.length, deleteSelectedPoint, cancelCurve, finishCurve]);

  return {
    isSpacePressed,
    isShiftPressed: isEffectiveShiftPressed
  };
};