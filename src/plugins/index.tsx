import type { PluginDefinition } from '../types/plugins';
import type { CanvasStore } from '../store/canvasStore';
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
import { minimapPlugin } from './minimap';
import { gridFillPlugin } from './gridFill';
import { SelectionOverlay, BlockingOverlay } from '../components/overlays';


const selectPlugin: PluginDefinition<CanvasStore> = {
  id: 'select',
  metadata: getToolMetadata('select'),
  handler: (
    event,
    point,
    target,
    _isSmoothBrushActive,
    beginSelectionRectangle,
    _startShapeCreation,
    context
  ) => {
    if (target.tagName === 'svg') {
      if (!event.shiftKey) {
        const state = context.store.getState();
        state.clearSelection?.();
      }
      beginSelectionRectangle(point);
    }
  },
  keyboardShortcuts: {
    Delete: (_event, { store }) => {
      const state = store.getState() as CanvasStore;
      state.deleteSelectedElements();
    },
    a: (event) => {
      if (event.ctrlKey || event.metaKey) {
        // Reserved for select all behaviour
      }
    },
  },
  canvasLayers: [
    {
      id: 'selection-overlays',
      placement: 'midground',
      render: ({
        elements,
        selectedIds,
        selectedSubpaths,
        activePlugin,
        viewport,
        isElementHidden,
        getElementBounds,
      }) => {
        if (!selectedIds.length) {
          return null;
        }

        return (
          <>
            {elements
              .filter((element) =>
                element.type === 'path' &&
                selectedIds.includes(element.id) &&
                (!isElementHidden || !isElementHidden(element.id))
              )
              .map((element) => {
                const shouldRender =
                  activePlugin !== 'transformation' ||
                  (selectedSubpaths ?? []).some((subpath) => subpath.elementId === element.id);

                if (!shouldRender) {
                  return null;
                }

                return (
                  <SelectionOverlay
                    key={`selection-${element.id}`}
                    element={element}
                    bounds={getElementBounds(element)}
                    viewport={viewport}
                    selectedSubpaths={selectedSubpaths}
                    activePlugin={activePlugin}
                  />
                );
              })}
          </>
        );
      },
    },
    {
      id: 'group-selection-bounds',
      placement: 'midground',
      render: ({ selectedGroupBounds, viewport }) => {
        if (!selectedGroupBounds.length) {
          return null;
        }

        return (
          <>
            {selectedGroupBounds.map(({ id, bounds }) => (
              <rect
                key={`group-selection-${id}`}
                x={bounds.minX}
                y={bounds.minY}
                width={bounds.maxX - bounds.minX}
                height={bounds.maxY - bounds.minY}
                fill="none"
                stroke="#2563eb"
                strokeWidth={1 / viewport.zoom}
                strokeDasharray={`${6 / viewport.zoom} ${4 / viewport.zoom}`}
                pointerEvents="none"
              />
            ))}
          </>
        );
      },
    },
    {
      id: 'selection-rectangle',
      placement: 'midground',
      render: ({ isSelecting, selectionStart, selectionEnd, viewport }) => {
        if (!isSelecting || !selectionStart || !selectionEnd) {
          return null;
        }

        const x = Math.min(selectionStart.x, selectionEnd.x);
        const y = Math.min(selectionStart.y, selectionEnd.y);
        const width = Math.abs(selectionEnd.x - selectionStart.x);
        const height = Math.abs(selectionEnd.y - selectionStart.y);

        return (
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill="rgba(0, 123, 255, 0.1)"
            stroke="#007bff"
            strokeWidth={1 / viewport.zoom}
            strokeDasharray={`${2 / viewport.zoom} ${2 / viewport.zoom}`}
          />
        );
      },
    },
    {
      id: 'selection-blocking-overlay',
      placement: 'midground',
      render: ({ viewport, canvasSize, isSelecting }) => (
        <BlockingOverlay
          viewport={viewport}
          canvasSize={canvasSize}
          isActive={isSelecting}
        />
      ),
    },
  ],
};

const panPlugin: PluginDefinition<CanvasStore> = {
  id: 'pan',
  metadata: getToolMetadata('pan'),
  handler: (
    _event,
    _point,
    _target,
    _isSmoothBrushActive,
    _beginSelectionRectangle,
    _startShapeCreation,
    _context
  ) => {
    // Pan tool relies on pointer event listeners elsewhere
  },
};

export const CORE_PLUGINS: PluginDefinition<CanvasStore>[] = [
  selectPlugin,
  panPlugin,
  pencilPlugin,
  curvesPlugin,
  textPlugin,
  shapePlugin,
  subpathPlugin,
  transformationPlugin,
  editPlugin,
  gridFillPlugin,
  opticalAlignmentPlugin,
  guidelinesPlugin,
  gridPlugin,
  minimapPlugin,
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
export * from './gridFill';
export * from './minimap';
