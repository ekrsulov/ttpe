import { useState, useEffect } from 'react';
import { useCanvasStore } from '../store/canvasStore';

export const useCanvasKeyboardControls = () => {
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const {
    selectedCommands,
    selectedSubpaths,
    selectedIds,
    deleteSelectedCommands,
    deleteSelectedSubpaths,
    deleteSelectedElements,
    moveSelectedPoints,
    moveSelectedSubpaths,
    moveSelectedElements
  } = useCanvasStore();

  // Handle space and delete keys
  useEffect(() => {
    // Utility function to check if focus is on a text input field
    const isTextFieldFocused = (): boolean => {
      const activeElement = document.activeElement;
      return !!(activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement as HTMLElement).contentEditable === 'true'
      ));
    };

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
        if (!isTextFieldFocused() && selectedCommands.length > 0) {
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
  }, [selectedCommands.length, deleteSelectedCommands]);

  // Handle arrow keys for movement and delete for other selections
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not typing in an input
      const isTextFieldFocused = (): boolean => {
        const activeElement = document.activeElement;
        return !!(activeElement && (
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          (activeElement as HTMLElement).contentEditable === 'true'
        ));
      };

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
        // Check what is selected and move accordingly
        // Priority: points > subpaths > paths
        if (selectedCommands.length > 0) {
          // Move selected points
          moveSelectedPoints(deltaX, deltaY);
        } else if (selectedSubpaths.length > 0) {
          // Move selected subpaths
          moveSelectedSubpaths(deltaX, deltaY);
        } else if (selectedIds.length > 0) {
          // Move selected elements (paths)
          moveSelectedElements(deltaX, deltaY);
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        // Delete selected items
        // Priority: points > subpaths > paths
        if (selectedCommands.length > 0) {
          deleteSelectedCommands();
        } else if (selectedSubpaths.length > 0) {
          deleteSelectedSubpaths();
        } else if (selectedIds.length > 0) {
          deleteSelectedElements();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedCommands.length, selectedSubpaths.length, selectedIds.length, moveSelectedPoints, moveSelectedSubpaths, moveSelectedElements, deleteSelectedCommands, deleteSelectedSubpaths, deleteSelectedElements]);

  return {
    isSpacePressed,
    isShiftPressed
  };
};