import { Scissors } from 'lucide-react';
import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createTrimPathPluginSlice, type TrimPathPluginSlice } from './slice';
import { TrimPathOverlayConnected } from './TrimPathOverlay';
import { TrimPathPanel } from './TrimPathPanel';
import { findSegmentAtPoint } from '../../utils/trimPathGeometry';

/**
 * Trim Path Plugin Definition.
 * 
 * Allows users to trim path segments at intersection points.
 * MVP features:
 * - Select 2-5 paths with intersections
 * - Click to trim individual segments
 * - Visual feedback for intersections and trimmable segments
 * - Undo/redo support
 */
// Slice factory for Trim Path
const trimPathSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slice = createTrimPathPluginSlice(set as any, get as any, api as any);
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    state: slice as any,
  };
};

export const trimPathPlugin: PluginDefinition<CanvasStore> = {
  id: 'trimPath',
  metadata: {
    label: 'Trim Path',
    icon: Scissors,
    cursor: 'crosshair',
  },
  handler: (event, point, _target, context) => {
    const store = context.store;
    const state = store.getState() as CanvasStore & TrimPathPluginSlice;
    const trimPath = state.trimPath;
    const activePlugin = state.activePlugin;

    // Auto-deactivate if plugin changed
    if (activePlugin !== 'trimPath' && trimPath?.isActive) {
       
      state.deactivateTrimTool?.();
      return;
    }

    // Ensure tool initialized on first interaction
    if (!trimPath?.isActive) {
       
      state.activateTrimTool?.();
    }

    if (!trimPath?.splitResult) {
       
      return;
    }

    if (event.type === 'pointerdown') {
      // Check if clicking on a trimmable segment to start drag
      const segment = findSegmentAtPoint(
        trimPath.splitResult.segments,
        point,
        5
      );

      if (segment) {
         
        state.startTrimDrag?.(point);
      }
    } else if (event.type === 'pointermove') {
      if (trimPath.isDragging) {
         
        state.updateTrimDrag?.(point);
      } else {
        const segment = findSegmentAtPoint(
          trimPath.splitResult.segments,
          point,
          5
        );
         
        state.setHoveredSegment?.(segment?.id || null);
      }
    } else if (event.type === 'pointerup') {
      if (trimPath.isDragging) {
         
        state.finishTrimDrag?.();
      } else {
        const segment = findSegmentAtPoint(
          trimPath.splitResult.segments,
          point,
          5
        );
        if (segment) {
           
          state.trimSegment?.(segment.id);
        }
      }
    }
  },
  keyboardShortcuts: {
    Escape: (_event, context) => {
      const store = context.store;
      const state = store.getState() as CanvasStore & TrimPathPluginSlice;

      if (state.trimPath?.isDragging) {
        state.cancelTrimDrag?.();
      } else if (state.trimPath?.isActive) {
        state.deactivateTrimTool?.();
      }
    },
    t: {
      handler: (_event, context) => {
        const store = context.store;
        const state = store.getState() as CanvasStore & TrimPathPluginSlice;
        if (state.trimPath?.isActive) {
          state.deactivateTrimTool?.();
        } else {
          state.activateTrimTool?.();
        }
      },
      options: { preventDefault: true },
    },
  },
  canvasLayers: [
    {
      id: 'trim-path-overlay',
      placement: 'foreground',
      render: () => <TrimPathOverlayConnected />,
    },
  ],
  panels: [
    {
      id: 'trim-path-panel',
      component: TrimPathPanel,
    },
  ],
  slices: [trimPathSliceFactory],
};


