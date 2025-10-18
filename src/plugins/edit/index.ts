import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { getToolMetadata } from '../toolMetadata';
import { createEditPluginSlice } from './slice';
import type { EditPluginSlice } from './slice';
import { EditPanel } from './EditPanel';
import { ControlPointAlignmentPanel } from './ControlPointAlignmentPanel';
import { PathOperationsPanel } from './PathOperationsPanel';

const editSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => ({
  state: createEditPluginSlice(set, get, api),
});

export const editPlugin: PluginDefinition<CanvasStore> = {
  id: 'edit',
  metadata: getToolMetadata('edit'),
  handler: (event, point, target, isSmoothBrushActive, beginSelectionRectangle) => {
    if (target.tagName === 'svg' && !isSmoothBrushActive) {
      beginSelectionRectangle(point, !event.shiftKey, false);
    }
  },
  keyboardShortcuts: {
    Delete: () => {
      // Reserved for edit tool deletion behaviour
    },
  },
  slices: [editSliceFactory],
};

export type { EditPluginSlice };
export { EditPanel, ControlPointAlignmentPanel, PathOperationsPanel };
export { EditPointsOverlay } from './EditPointsOverlay';
