import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createGuidelinesPluginSlice } from './slice';
import type { GuidelinesPluginSlice } from './slice';
import { GuidelinesPanel } from './GuidelinesPanel';
import { GuidelinesOverlay } from './GuidelinesOverlay';

const guidelinesSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slice = createGuidelinesPluginSlice(set as any, get as any, api as any);
  return {
    state: slice,
  };
};

export const guidelinesPlugin: PluginDefinition<CanvasStore> = {
  id: 'guidelines',
  metadata: {
    label: 'Guidelines',
    cursor: 'default',
  },
  canvasLayers: [
    {
      id: 'guidelines-overlay',
      placement: 'foreground',
      render: ({
        activePlugin,
        guidelines,
        isDragging,
        editingPoint,
        draggingSelection,
        elements,
        selectedIds,
        viewport,
      }) => {
        if (activePlugin !== 'select' || !guidelines) {
          return null;
        }

        if (!isDragging && !editingPoint?.isDragging && !draggingSelection?.isDragging) {
          return null;
        }

        return (
          <GuidelinesOverlay
            guidelines={guidelines}
            viewport={viewport}
            elements={elements}
            selectedIds={selectedIds}
          />
        );
      },
    },
  ],
  slices: [guidelinesSliceFactory],
  sidebarPanels: [
    {
      key: 'guidelines',
      condition: (ctx) => ctx.showSettingsPanel,
      component: GuidelinesPanel,
    },
  ],
};

export type { GuidelinesPluginSlice };
export { GuidelinesPanel };
