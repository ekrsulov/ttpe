import { pluginManager } from '../../utils/pluginManager';
import type {
  CanvasService,
  CanvasServiceContext,
  CanvasServiceInstance,
} from '../../utils/pluginManager';

export const ZOOM_SERVICE_ID = 'canvas-zoom-listener';

class ZoomListenerService implements CanvasService {
  readonly id = ZOOM_SERVICE_ID;

  create({ svg, eventBus, store, controller }: CanvasServiceContext): CanvasServiceInstance {
    const wheelHandler = (event: WheelEvent) => {
      event.preventDefault();

      const activePlugin = store.getState().activePlugin;

      eventBus.emit('wheel', {
        event,
        activePlugin,
        svg,
      });

      const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
      const rect = svg.getBoundingClientRect();

      if (!rect) {
        return;
      }

      const centerX = event.clientX - rect.left;
      const centerY = event.clientY - rect.top;
      controller.zoom(zoomFactor, centerX, centerY);
    };

    svg.addEventListener('wheel', wheelHandler, { passive: false });

    return {
      dispose: () => {
        svg.removeEventListener('wheel', wheelHandler);
      },
    };
  }
}

pluginManager.registerCanvasService(new ZoomListenerService());
