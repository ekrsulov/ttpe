import React from 'react';
import type { PluginDefinition, PluginSliceFactory, PluginHandlerContext, CanvasLayerContext } from '../../types/plugins';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { CanvasStore } from '../../store/canvasStore';
import type { Point, CanvasElement } from '../../types';
import { getToolMetadata } from '../toolMetadata';
import { calculateBounds } from '../../utils/boundsUtils';
import { createMeasurePluginSlice } from './slice';
import type { MeasurePluginSlice, MeasurePluginActions, SnapInfo } from './slice';
import { useCanvasStore } from '../../store/canvasStore';
import { MeasureOverlay } from './MeasureOverlay';
import { MeasureInfoPanel } from './MeasureInfoPanel';
import { getAllSnapPoints, findClosestSnapPoint, findEdgeSnapPoint, screenDistance, getSnapPointLabel } from '../../utils/snapPointUtils';
import { getEffectiveShift } from '../../utils/effectiveShift';
import { SnapPointsCache } from './SnapPointsCache';
import { SnapPointCrossOverlay } from '../../overlays/SnapPointOverlay';
import { FeedbackOverlay } from '../../overlays/FeedbackOverlay';

import type { SnapPointCache } from './slice';

type MeasurePluginApi = {
  startMeasurement: (point: Point, snapInfo?: SnapInfo | null) => void;
  updateMeasurement: (point: Point, snapInfo?: SnapInfo | null) => void;
  finalizeMeasurement: () => void;
  clearMeasurement: () => void;
  refreshSnapPointsCache: (snapPoints: SnapPointCache[]) => void;
};

/**
 * Constrain a point relative to a start point to the closest of 8 directions
 * (horizontal, vertical, or diagonal 45deg steps) while preserving distance.
 */
function constrainToCardinalAndDiagonal(start: Point, point: Point): Point {
  const dx = point.x - start.x;
  const dy = point.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length === 0) return point;

  // Candidate directions in radians
  const dirs = [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4, Math.PI, -(3 * Math.PI) / 4, -Math.PI / 2, -Math.PI / 4];
  const angle = Math.atan2(dy, dx);
  let best = dirs[0];
  let bestDiff = Math.abs(normalizeAngle(angle - dirs[0]));

  for (let i = 1; i < dirs.length; i++) {
    const d = dirs[i];
    const diff = Math.abs(normalizeAngle(angle - d));
    if (diff < bestDiff) {
      bestDiff = diff;
      best = d;
    }
  }

  return {
    x: start.x + Math.cos(best) * length,
    y: start.y + Math.sin(best) * length,
  };
}

function normalizeAngle(angle: number): number {
  // Normalize angle between -PI and PI
  let a = angle;
  while (a <= -Math.PI) a += 2 * Math.PI;
  while (a > Math.PI) a -= 2 * Math.PI;
  return a;
}

const measureSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slice = createMeasurePluginSlice(set as any, get as any, api as any) as MeasurePluginSlice & MeasurePluginActions;
  return {
    state: slice as any, // eslint-disable-line @typescript-eslint/no-explicit-any
  };
};

// Global listener flags and cleanup handles (kept in the module scope)
let listenersInstalled = false;
let stopStoreSubscription: (() => void) | null = null;

