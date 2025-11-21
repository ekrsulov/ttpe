import React from 'react';
import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createObjectSnapPluginSlice } from './slice';
import type { ObjectSnapPluginSlice } from './slice';
import { ObjectSnapOverlay } from './ObjectSnapOverlay';
import { ObjectSnapPanel } from './ObjectSnapPanel';
import { FeedbackOverlay } from '../../overlays/FeedbackOverlay';
import { getSnapPointLabel } from '../../utils/snapPointUtils';
import { createSnapModifier } from './snapModifier';
import { pluginManager } from '../../utils/pluginManager';
import { useCanvasStore } from '../../store/canvasStore';

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
      render: (context) => {
        const SnapOverlayWrapper = () => {
          const objectSnap = useCanvasStore(state => (state as CanvasStore & ObjectSnapPluginSlice).objectSnap);
          const { activePlugin, editingPoint, draggingSelection, viewport } = context;

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
        };

        return <SnapOverlayWrapper />;
      },
    },
    {
      id: 'object-snap-feedback',
      placement: 'foreground',
      render: (context) => {
        const SnapFeedbackWrapper = () => {
          const objectSnap = useCanvasStore(state => (state as CanvasStore & ObjectSnapPluginSlice).objectSnap);
          const { activePlugin, viewport, canvasSize, editingPoint, draggingSelection } = context as any; // eslint-disable-line @typescript-eslint/no-explicit-any

          if (activePlugin !== 'edit' || !objectSnap?.enabled) {
            return null;
          }

          const isDragging = editingPoint?.isDragging || draggingSelection?.isDragging;
          if (!isDragging || !objectSnap.currentSnapPoint) {
            return null;
          }

          const snapMessage = getSnapPointLabel(objectSnap.currentSnapPoint.type);

          return React.createElement(FeedbackOverlay, {
            viewport,
            canvasSize,
            customFeedback: { message: snapMessage, visible: true },
            offsetY: -26, // Subir 26px para no interferir con coordenadas del modo edit
          });
        };

        return <SnapFeedbackWrapper />;
      },
    },
  ],
  slices: [objectSnapSliceFactory],
  init: (context) => {
    const modifier = createSnapModifier(context);
    return pluginManager.registerDragModifier(modifier);
  },
  relatedPluginPanels: [
    {
      id: 'objectSnap-edit-panel',
      targetPlugin: 'edit',
      component: ObjectSnapPanel,
      order: 99, // Place at the end
    },
  ],
};

export type { ObjectSnapPluginSlice };