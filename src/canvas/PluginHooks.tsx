import React from 'react';
import { useCanvasStore } from '../store/canvasStore';
import type { Point } from '../types';
import type { PluginHooksContext } from '../types/plugins';
import { pluginManager } from '../utils/pluginManager';

interface PluginHooksProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
  screenToCanvas: (x: number, y: number) => Point;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emitPointerEvent: (type: 'pointerdown' | 'pointermove' | 'pointerup', event: any, point: Point) => void;
}

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

/**
 * Global hooks renderer for plugins that need to run regardless of active tool
 * Executes hooks marked with `global: true` in their plugin definition
 */
const GlobalPluginHooksWrapper = ({ hooksContext }: { hooksContext: PluginHooksContext }) => {
  const globalPluginHooks = pluginManager.getGlobalPluginHooks();

  globalPluginHooks.forEach(contribution => {
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
      <GlobalPluginHooksWrapper hooksContext={hooksContext} />
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
