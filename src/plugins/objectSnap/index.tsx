import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createObjectSnapPluginSlice } from './slice';
import type { ObjectSnapPluginSlice } from './slice';
import { ObjectSnapPanel } from './ObjectSnapPanel';
import { ObjectSnapOverlay } from './ObjectSnapOverlay';

const objectSnapSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slice = createObjectSnapPluginSlice(set as any, get as any, api as any);
  return {
    state: slice,
  };
};

export const objectSnapPlugin: PluginDefinition<CanvasStore> = {
  id: 'objectSnap',
  metadata: {
    label: 'Object Snap',
    cursor: 'default',
  },
  canvasLayers: [
    {
      id: 'object-snap-overlay',
      placement: 'foreground',
      render: ({
        activePlugin,
        objectSnap,
        editingPoint,
        draggingSelection,
        viewport,
      }) => {
        if (activePlugin !== 'edit' || !objectSnap) {
          return null;
        }

        if (!editingPoint?.isDragging && !draggingSelection?.isDragging) {
          return null;
        }

        return (
          <ObjectSnapOverlay
            objectSnap={objectSnap}
            viewport={viewport}
            activePlugin={activePlugin}
            editingPoint={editingPoint ?? null}
            draggingSelection={draggingSelection ?? null}
          />
        );
      },
    },
  ],
  slices: [objectSnapSliceFactory],
};

export type { ObjectSnapPluginSlice };
export { ObjectSnapPanel };
