import type { PluginDefinition } from '../types/plugins';
import type { CanvasStore } from '../store/canvasStore';
import { useCanvasStore } from '../store/canvasStore';
import { getToolMetadata } from './toolMetadata';

import { pencilPlugin } from './pencil';
import { textPlugin } from './text';
import { shapePlugin } from './shape';
import { transformationPlugin } from './transformation';
import { editPlugin } from './edit';
import { subpathPlugin } from './subpath';
import { curvesPlugin } from './curves';
import { opticalAlignmentPlugin } from './opticalAlignment';
import { guidelinesPlugin } from './guidelines';
import { gridPlugin } from './grid';


const selectPlugin: PluginDefinition<CanvasStore> = {
  id: 'select',
  metadata: getToolMetadata('select'),
  handler: (event, point, target, _isSmoothBrushActive, beginSelectionRectangle) => {
    if (target.tagName === 'svg') {
      if (!event.shiftKey) {
        useCanvasStore.getState().clearSelection();
      }
      beginSelectionRectangle(point);
    }
  },
  keyboardShortcuts: {
    Delete: () => {
      useCanvasStore.getState().deleteSelectedElements();
    },
    a: (event) => {
      if (event.ctrlKey || event.metaKey) {
        // Reserved for select all behaviour
      }
    },
  },
};

const panPlugin: PluginDefinition<CanvasStore> = {
  id: 'pan',
  metadata: getToolMetadata('pan'),
  handler: () => {
    // Pan tool relies on pointer event listeners elsewhere
  },
};

export const CORE_PLUGINS: PluginDefinition<CanvasStore>[] = [
  selectPlugin,
  panPlugin,
  pencilPlugin,
  textPlugin,
  shapePlugin,
  editPlugin,
  subpathPlugin,
  transformationPlugin,
  curvesPlugin,
  opticalAlignmentPlugin,
  guidelinesPlugin,
  gridPlugin,
];

export * from './pencil';
export * from './text';
export * from './shape';
export * from './transformation';
export * from './edit';
export * from './subpath';
export * from './curves';
export * from './opticalAlignment';
export * from './guidelines';
export * from './grid';
