import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createDuplicateOnDragPluginSlice } from './slice';
import type { DuplicateOnDragPluginSlice } from './slice';
import { pluginManager } from '../../utils/pluginManager';
import { duplicateOnDragService } from './service';

const duplicateOnDragSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slice = createDuplicateOnDragPluginSlice(set as any, get as any, api as any);
  return {
    state: slice,
  };
};

export const duplicateOnDragPlugin: PluginDefinition<CanvasStore> = {
  id: 'duplicate-on-drag',
  metadata: {
    label: 'Duplicate on Drag',
    cursor: 'default',
  },
  // This plugin doesn't have a handler because it works via Canvas Service
  // It listens to events globally, not as an active tool
  slices: [duplicateOnDragSliceFactory],
  init: () => {
    pluginManager.registerCanvasService(duplicateOnDragService);
    return () => {
      pluginManager.unregisterCanvasService(duplicateOnDragService.id);
    };
  },
};

export type { DuplicateOnDragPluginSlice };
export { duplicateOnDragService, DUPLICATE_ON_DRAG_SERVICE_ID } from './service';
