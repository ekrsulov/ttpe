import React from 'react';
import type { CanvasLayerContext } from '../types/plugins';
import { pluginManager } from '../utils/pluginManager';

interface CanvasLayersProps {
  context: CanvasLayerContext;
}

export const CanvasLayers: React.FC<CanvasLayersProps> = ({ context }) => {
  const layers = pluginManager.getCanvasLayers();

  return (
    <>
      {layers.map((layer) => {
        const content = layer.render(context);
        if (!content) {
          return null;
        }

        return (
          <React.Fragment key={`${layer.pluginId}:${layer.id}`}>
            {content}
          </React.Fragment>
        );
      })}
    </>
  );
};
