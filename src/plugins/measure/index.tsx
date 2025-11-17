import React from 'react';
import type { PluginDefinition, PluginSliceFactory, PluginHandlerContext } from '../../types/plugins';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { CanvasStore } from '../../store/canvasStore';
import type { Point, CanvasElement } from '../../types';
import { getToolMetadata } from '../toolMetadata';
import { calculateBounds } from '../../utils/boundsUtils';
import { createMeasurePluginSlice } from './slice';
import type { MeasurePluginSlice, MeasurePluginActions, SnapInfo } from './slice';
import { MeasureOverlay } from './MeasureOverlay';
import { MeasureInfoPanel } from './MeasureInfoPanel';
import { findSnapPoint } from './snapUtils';
import { SnapPointsCache } from './SnapPointsCache';
import { SnapPointsOverlay } from './SnapPointsOverlay';
import { FeedbackOverlay } from '../../overlays/FeedbackOverlay';

import type { SnapPointCache } from './slice';

type MeasurePluginApi = {
  startMeasurement: (point: Point, snapInfo?: SnapInfo | null) => void;
  updateMeasurement: (point: Point, snapInfo?: SnapInfo | null) => void;
  finalizeMeasurement: () => void;
  clearMeasurement: () => void;
  refreshSnapPointsCache: (snapPoints: SnapPointCache[]) => void;
};

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
    const moveSnapInfo = currentState.measure.enableSnapping
      ? findSnapPoint(
          canvasPoint,
          currentState.elements,
          (element: CanvasElement) => {
            if (element.type !== 'path') return null;
            const pathData = element.data;
            if (!pathData?.subPaths) return null;
            return calculateBounds(pathData.subPaths, pathData.strokeWidth || 0, currentState.viewport.zoom);
          },
          currentState.measure.snapThreshold,
          currentState.viewport.zoom
        )
      : null;

      // Only update while measurement is active (not frozen)
      if (currentState.measure?.measurement?.isActive) {
        const finalMovePoint = moveSnapInfo?.point ?? canvasPoint;
        api.updateMeasurement(finalMovePoint, moveSnapInfo);
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

    const upSnapInfo = currentState.measure.enableSnapping
      ? findSnapPoint(
          canvasPoint,
          currentState.elements,
          (element: CanvasElement) => {
            if (element.type !== 'path') return null;
            const pathData = element.data;
            if (!pathData?.subPaths) return null;
            return calculateBounds(pathData.subPaths, pathData.strokeWidth || 0, currentState.viewport.zoom);
          },
          currentState.measure.snapThreshold,
          currentState.viewport.zoom
        )
      : null;

    const finalUpPoint = upSnapInfo?.point ?? canvasPoint;
    // Commit the final location but DO NOT finalize (we keep the measurement visible)
    if (currentState.measure?.measurement?.isActive) {
      api.updateMeasurement(finalUpPoint, upSnapInfo);
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

// eslint-disable-next-line react-refresh/only-export-components
export const measurePlugin: PluginDefinition<CanvasStore> = {
  id: 'measure',
  metadata: getToolMetadata('measure'),
  // (Listeners are installed in module scope via `installListeners`)

  handler: (_event: ReactPointerEvent, point: Point, _target: Element, context: PluginHandlerContext<CanvasStore>) => {
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
    // Try to snap to nearby elements
    const snapInfo = state.measure.enableSnapping
      ? findSnapPoint(
          point,
          state.elements,
          getElementBoundsFn,
          state.measure.snapThreshold,
          state.viewport.zoom
        )
      : null;

    const finalPoint = snapInfo?.point ?? point;

    // If there is no active measurement, start a new one and ensure we have global listeners
    if (!state.measure.measurement.isActive) {
      api.startMeasurement(finalPoint, snapInfo);
      installListeners(context, api);
      return;
    }

    // If a measurement is already active, treat this pointerdown as intent to finalize (freeze)
    // the measurement at the clicked point. Update & finalize then listeners will be removed
    // via the store subscription in installListeners when `isActive` becomes false.
    api.updateMeasurement(finalPoint, snapInfo);
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
  },
  canvasLayers: [
    {
      id: 'measure-snap-points',
      placement: 'background',
      render: (context) => {
        const { activePlugin, measure: measureState } = context as any; // eslint-disable-line @typescript-eslint/no-explicit-any
        
        if (activePlugin !== 'measure') {
          return null;
        }

        if (!measureState?.cachedSnapPoints) {
          return null;
        }

        const showSnapPoints = measureState.showSnapPoints ?? true;
        const snapPointsOpacity = measureState.snapPointsOpacity ?? 50;

        // Render snap points cache component and overlay
        return (
          <>
            <SnapPointsCache />
            {showSnapPoints && (
              <SnapPointsOverlay
                snapPoints={measureState.cachedSnapPoints}
                viewport={context.viewport}
                opacity={snapPointsOpacity}
              />
            )}
          </>
        );
      },
    },
    {
      id: 'measure-overlay',
      placement: 'foreground',
      render: (context) => {
        const { activePlugin, measure: measureState } = context as any; // eslint-disable-line @typescript-eslint/no-explicit-any
        
        if (activePlugin !== 'measure') {
          return null;
        }

        if (!measureState) {
          return null;
        }

        const { measurement, showInfo, units, startSnapInfo, currentSnapInfo } = measureState;
        const { settings } = context as any; // eslint-disable-line @typescript-eslint/no-explicit-any
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
      },
    },
    {
      id: 'measure-feedback',
      placement: 'foreground',
      render: (context) => {
        const { activePlugin, measure: measureState, viewport, canvasSize } = context as any; // eslint-disable-line @typescript-eslint/no-explicit-any
        
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

        // Create custom feedback message for snap type
        const snapTypeMap: Record<SnapInfo['type'], string> = {
          anchor: 'Anchor',
          edge: 'Path',
          midpoint: 'Midpoint',
          'bbox-corner': 'Corner',
          'bbox-center': 'Center',
          tangent: 'Tangent',
          intersection: 'Intersection',
        };
        const snapMessage = snapTypeMap[currentSnapInfo.type as SnapInfo['type']];

        return (
          <FeedbackOverlay
            viewport={viewport}
            canvasSize={canvasSize}
            customFeedback={{ message: snapMessage, visible: true }}
          />
        );
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
};

export type { MeasurePluginSlice };
export { MeasureInfoPanel };
