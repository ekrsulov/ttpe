import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { pluginManager } from '../../utils/pluginManager';
import { createOpticalAlignmentSlice } from './slice';
import type { OpticalAlignmentSlice } from './slice';
import { OpticalAlignmentPanel } from './OpticalAlignmentPanel';
import { Target } from 'lucide-react';

const opticalAlignmentSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slice = createOpticalAlignmentSlice(set as any, get as any, api as any);
  return {
    state: slice,
  };
};

export const opticalAlignmentPlugin: PluginDefinition<CanvasStore> = {
  id: 'opticalAlignment',
  metadata: {
    label: 'Optical Alignment',
    cursor: 'default',
  },
  init: (_context) => {
    return () => { };
  },
  contextMenuActions: [
    {
      id: 'apply-visual-center',
      action: (context) => {
        if (context.type !== 'multiselection') return null;

        // Original logic:
        // const canAlign = canPerformOpticalAlignment?.() ?? false;
        // if (!canAlign) return null;

        // We need to check if we can perform optical alignment.
        // This logic was in the store slice.
        // We can access it via the store API.

        const store = pluginManager.requireStoreApi();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const state = store.getState() as any; // Cast to any to access slice methods if needed, or use typed state

        // Assuming the slice adds these methods to the store state
        if (!state.canPerformOpticalAlignment?.()) return null;

        return {
          id: 'apply-visual-center',
          label: 'Apply Visual Center',
          icon: Target,
          onClick: async () => {
            await state.calculateOpticalAlignment?.();
            state.applyOpticalAlignment?.();
          }
        };
      }
    }
  ],
  slices: [opticalAlignmentSliceFactory],
  sidebarPanels: [
    {
      key: 'optical-alignment',
      condition: (ctx) => !ctx.isInSpecialPanelMode && ctx.activePlugin === 'select' && ctx.canPerformOpticalAlignment,
      component: OpticalAlignmentPanel,
    },
  ],
};

export type { OpticalAlignmentSlice };
export { OpticalAlignmentPanel };
