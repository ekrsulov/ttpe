import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { MinimapPanel } from './MinimapPanel';

export const minimapPlugin: PluginDefinition<CanvasStore> = {
  id: 'minimap',
  metadata: {
    label: 'Minimap',
    cursor: 'default',
  },
  overlays: [
    {
      id: 'minimap-panel',
      placement: 'global',
      component: MinimapPanel,
    },
  ],
};
