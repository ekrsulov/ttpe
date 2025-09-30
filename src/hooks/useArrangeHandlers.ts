import { useCanvasStore } from '../store/canvasStore';

/**
 * Hook that provides the appropriate handlers based on the active plugin
 */
export const useArrangeHandlers = () => {
  const store = useCanvasStore();
  const { activePlugin } = store;

  // Create handler maps for different modes
  const createHandlerMap = (suffix: string = '') => ({
    alignLeft: store[`alignLeft${suffix}` as keyof typeof store] as () => void,
    alignCenter: store[`alignCenter${suffix}` as keyof typeof store] as () => void,
    alignRight: store[`alignRight${suffix}` as keyof typeof store] as () => void,
    alignTop: store[`alignTop${suffix}` as keyof typeof store] as () => void,
    alignMiddle: store[`alignMiddle${suffix}` as keyof typeof store] as () => void,
    alignBottom: store[`alignBottom${suffix}` as keyof typeof store] as () => void,
    distributeHorizontally: store[`distributeHorizontally${suffix}` as keyof typeof store] as () => void,
    distributeVertically: store[`distributeVertically${suffix}` as keyof typeof store] as () => void,
  });

  const createOrderHandlerMap = (suffix: string = '') => ({
    bringToFront: store[`bring${suffix}ToFront` as keyof typeof store] as () => void,
    sendForward: store[`send${suffix}Forward` as keyof typeof store] as () => void,
    sendBackward: store[`send${suffix}Backward` as keyof typeof store] as () => void,
    sendToBack: store[`send${suffix}ToBack` as keyof typeof store] as () => void,
  });

  // Handler maps for different modes
  const handlerMaps = {
    select: {
      ...createHandlerMap(),
      ...createOrderHandlerMap()
    },
    edit: {
      ...createHandlerMap('Commands'),
      // No order handlers for edit mode
      bringToFront: () => {},
      sendForward: () => {},
      sendBackward: () => {},
      sendToBack: () => {},
    },
    subpath: {
      ...createHandlerMap('Subpaths'),
      ...createOrderHandlerMap('Subpath')
    }
  };

  return handlerMaps[activePlugin as keyof typeof handlerMaps] || handlerMaps.select;
};