import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createOffsetPathSlice } from './slice';
import type { OffsetPathSlice } from './slice';
import { OffsetPathPanel } from './OffsetPathPanel';

const offsetPathSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slice = createOffsetPathSlice(set as any, get as any, api as any);
  return {
    state: slice,
  };
};

import { CircleDot } from 'lucide-react';
import { pluginManager } from '../../utils/pluginManager';

export const offsetPathPlugin: PluginDefinition<CanvasStore> = {
  id: 'offsetPath',
  metadata: {
    label: 'Offset Path',
    cursor: 'default',
  },
  init: (_context) => {
    return () => { };
  },
  contextMenuActions: [
    {
      id: 'offset-path',
      action: (context) => {
        // Offset path is available in multiselection, group, path, subpath
        const validTypes = ['multiselection', 'group', 'path', 'subpath'];
        if (!validTypes.includes(context.type)) return null;

        const store = pluginManager.requireStoreApi();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const state = store.getState() as any;

        if (!state.canApplyOffset?.()) return null;

        return {
          id: 'offset-path',
          label: 'Offset Path',
          icon: CircleDot,
          onClick: () => {
            state.applyOffsetPath?.();
          }
        };
      }
    }
  ],
  slices: [offsetPathSliceFactory],
  sidebarPanels: [
    {
      key: 'offset-path',
      condition: (ctx) => !ctx.isInSpecialPanelMode && (ctx.activePlugin === 'select' || ctx.activePlugin === 'subpath'),
      component: OffsetPathPanel,
    },
  ],
};

export type { OffsetPathSlice };
export { OffsetPathPanel };
