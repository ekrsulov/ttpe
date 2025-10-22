import React, { useMemo, useEffect, useRef } from 'react';
import { CurvesController } from '../../canvas/interactions/CurvesController';
import { useCanvasStore } from '../../store/canvasStore';
import { CurvesControllerContext } from './curvesContext';

export const CurvesControllerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const controller = useMemo(() => new CurvesController({
    pushToHistory: () => {
      // Using temporal middleware, changes are automatically tracked
    },
    addElement: (element) => useCanvasStore.getState().addElement(element),
    onCurveFinished: (elementId) => {
      // Switch to select mode and select the newly created element
      useCanvasStore.getState().setMode('select');
      useCanvasStore.getState().selectElement(elementId);
    },
  }), []);

  // Listen to controller state changes
  useEffect(() => {
    const unsubscribe = controller.addListener(() => {
      const newState = controller.getState();
      useCanvasStore.getState().setCurveState?.(newState);
    });
    return unsubscribe;
  }, [controller]);

  // Listen to canvas store changes to activate/deactivate curves
  const prevActiveRef = useRef<boolean>(false);

  useEffect(() => {
    const state = useCanvasStore.getState();
    const isActive = state.activePlugin === 'curves';
    const wasActive = prevActiveRef.current;

    if (isActive && !wasActive) {
      controller.activate();
    } else if (!isActive && wasActive) {
      controller.deactivate();
    }

    prevActiveRef.current = isActive;
  }); // No dependencies - this runs on every render but uses ref to prevent cycles

  const curveState = useCanvasStore(state => state.curveState ?? {
    mode: 'inactive' as const,
    isActive: false,
    points: [],
    isClosingPath: false,
  });

  const value = useMemo(() => ({ controller, curveState }), [controller, curveState]);

  return (
    <CurvesControllerContext.Provider value={value}>
      {children}
    </CurvesControllerContext.Provider>
  );
};
