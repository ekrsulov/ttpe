import { useState, useEffect } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { isTextFieldFocused } from '../../utils/domHelpers';
import { useModifierKeys } from './useModifierKeys';

export const useCanvasKeyboardControls = () => {
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const isVirtualShiftActive = useCanvasStore(state => state.isVirtualShiftActive);
  
  // Use consolidated modifier keys hook
  const modifiers = useModifierKeys(isVirtualShiftActive);

  // Handle space key for pan mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't activate pan mode if user is typing in an input or textarea
      if (e.code === 'Space' && !e.repeat) {
        if (!isTextFieldFocused()) {
          setIsSpacePressed(true);
          e.preventDefault();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
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
    isShiftPressed: modifiers.isShiftPressed,
    modifiers,
  };
};