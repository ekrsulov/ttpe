import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasDecorator, CanvasDecoratorContext } from '../../types/interaction';
import type { CanvasStore } from '../../store/canvasStore';
import { createGridPluginSlice } from './slice';
import type { GridPluginSlice } from './slice';
import GridPanelComponent from './GridPanel';
import { GridOverlay } from './GridOverlay';
import { createGridSnapModifier } from './snapModifier';
import { pluginManager } from '../../utils/pluginManager';
import { Rulers, RULER_SIZE } from '../../ui/Rulers';

const gridSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slice = createGridPluginSlice(set as any, get as any, api as any);
  return {
    state: slice,
  };
};

/**
 * Creates the grid rulers decorator.
 * Shows rulers when grid is enabled and showRulers is true,
 * but yields to guidelines rulers when they are active.
 */
const createGridRulersDecorator = (): CanvasDecorator => ({
  id: 'grid-rulers',
  placement: 'before-canvas',
  isVisible: (store: CanvasStore) => {
    const grid = store.grid;
    const guidelines = store.guidelines;
    // Don't show if guidelines rulers are active (they take precedence)
    if (guidelines?.enabled && guidelines?.manualGuidesEnabled) return false;
    return grid?.enabled && grid?.showRulers || false;
  },
  getOffset: () => ({
    top: RULER_SIZE,
    left: RULER_SIZE,
    width: RULER_SIZE,
    height: RULER_SIZE,
  }),
  render: ({ viewport, canvasSize }: CanvasDecoratorContext) => {
    return (
      <Rulers
        width={canvasSize.width}
        height={canvasSize.height}
        viewport={viewport}
        interactive={false}
      />
    );
  },
});

export const gridPlugin: PluginDefinition<CanvasStore> = {
  id: 'grid',
  metadata: {
    label: 'Grid',
    cursor: 'default',
  },
  canvasLayers: [
    {
      id: 'grid-overlay',
      placement: 'background',
      render: ({ grid, viewport, canvasSize }) => {
        return (
          <GridOverlay 
            grid={grid ?? { enabled: false, type: 'square', spacing: 20, showRulers: false }} 
            viewport={viewport} 
            canvasSize={canvasSize}
          />
        );
      },
    },
  ],
  slices: [gridSliceFactory],
  init: (context) => {
    // Register the drag modifier for grid snapping
    const unregisterDragModifier = pluginManager.registerDragModifier(
      createGridSnapModifier(context)
    );
    
    // Register the canvas decorator for rulers
    const unregisterDecorator = pluginManager.registerCanvasDecorator(
      createGridRulersDecorator()
    );
    
    // Return cleanup function
    return () => {
      unregisterDragModifier();
      unregisterDecorator();
    };
  },
  sidebarPanels: [
    {
      key: 'grid',
      condition: (ctx) => ctx.showSettingsPanel,
      component: GridPanelComponent,
    },
  ],
};

export type { GridPluginSlice };
export { GridPanelComponent as GridPanel };
export { GridOverlay } from './GridOverlay';
