import React from 'react';
import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
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

// eslint-disable-next-line react-refresh/only-export-components
export const measurePlugin: PluginDefinition<CanvasStore> = {
  id: 'measure',
  metadata: getToolMetadata('measure'),
  handler: (_event, point, _target, context) => {
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
    api.startMeasurement(finalPoint, snapInfo);

    // Set up pointer move and up handlers
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
            getElementBoundsFn,
            currentState.measure.snapThreshold,
            currentState.viewport.zoom
          )
        : null;

      const finalMovePoint = moveSnapInfo?.point ?? canvasPoint;
      api.updateMeasurement(finalMovePoint, moveSnapInfo);
    };

    const handlePointerUp = () => {
      api.finalizeMeasurement();
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
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

        if (!measurement?.isActive) {
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
