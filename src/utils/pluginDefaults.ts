import type { PluginDefinition } from '../types/plugins';
import type { CanvasStore } from '../store/canvasStore';
import { useCanvasStore } from '../store/canvasStore';
import type { ToolMode } from '../config/toolDefinitions';
import { TOOL_DEFINITIONS } from '../config/toolDefinitions';

const TOOL_DEFINITION_MAP = new Map(
  TOOL_DEFINITIONS.map((definition) => [definition.mode, definition])
);

const getToolMetadata = (mode: ToolMode) => {
  const toolDefinition = TOOL_DEFINITION_MAP.get(mode);
  return {
    label: toolDefinition?.label ?? mode,
    icon: toolDefinition?.icon,
    cursor: toolDefinition?.cursor ?? 'default',
  };
};

export const DEFAULT_PLUGIN_DEFINITIONS: PluginDefinition<CanvasStore>[] = [
  {
    id: 'pencil',
    metadata: getToolMetadata('pencil'),
    handler: (_event, point) => {
      useCanvasStore.getState().startPath(point);
    },
    keyboardShortcuts: {
      Delete: () => {
        useCanvasStore.getState().deleteSelectedElements();
      },
    },
  },
  {
    id: 'text',
    metadata: getToolMetadata('text'),
    handler: (_event, point) => {
      const state = useCanvasStore.getState();
      void state.addText(point.x, point.y, state.text.text);
    },
    keyboardShortcuts: {
      Enter: () => {
        // Reserved for text tool specific keyboard interaction
      },
    },
  },
  {
    id: 'shape',
    metadata: getToolMetadata('shape'),
    handler: (_event, point, _target, _isSmoothBrushActive, _beginSelectionRectangle, startShapeCreation) => {
      startShapeCreation(point);
    },
    keyboardShortcuts: {
      Escape: () => {
        // Reserved for cancelling shape creation
      },
    },
  },
  {
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
  },
  {
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
  },
  {
    id: 'subpath',
    metadata: getToolMetadata('subpath'),
    handler: (event, point, target, _isSmoothBrushActive, beginSelectionRectangle) => {
      if (target.tagName === 'svg') {
        beginSelectionRectangle(point, false, !event.shiftKey);
      }
    },
    keyboardShortcuts: {
      Delete: () => {
        // Reserved for subpath deletion behaviour
      },
    },
  },
  {
    id: 'pan',
    metadata: getToolMetadata('pan'),
    handler: () => {
      // Pan tool relies on pointer event listeners elsewhere
    },
  },
  {
    id: 'transformation',
    metadata: getToolMetadata('transformation'),
    handler: () => {
      // Transformation tool relies on pointer event listeners elsewhere
    },
  },
];
