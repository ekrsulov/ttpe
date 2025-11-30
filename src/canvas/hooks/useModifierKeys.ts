import { useState, useEffect, useCallback, useMemo } from 'react';

export interface ModifierKeysState {
  isShiftPressed: boolean;
  isCtrlPressed: boolean;
  isMetaPressed: boolean;
  isAltPressed: boolean;
  /** True if shift OR ctrl/meta is pressed (for multi-select) */
  isMultiSelectActive: boolean;
}

const SHIFT_KEYS = new Set(['Shift', 'ShiftLeft', 'ShiftRight']);
const CTRL_KEYS = new Set(['Control', 'ControlLeft', 'ControlRight']);
const META_KEYS = new Set(['Meta', 'MetaLeft', 'MetaRight']);
const ALT_KEYS = new Set(['Alt', 'AltLeft', 'AltRight']);

/**
 * Consolidated hook for tracking keyboard modifier keys.
 * Replaces duplicate tracking in useCanvasKeyboardControls and useSelectionController.
 * 
 * @param virtualShiftActive - Optional external shift state (e.g., from touch UI)
 * @returns Current modifier keys state
 */
export function useModifierKeys(virtualShiftActive = false): ModifierKeysState {
  const [shiftPressed, setShiftPressed] = useState(false);
  const [ctrlPressed, setCtrlPressed] = useState(false);
  const [metaPressed, setMetaPressed] = useState(false);
  const [altPressed, setAltPressed] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (SHIFT_KEYS.has(e.key) || SHIFT_KEYS.has(e.code)) {
      setShiftPressed(true);
    }
    if (CTRL_KEYS.has(e.key) || CTRL_KEYS.has(e.code)) {
      setCtrlPressed(true);
    }
    if (META_KEYS.has(e.key) || META_KEYS.has(e.code)) {
      setMetaPressed(true);
    }
    if (ALT_KEYS.has(e.key) || ALT_KEYS.has(e.code)) {
      setAltPressed(true);
    }
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (SHIFT_KEYS.has(e.key) || SHIFT_KEYS.has(e.code)) {
      setShiftPressed(false);
    }
    if (CTRL_KEYS.has(e.key) || CTRL_KEYS.has(e.code)) {
      setCtrlPressed(false);
    }
    if (META_KEYS.has(e.key) || META_KEYS.has(e.code)) {
      setMetaPressed(false);
    }
    if (ALT_KEYS.has(e.key) || ALT_KEYS.has(e.code)) {
      setAltPressed(false);
    }
  }, []);

  // Reset all modifiers when window loses focus
  const handleBlur = useCallback(() => {
    setShiftPressed(false);
    setCtrlPressed(false);
    setMetaPressed(false);
    setAltPressed(false);
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [handleKeyDown, handleKeyUp, handleBlur]);

  // Combine physical shift with virtual shift
  const isShiftPressed = shiftPressed || virtualShiftActive;
  const isMultiSelectActive = isShiftPressed || ctrlPressed || metaPressed;

  return useMemo(() => ({
    isShiftPressed,
    isCtrlPressed: ctrlPressed,
    isMetaPressed: metaPressed,
    isAltPressed: altPressed,
    isMultiSelectActive,
  }), [isShiftPressed, ctrlPressed, metaPressed, altPressed, isMultiSelectActive]);
}
