import { useEffect } from 'react';
import type { RefObject } from 'react';
import { pluginManager } from '../utils/pluginManager';
import { useCanvasController } from '../canvas/controller/CanvasControllerContext';
import { useCanvasEventBus } from '../canvas/CanvasEventBusContext';
import { canvasStoreApi } from '../store/canvasStore';
import { ZOOM_SERVICE_ID } from '../canvas/listeners/ZoomListener';

export const useCanvasZoom = (svgRef: RefObject<SVGSVGElement | null>): void => {
  const controller = useCanvasController();
  const eventBus = useCanvasEventBus();

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !eventBus) {
      return;
    }

    return pluginManager.activateCanvasService(ZOOM_SERVICE_ID, {
      svg,
      controller,
      eventBus,
      store: canvasStoreApi,
    });
  }, [controller, eventBus, svgRef]);
};
