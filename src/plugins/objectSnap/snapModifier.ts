import type { DragModifier } from '../../types/interaction';
import type { PluginHandlerContext } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import type { ObjectSnapPluginSlice } from './slice';

export const createSnapModifier = (context: PluginHandlerContext<CanvasStore>): DragModifier => {
    return {
        id: 'objectSnap',
        priority: 100, // High priority to run last (after other modifications)
        modify: (point, dragContext) => {
            const store = context.store.getState() as CanvasStore & ObjectSnapPluginSlice;

            if (store.applyObjectSnap) {
                return store.applyObjectSnap(point, dragContext.excludeElementIds || []);
            }

            return point;
        }
    };
};
