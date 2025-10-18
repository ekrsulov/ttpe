import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { MinimapOverlay } from './MinimapOverlay';

export const minimapPlugin: PluginDefinition<CanvasStore> = {
  id: 'minimap',
  metadata: {
    label: 'Minimap',
    cursor: 'default',
  },
  canvasLayers: [
    {
      id: 'minimap-overlay',
      placement: 'foreground',
      render: (context) => <MinimapOverlay context={context} />,
    },
  ],
};
