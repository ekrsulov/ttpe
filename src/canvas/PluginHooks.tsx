import React from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { useEditSmoothBrush } from './hooks/useEditSmoothBrush';
import { useDuplicateOnDrag } from './hooks/useDuplicateOnDrag';
import { useEditAddPoint } from './hooks/useEditAddPoint';
import type { Point } from '../types';
import type { PluginHooksContext } from '../types/plugins';
import { pluginManager } from '../utils/pluginManager';

interface PluginHooksProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
  screenToCanvas: (x: number, y: number) => Point;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emitPointerEvent: (type: 'pointerdown' | 'pointermove' | 'pointerup', event: any, point: Point) => void;
}

const EditHooks = ({ svgRef, screenToCanvas, emitPointerEvent }: PluginHooksProps) => {
  const currentMode = useCanvasStore(state => state.activePlugin);
  const isSmoothBrushActive = useCanvasStore(state => state.smoothBrush?.isActive ?? false);

  useEditSmoothBrush({
    svgRef,
    currentMode: currentMode || 'select',
    screenToCanvas,
    emitPointerEvent,
    isSmoothBrushActive,
  });

  const addPointMode = useCanvasStore(state => state.addPointMode);
  const zoom = useCanvasStore(state => state.viewport.zoom);

  useEditAddPoint({
    svgRef,
    activePlugin: currentMode,
    isAddPointModeActive: addPointMode?.isActive ?? false,
    zoom,
    screenToCanvas,
    emitPointerEvent,
  });

  return null;
};

const DuplicateOnDragHooks = ({ svgRef, screenToCanvas }: Omit<PluginHooksProps, 'emitPointerEvent'>) => {
  const currentMode = useCanvasStore(state => state.activePlugin);

  useDuplicateOnDrag({
    svgRef,
    currentMode: currentMode || 'select',
    screenToCanvas,
  });

  return null;
};

/**
 * Dynamic hook renderer for plugins
 * Creates a component wrapper for each plugin's hooks to avoid React hooks rules violations
 */
const PluginHooksWrapper = ({ pluginId, hooksContext }: { pluginId: string; hooksContext: PluginHooksContext }) => {
  const pluginHooks = pluginManager.getPluginHooks(pluginId);

  // Call all hooks registered by this plugin
  // This is safe because it's inside a component that renders conditionally
  pluginHooks.forEach(contribution => {
    contribution.hook(hooksContext);
  });

  return null;
};

export const PluginHooksRenderer = ({ svgRef, screenToCanvas, emitPointerEvent }: PluginHooksProps) => {
  const activePlugin = useCanvasStore(state => state.activePlugin);
  const viewportZoom = useCanvasStore(state => state.viewport.zoom);
  const scaleStrokeWithZoom = useCanvasStore(state => state.settings.scaleStrokeWithZoom);

  // Create context object to pass to hooks
  const hooksContext: PluginHooksContext = {
    svgRef,
    screenToCanvas,
    emitPointerEvent,
    activePlugin,
    viewportZoom,
    scaleStrokeWithZoom,
  };

  return (
    <>
      <DuplicateOnDragHooks svgRef={svgRef} screenToCanvas={screenToCanvas} />
      {activePlugin === 'edit' && (
        <EditHooks
          svgRef={svgRef}
          screenToCanvas={screenToCanvas}
          emitPointerEvent={emitPointerEvent}
        />
      )}
      {activePlugin && (
        <PluginHooksWrapper
          key={activePlugin}
          pluginId={activePlugin}
          hooksContext={hooksContext}
        />
      )}
    </>
  );
};
