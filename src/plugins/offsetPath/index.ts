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

export const offsetPathPlugin: PluginDefinition<CanvasStore> = {
  id: 'offsetPath',
  metadata: {
    label: 'Offset Path',
    cursor: 'default',
  },
  slices: [offsetPathSliceFactory],
};

export type { OffsetPathSlice };
export { OffsetPathPanel };
