import { useCallback, useEffect, useMemo, useState } from 'react';
import { completeSelection, type SelectionCallbacks } from '../interactions/SelectionStrategyController';
import { useCanvasEventBus, type CanvasKeyboardEventPayload, type CanvasPointerEventPayload } from '../CanvasEventBusContext';
import { useCanvasStore } from '../../store/canvasStore';
import type { Point } from '../../types';
import { mergeUniqueByKey } from '../../utils/coreHelpers';
import type { SelectionData } from '../selection/SelectionStrategy';

// Constants for modifier keys
const SHIFT_KEYS = new Set(['Shift', 'ShiftLeft', 'ShiftRight']);
const CTRL_KEYS = new Set(['Control', 'ControlLeft', 'ControlRight']);
const META_KEYS = new Set(['Meta', 'MetaLeft', 'MetaRight']);

export interface SelectionControllerState {
  isShiftPressed: boolean;
  isCtrlPressed: boolean;
  isMultiSelectActive: boolean;
  lastTargetId: string | null;
}

export interface UseSelectionControllerResult {
  isSelecting: boolean;
  selectionStart: Point | null;
  selectionEnd: Point | null;
  beginSelectionRectangle: (point: Point, shouldClearCommands?: boolean, shouldClearSubpaths?: boolean) => void;
  updateSelectionRectangle: (point: Point) => void;
  completeSelectionRectangle: () => void;
  selectElement: (elementId: string, toggle: boolean) => void;
  toggleSelection: (elementId: string) => void;
  clearSelection: () => void;
  modifiers: SelectionControllerState;
}

export const useSelectionController = (): UseSelectionControllerResult => {
  const eventBus = useCanvasEventBus();
  const {
    activePlugin,
    clearSelectedCommands,
    clearSubpathSelection,
    setSelectionPath,
    clearSelectionPath,
    selectionPath,
    selectElement: selectElementAction,
    clearSelection: clearSelectionAction
  } = useCanvasStore();

  // --- Selection Modifiers State ---
  const [modifiers, setModifiers] = useState<SelectionControllerState>({
    isShiftPressed: false,
    isCtrlPressed: false,
    isMultiSelectActive: false,
    lastTargetId: null,
  });

  // Helper to extract target ID
  const extractTargetId = useCallback((target: EventTarget | null): string | null => {
    let current: EventTarget | null = target;

    while (current && 'getAttribute' in (current as Element)) {
      const element = current as Element;
      const elementId = element.getAttribute('data-element-id');
      if (elementId) {
        return elementId;
      }
      if (element.tagName.toLowerCase() === 'svg') {
        return 'canvas';
      }
      current = element.parentElement;
    }

    return null;
  }, []);

  // Update modifiers state helper
  const updateModifiers = useCallback((partial: Partial<SelectionControllerState>) => {
    setModifiers(prev => {
      const next = { ...prev, ...partial };
      next.isMultiSelectActive = next.isShiftPressed || next.isCtrlPressed;

      // Only update if changed
      if (
        prev.isShiftPressed === next.isShiftPressed &&
        prev.isCtrlPressed === next.isCtrlPressed &&
        prev.isMultiSelectActive === next.isMultiSelectActive &&
        prev.lastTargetId === next.lastTargetId
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  // Subscribe to events
  useEffect(() => {
    const unsubscribePointerDown = eventBus.subscribe('pointerdown', ({ target }: CanvasPointerEventPayload) => {
      const targetId = extractTargetId(target);
      updateModifiers({ lastTargetId: targetId });
    });

    const unsubscribePointerUp = eventBus.subscribe('pointerup', ({ target }: CanvasPointerEventPayload) => {
      const targetId = extractTargetId(target);
      updateModifiers({ lastTargetId: targetId });
    });

    const unsubscribeKeyboard = eventBus.subscribe('keyboard', ({ event }: CanvasKeyboardEventPayload) => {
      if (SHIFT_KEYS.has(event.key) || SHIFT_KEYS.has(event.code)) {
        updateModifiers({ isShiftPressed: true });
      } else if (
        CTRL_KEYS.has(event.key) ||
        CTRL_KEYS.has(event.code) ||
        META_KEYS.has(event.key) ||
        META_KEYS.has(event.code)
      ) {
        updateModifiers({ isCtrlPressed: true });
      }
    });

    const handleKeyUp = (event: KeyboardEvent) => {
      if (SHIFT_KEYS.has(event.key) || SHIFT_KEYS.has(event.code)) {
        updateModifiers({ isShiftPressed: false });
      } else if (
        CTRL_KEYS.has(event.key) ||
        CTRL_KEYS.has(event.code) ||
        META_KEYS.has(event.key) ||
        META_KEYS.has(event.code)
      ) {
        updateModifiers({ isCtrlPressed: false });
      }
    };

    window.addEventListener('keyup', handleKeyUp);

    return () => {
      unsubscribePointerDown();
      unsubscribePointerUp();
      unsubscribeKeyboard();
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [eventBus, extractTargetId, updateModifiers]);

  // --- Pointer Selection State ---
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<Point | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<Point | null>(null);

  const isShiftPressed = modifiers.isShiftPressed || modifiers.isCtrlPressed;

  // --- Selection Strategy Controller ---
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



  // --- Pointer Selection Actions ---
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

    // Determine selection strategy ID
    const state = useCanvasStore.getState() as Record<string, unknown>;
    const activeStrategyId = (state.activeSelectionStrategy as string | undefined) ?? 'rectangle';

    // Build selection data
    const selectionData: SelectionData = {
      start: selectionStart,
      end: selectionEnd,
      path: selectionPath.length > 2 ? selectionPath : undefined,
      closed: lassoClosed,
    };

    // Handle selection using the strategy controller
    completeSelection(
      selectionData,
      activeStrategyId,
      activePlugin,
      elements,
      viewport.zoom,
      isShiftPressed,
      callbacks,
      selectedIds,
      getFilteredEditablePoints
    );

    // Reset selection state
    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
    clearSelectionPath();
  }, [isSelecting, selectionStart, selectionEnd, selectionPath, activePlugin, isShiftPressed, callbacks, clearSelectionPath]);

  // --- Element Selection Actions ---
  const handleSelectElement = useCallback(
    (elementId: string, toggle: boolean) => {
      selectElementAction(elementId, toggle || modifiers.isMultiSelectActive);
    },
    [selectElementAction, modifiers.isMultiSelectActive]
  );

  const handleToggleSelection = useCallback(
    (elementId: string) => {
      selectElementAction(elementId, true);
    },
    [selectElementAction]
  );

  const handleClearSelection = useCallback(() => {
    if (useCanvasStore.getState().selectedIds.length > 0) {
      clearSelectionAction();
    }
  }, [clearSelectionAction]);

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
