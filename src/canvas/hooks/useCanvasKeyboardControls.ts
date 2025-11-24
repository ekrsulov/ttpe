import { useState, useEffect } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { isTextFieldFocused } from '../../utils/domHelpers';

export const useCanvasKeyboardControls = () => {
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const isVirtualShiftActive = useCanvasStore(state => state.isVirtualShiftActive);

  // Computed effective shift state (physical OR virtual)
  const isEffectiveShiftPressed = isShiftPressed || isVirtualShiftActive;

  // Handle space and shift keys
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
  }, []);

  return {
    isSpacePressed,
    isShiftPressed: isEffectiveShiftPressed
  };
};