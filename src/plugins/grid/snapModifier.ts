import type { DragModifier } from '../../types/interaction';
import type { PluginHandlerContext } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import type { GridPluginSlice } from './slice';

export const createGridSnapModifier = (context: PluginHandlerContext<CanvasStore>): DragModifier => {
    return {
        id: 'gridSnap',
        priority: 50, // Run before object snap (100)
        modify: (point, _dragContext) => {
            const store = context.store.getState() as CanvasStore & GridPluginSlice;

            if (store.grid?.snapEnabled && store.snapToGrid) {
                return store.snapToGrid(point.x, point.y);
            }

            return point;
        }
    };
};
