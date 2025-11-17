import React from 'react';
import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createObjectSnapPluginSlice } from './slice';
import type { ObjectSnapPluginSlice } from './slice';
import { ObjectSnapOverlay } from './ObjectSnapOverlay';
import { FeedbackOverlay } from '../../overlays/FeedbackOverlay';
import { getSnapPointLabel } from '../../utils/snapPointUtils';

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
    {
      id: 'object-snap-feedback',
      placement: 'foreground',
      render: (context) => {
        const { activePlugin, objectSnap, viewport, canvasSize, editingPoint, draggingSelection } = context as any; // eslint-disable-line @typescript-eslint/no-explicit-any
        
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
      },
    },
  ],
  slices: [objectSnapSliceFactory],
};

export type { ObjectSnapPluginSlice };