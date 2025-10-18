import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { getToolMetadata } from '../toolMetadata';
import { createSubpathPluginSlice } from './slice';
import type { SubpathPluginSlice } from './slice';
import { SubPathOperationsPanel } from './SubPathOperationsPanel';

const subpathSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => ({
  state: createSubpathPluginSlice(set, get, api),
});

export const subpathPlugin: PluginDefinition<CanvasStore> = {
  id: 'subpath',
  metadata: getToolMetadata('subpath'),
  handler: (event, point, target, _isSmoothBrushActive, beginSelectionRectangle) => {
    if (target.tagName === 'svg') {
      beginSelectionRectangle(point, false, !event.shiftKey);
    }
  },
  keyboardShortcuts: {
    Delete: () => {
      // Reserved for subpath deletion behaviour
    },
  },
  slices: [subpathSliceFactory],
};

export type { SubpathPluginSlice };
export { SubPathOperationsPanel };
export { SubpathOverlay } from './SubpathOverlay';
