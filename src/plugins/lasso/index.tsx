import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { Lasso } from 'lucide-react';
import { createLassoPluginSlice } from './slice';
import { LassoPanel } from './LassoPanel';
import { LassoOverlayWrapper } from './LassoOverlayWrapper';
import { LassoSelectionStrategy } from './LassoSelectionStrategy';
import { selectionStrategyRegistry } from '../../canvas/selection/SelectionStrategy';

const lassoSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slice = createLassoPluginSlice(set as any, get as any, api as any);
  return {
    state: slice,
  };
};

export const lassoPlugin: PluginDefinition<CanvasStore> = {
  id: 'lasso',
  metadata: {
    label: 'Lasso',
    icon: Lasso,
  },
  init: () => {
    // Register lasso selection strategy
    selectionStrategyRegistry.register(new LassoSelectionStrategy());
    
    // Return cleanup function
    return () => {
      selectionStrategyRegistry.unregister('lasso');
    };
  },
  slices: [lassoSliceFactory],
  sidebarPanels: [
    {
      key: 'lasso-panel',
      condition: (ctx) => {
        // Show panel in select, edit, and subpath modes
        return ctx.activePlugin === 'select' || 
               ctx.activePlugin === 'edit' || 
               ctx.activePlugin === 'subpath';
      },
      component: LassoPanel,
      getProps: (allProps) => ({
        activePlugin: allProps.activePlugin,
      }),
    },
  ],
  canvasLayers: [
    {
      id: 'lasso-overlay',
      placement: 'midground',
      render: () => <LassoOverlayWrapper />,
    },
  ],
};