const installListeners = (context: PluginHandlerContext<CanvasStore>, api: MeasurePluginApi) => {
  if (listenersInstalled) return;
  listenersInstalled = true;

  const handlePointerMove = (moveEvent: PointerEvent) => {
    const svg = document.querySelector('svg');
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const currentState = context.store.getState() as unknown as MeasurePluginSlice & CanvasStore;

    const canvasPoint = {
      x: (moveEvent.clientX - rect.left - currentState.viewport.panX) / currentState.viewport.zoom,
      y: (moveEvent.clientY - rect.top - currentState.viewport.panY) / currentState.viewport.zoom,
    };

    // Try to snap
    // Apply snap with priority: high-priority points first, then edge snap
    let moveSnapInfo: SnapInfo | null = null;
    if (currentState.measure.enableSnapping) {
      const getElementBoundsFn = (element: CanvasElement) => {
        if (element.type !== 'path') return null;
        const pathData = element.data;
        if (!pathData?.subPaths) return null;
        return calculateBounds(pathData.subPaths, pathData.strokeWidth || 0, currentState.viewport.zoom);
      };

      // Get high-priority snap points (using configured snap options)
      const highPriorityPoints = getAllSnapPoints(
        currentState.elements,
        getElementBoundsFn,
        {
          snapToAnchors: currentState.measure.snapToAnchors,
          snapToMidpoints: currentState.measure.snapToMidpoints,
          snapToBBoxCorners: currentState.measure.snapToBBoxCorners,
          snapToBBoxCenter: currentState.measure.snapToBBoxCenter,
          snapToIntersections: currentState.measure.snapToIntersections,
        }
      );

      // Find closest high-priority snap
      moveSnapInfo = findClosestSnapPoint(
        canvasPoint,
        highPriorityPoints,
        currentState.measure.snapThreshold,
        currentState.viewport.zoom
      );

      // Only check edge snap if no high-priority snap found and edge snap is enabled
      if (!moveSnapInfo && currentState.measure.snapToEdges) {
        for (const element of currentState.elements) {
          const edgeSnap = findEdgeSnapPoint(
            canvasPoint,
            element,
            currentState.measure.snapThreshold,
            currentState.viewport.zoom
          );
          if (edgeSnap) {
            const dist = screenDistance(canvasPoint, edgeSnap.point, currentState.viewport.zoom);
            if (dist < currentState.measure.snapThreshold) {
              moveSnapInfo = edgeSnap;
              break;
            }
          }
        }
      }
    }

    // Only update while measurement is active (not frozen)
    if (currentState.measure?.measurement?.isActive) {
      const finalMovePoint = moveSnapInfo?.point ?? canvasPoint;
      // If shift is pressed, constrain to horizontal/vertical/diagonal
      const effectiveShift = getEffectiveShift(moveEvent.shiftKey, currentState.isVirtualShiftActive);
      const pointToSet = (effectiveShift && currentState.measure?.measurement?.startPoint)
        ? constrainToCardinalAndDiagonal(currentState.measure.measurement.startPoint, finalMovePoint)
        : finalMovePoint;
      api.updateMeasurement(pointToSet, moveSnapInfo);
    }
  };

  const handlePointerUp = (upEvent: PointerEvent) => {
    const svg = document.querySelector('svg');
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const currentState = context.store.getState() as unknown as MeasurePluginSlice & CanvasStore;

    const canvasPoint = {
      x: (upEvent.clientX - rect.left - currentState.viewport.panX) / currentState.viewport.zoom,
      y: (upEvent.clientY - rect.top - currentState.viewport.panY) / currentState.viewport.zoom,
    };

    // Apply snap with priority: high-priority points first, then edge snap
    let upSnapInfo: SnapInfo | null = null;
    if (currentState.measure.enableSnapping) {
      const getElementBoundsFn = (element: CanvasElement) => {
        if (element.type !== 'path') return null;
        const pathData = element.data;
        if (!pathData?.subPaths) return null;
        return calculateBounds(pathData.subPaths, pathData.strokeWidth || 0, currentState.viewport.zoom);
      };

      // Get high-priority snap points (using configured snap options)
      const highPriorityPoints = getAllSnapPoints(
        currentState.elements,
        getElementBoundsFn,
        {
          snapToAnchors: currentState.measure.snapToAnchors,
          snapToMidpoints: currentState.measure.snapToMidpoints,
          snapToBBoxCorners: currentState.measure.snapToBBoxCorners,
          snapToBBoxCenter: currentState.measure.snapToBBoxCenter,
          snapToIntersections: currentState.measure.snapToIntersections,
        }
      );

      // Find closest high-priority snap
      upSnapInfo = findClosestSnapPoint(
        canvasPoint,
        highPriorityPoints,
        currentState.measure.snapThreshold,
        currentState.viewport.zoom
      );

      // Only check edge snap if no high-priority snap found and edge snap is enabled
      if (!upSnapInfo && currentState.measure.snapToEdges) {
        for (const element of currentState.elements) {
          const edgeSnap = findEdgeSnapPoint(
            canvasPoint,
            element,
            currentState.measure.snapThreshold,
            currentState.viewport.zoom
          );
          if (edgeSnap) {
            const dist = screenDistance(canvasPoint, edgeSnap.point, currentState.viewport.zoom);
            if (dist < currentState.measure.snapThreshold) {
              upSnapInfo = edgeSnap;
              break;
            }
          }
        }
      }
    }

    let finalUpPoint = upSnapInfo?.point ?? canvasPoint;
    // If shift is pressed, constrain final position
    const effectiveShiftUp = getEffectiveShift(upEvent.shiftKey, currentState.isVirtualShiftActive);
    if (effectiveShiftUp && currentState.measure?.measurement?.startPoint) {
      finalUpPoint = constrainToCardinalAndDiagonal(currentState.measure.measurement.startPoint, finalUpPoint);
    }
    // Commit the final location
    if (currentState.measure?.measurement?.isActive) {
      api.updateMeasurement(finalUpPoint, upSnapInfo);

      // Check if we dragged (distance > 5px)
      // If so, finalize (freeze) the measurement immediately
      if (currentState.measure.measurement.startPoint) {
        const dist = screenDistance(currentState.measure.measurement.startPoint, finalUpPoint, currentState.viewport.zoom);
        // 5 screen pixels threshold for "drag"
        if (dist > 5) {
          api.finalizeMeasurement();
        }
      }
    }
  };

  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', handlePointerUp);

  // Subscribe to store to remove listeners when the active plugin changes away from measure
  stopStoreSubscription = context.store.subscribe((s) => {
    const state = s as unknown as MeasurePluginSlice & CanvasStore;
    // Remove listeners when plugin is no longer 'measure' or when measurement was cleared
    if (state.activePlugin !== 'measure' || !(state.measure?.measurement?.isActive)) {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      if (stopStoreSubscription) stopStoreSubscription();
      listenersInstalled = false;
      stopStoreSubscription = null;
    }
  });
};

