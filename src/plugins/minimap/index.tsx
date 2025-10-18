import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';

export const minimapPlugin: PluginDefinition<CanvasStore> = {
  id: 'minimap',
  metadata: {
    label: 'Minimap',
    cursor: 'default',
  },
};