const MeasureSnapPointsLayer = ({ context }: { context: CanvasLayerContext }) => {
  const measureState = useCanvasStore(state => (state as CanvasStore & MeasurePluginSlice).measure);
  const { activePlugin } = context;

  if (activePlugin !== 'measure') {
    return null;
  }

  const showSnapPoints = measureState?.showSnapPoints ?? false;
  const snapPointsOpacity = measureState?.snapPointsOpacity ?? 50;

  return (
    <>
      <SnapPointsCache />
      {measureState?.cachedSnapPoints && showSnapPoints && (
        <SnapPointCrossOverlay
          snapPoints={measureState.cachedSnapPoints}
          viewport={context.viewport}
          opacity={snapPointsOpacity / 100}
          showAllPoints={true}
        />
      )}
    </>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const measurePlugin: PluginDefinition<CanvasStore> = {
  id: 'measure',
  metadata: getToolMetadata('measure'),
  // (Listeners are installed in module scope via `installListeners`)

  handler: (event: ReactPointerEvent, point: Point, _target: Element, context: PluginHandlerContext<CanvasStore>) => {
    const api = context.api as MeasurePluginApi;
    const state = context.store.getState() as unknown as MeasurePluginSlice & CanvasStore;

    // Helper to get element bounds
    const getElementBoundsFn = (element: CanvasElement) => {
      if (element.type !== 'path') return null;
      const pathData = element.data;
      if (!pathData?.subPaths) return null;

      // Calculate bounds manually using measurePath utility
      return calculateBounds(pathData.subPaths, pathData.strokeWidth || 0, state.viewport.zoom);
    };

    // Handler is called on pointerdown by the plugin manager
    // Try to snap to nearby elements with priority
    let snapInfo: SnapInfo | null = null;
    if (state.measure.enableSnapping) {
      // Get high-priority snap points
      const highPriorityPoints = getAllSnapPoints(
        state.elements,
        getElementBoundsFn,
        {
          snapToAnchors: true,
          snapToMidpoints: true,
          snapToBBoxCorners: true,
          snapToBBoxCenter: true,
          snapToIntersections: true,
        }
      );

      // Find closest high-priority snap
      snapInfo = findClosestSnapPoint(
        point,
        highPriorityPoints,
        state.measure.snapThreshold,
        state.viewport.zoom
      );

      // Only check edge snap if no high-priority snap found
      if (!snapInfo) {
        for (const element of state.elements) {
          const edgeSnap = findEdgeSnapPoint(
            point,
            element,
            state.measure.snapThreshold,
            state.viewport.zoom
          );
          if (edgeSnap) {
            const dist = screenDistance(point, edgeSnap.point, state.viewport.zoom);
            if (dist < state.measure.snapThreshold) {
              snapInfo = edgeSnap;
              break;
            }
          }
        }
      }
    }

    const finalPoint = snapInfo?.point ?? point;

    // If there is a frozen measurement (not active but has points), clear it on click
    if (!state.measure.measurement.isActive && state.measure.measurement.startPoint && state.measure.measurement.endPoint) {
      api.clearMeasurement();
      return;
    }

    // If there is no active measurement, start a new one and ensure we have global listeners
    if (!state.measure.measurement.isActive) {
      api.startMeasurement(finalPoint, snapInfo);
      installListeners(context, api);
      return;
    }

    // If a measurement is already active, treat this pointerdown as intent to finalize (freeze)
    // the measurement at the clicked point. Update & finalize then listeners will be removed
    // via the store subscription in installListeners when `isActive` becomes false.
    // If shift is held during finalization (physical OR virtual), constrain to axis/diagonals
    const handlerEffectiveShift = getEffectiveShift(event.shiftKey, state.isVirtualShiftActive);
    const finalPointToSet = handlerEffectiveShift && state.measure?.measurement?.startPoint
      ? constrainToCardinalAndDiagonal(state.measure.measurement.startPoint, finalPoint)
      : finalPoint;
    api.updateMeasurement(finalPointToSet, snapInfo);
    api.finalizeMeasurement();
  },
  keyboardShortcuts: {
    Escape: (_event, { store }) => {
      const state = store.getState() as unknown as MeasurePluginSlice & MeasurePluginActions;
      state.clearMeasurement?.();
    },
    'Shift+M': (_event, { store }) => {
      const state = store.getState() as unknown as MeasurePluginSlice & MeasurePluginActions;
      state.updateMeasureState?.({
        showInfo: !state.measure?.showInfo,
      });
    },
    'm': {
      handler: (_event, { store }) => {
        const state = store.getState() as unknown as MeasurePluginSlice & CanvasStore;
        state.setActivePlugin('measure');
      },
      options: {
        allowWhileTyping: false,
      },
    },
  },
  canvasLayers: [
    {
      id: 'measure-snap-points',
      placement: 'background',
      render: (context) => <MeasureSnapPointsLayer context={context} />,
    },
    {
      id: 'measure-overlay',
      placement: 'foreground',
      render: (context) => {
        const MeasureOverlayWrapper = () => {
          const measureState = useCanvasStore(state => (state as CanvasStore & MeasurePluginSlice).measure);
          const { activePlugin, settings } = context as any; // eslint-disable-line @typescript-eslint/no-explicit-any

          if (activePlugin !== 'measure') {
            return null;
          }

          if (!measureState) {
            return null;
          }

          const { measurement, showInfo, units, startSnapInfo, currentSnapInfo } = measureState;
          const precision = settings?.keyboardMovementPrecision ?? 1;

          // Render measure overlay if there is an active measurement OR a frozen one with start/end points
          if (!measurement?.isActive && !(measurement?.startPoint && measurement?.endPoint)) {
            return null;
          }

          return (
            <MeasureOverlay
              measurement={measurement}
              viewport={context.viewport}
              startSnapInfo={startSnapInfo ?? null}
              currentSnapInfo={currentSnapInfo ?? null}
              units={units ?? 'px'}
              showInfo={showInfo ?? true}
              precision={precision}
            />
          );
        };

        return <MeasureOverlayWrapper />;
      },
    },
    {
      id: 'measure-feedback',
      placement: 'foreground',
      render: (context) => {
        const MeasureFeedbackWrapper = () => {
          const measureState = useCanvasStore(state => (state as CanvasStore & MeasurePluginSlice).measure);
          const { activePlugin, viewport, canvasSize } = context as any; // eslint-disable-line @typescript-eslint/no-explicit-any

          if (activePlugin !== 'measure') {
            return null;
          }

          if (!measureState) {
            return null;
          }

          const { measurement, currentSnapInfo } = measureState;

          if (!measurement?.isActive || !currentSnapInfo) {
            return null;
          }

          // Create custom feedback message for snap type using helper
          const snapMessage = getSnapPointLabel(currentSnapInfo.type);

          return (
            <FeedbackOverlay
              viewport={viewport}
              canvasSize={canvasSize}
              customFeedback={{ message: snapMessage, visible: true }}
            />
          );
        };

        return <MeasureFeedbackWrapper />;
      },
    },
  ],
  slices: [measureSliceFactory],
  createApi: ({ store }) => ({
    startMeasurement: (point: Point, snapInfo?: SnapInfo | null) => {
      const state = store.getState() as unknown as MeasurePluginSlice & MeasurePluginActions;
      state.startMeasurement?.(point, snapInfo);
    },
    updateMeasurement: (point: Point, snapInfo?: SnapInfo | null) => {
      const state = store.getState() as unknown as MeasurePluginSlice & MeasurePluginActions;
      state.updateMeasurement?.(point, snapInfo);
    },
    finalizeMeasurement: () => {
      const state = store.getState() as unknown as MeasurePluginSlice & MeasurePluginActions;
      state.finalizeMeasurement?.();
    },
    clearMeasurement: () => {
      const state = store.getState() as unknown as MeasurePluginSlice & MeasurePluginActions;
      state.clearMeasurement?.();
    },
    refreshSnapPointsCache: (snapPoints: SnapPointCache[]) => {
      const state = store.getState() as unknown as MeasurePluginSlice & MeasurePluginActions;
      state.refreshSnapPointsCache?.(snapPoints);
    },
  }),
  expandablePanel: () => React.createElement(MeasureInfoPanel, { hideTitle: true }),
  sidebarPanels: [
    {
      key: 'measure',
      condition: (ctx) => !ctx.isInSpecialPanelMode && ctx.activePlugin === 'measure',
      component: MeasureInfoPanel,
    },
  ],
};

export type { MeasurePluginSlice };
export { MeasureInfoPanel };
