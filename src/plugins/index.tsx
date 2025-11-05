import type { PluginDefinition } from '../types/plugins';
import type { CanvasStore } from '../store/canvasStore';
import type { Point, CanvasElement, Viewport, GroupElement } from '../types';
import type { Bounds } from '../utils/boundsUtils';
import type { ElementMap } from '../canvas/geometry/CanvasGeometryService';
import { getGroupBounds } from '../canvas/geometry/CanvasGeometryService';
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
import { duplicateOnDragPlugin } from './duplicateOnDrag';
import { SelectionOverlay, BlockingOverlay } from '../overlays';
import { useColorMode } from '@chakra-ui/react';

// Component for selection rectangle that can use hooks
const SelectionRectangleComponent: React.FC<{
  isSelecting: boolean;
  selectionStart: Point | null;
  selectionEnd: Point | null;
  viewport: { zoom: number };
}> = ({ isSelecting, selectionStart, selectionEnd, viewport }) => {
  const { colorMode } = useColorMode();

  if (!isSelecting || !selectionStart || !selectionEnd) {
    return null;
  }

  const x = Math.min(selectionStart.x, selectionEnd.x);
  const y = Math.min(selectionStart.y, selectionEnd.y);
  const width = Math.abs(selectionEnd.x - selectionStart.x);
  const height = Math.abs(selectionEnd.y - selectionStart.y);

  // Use gray tones for selection rectangle
  const strokeColor = colorMode === 'dark' ? '#dee2e6' : '#6b7280'; // gray.300 : gray.500
  const fillColor = colorMode === 'dark' ? 'rgba(222, 226, 230, 0.1)' : 'rgba(107, 114, 128, 0.1)';

  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={1 / viewport.zoom}
      strokeDasharray={`${2 / viewport.zoom} ${2 / viewport.zoom}`}
    />
  );
};

// Component for group selection bounds that can use hooks
const GroupSelectionBoundsComponent: React.FC<{
  selectedGroupBounds: Array<{ id: string; bounds: { minX: number; minY: number; maxX: number; maxY: number } }>;
  viewport: { zoom: number };
}> = ({ selectedGroupBounds, viewport }) => {
  const { colorMode } = useColorMode();

  if (!selectedGroupBounds.length) {
    return null;
  }

  // Use theme-adaptive color for group selection (same as selection rectangle)
  const strokeColor = colorMode === 'dark' ? '#22d3ee' : '#0ea5e9';
  const fillColor = colorMode === 'dark' ? '#cccccc10' : '#cccccc30';
  const padding = 8 / viewport.zoom; // Greater than the 5px used for selected elements

  return (
    <>
      {selectedGroupBounds.map(({ id, bounds }) => (
        <rect
          key={`group-selection-${id}`}
          x={bounds.minX - padding}
          y={bounds.minY - padding}
          width={bounds.maxX - bounds.minX + 2 * padding}
          height={bounds.maxY - bounds.minY + 2 * padding}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={1 / viewport.zoom}
          pointerEvents="none"
        />
      ))}
    </>
  );
};

// Component for selection bbox from top-left to bottom-right element
const SelectionBboxComponent: React.FC<{
  selectedIds: string[];
  getElementBounds: (element: CanvasElement) => Bounds | null;
  elementMap: ElementMap;
  viewport: Viewport;
}> = ({ selectedIds, getElementBounds, elementMap, viewport }) => {
  const { colorMode } = useColorMode();

  if (selectedIds.length <= 1) {
    return null;
  }

  // Separate selected elements and groups
  const selectedElements: CanvasElement[] = [];
  const selectedGroups: GroupElement[] = [];

  selectedIds.forEach(id => {
    const item = elementMap.get(id);
    if (item) {
      if (item.type === 'group') {
        selectedGroups.push(item as GroupElement);
      } else {
        selectedElements.push(item);
      }
    }
  });

  // Create pairs of representative elements (element/group or its parent group) and their bounds
  const representativeBoundsPairs: { representative: CanvasElement; bounds: Bounds }[] = [];

  // Handle directly selected groups
  selectedGroups.forEach(group => {
    const groupBounds = getGroupBounds(group, elementMap, viewport);
    if (groupBounds) {
      representativeBoundsPairs.push({ representative: group, bounds: groupBounds });
    }
  });

  // Handle selected elements (considering their parent groups)
  selectedElements.forEach(element => {
    // If element belongs to a group, use the group's bounds instead
    if (element.parentId) {
      const parentGroup = elementMap.get(element.parentId);
      if (parentGroup && parentGroup.type === 'group') {
        const groupBounds = getGroupBounds(parentGroup as GroupElement, elementMap, viewport);
        if (groupBounds) {
          representativeBoundsPairs.push({ representative: parentGroup, bounds: groupBounds });
        }
        return; // Skip adding the individual element
      }
    }
    
    // Otherwise use the element itself
    const bounds = getElementBounds(element);
    if (bounds) {
      representativeBoundsPairs.push({ representative: element, bounds });
    }
  });

  if (representativeBoundsPairs.length < 2) {
    return null;
  }

  // Find representatives defining the four extremes
  let leftRep = representativeBoundsPairs[0];
  let topRep = representativeBoundsPairs[0];
  let rightRep = representativeBoundsPairs[0];
  let bottomRep = representativeBoundsPairs[0];

  for (const pair of representativeBoundsPairs) {
    if (pair.bounds.minX < leftRep.bounds.minX) {
      leftRep = pair;
    }
    if (pair.bounds.minY < topRep.bounds.minY) {
      topRep = pair;
    }
    if (pair.bounds.maxX > rightRep.bounds.maxX) {
      rightRep = pair;
    }
    if (pair.bounds.maxY > bottomRep.bounds.maxY) {
      bottomRep = pair;
    }
  }

  // Only draw if not all four extremes are defined by the same representative
  const extremeRepresentatives = new Set([leftRep.representative.id, topRep.representative.id, rightRep.representative.id, bottomRep.representative.id]);
  if (extremeRepresentatives.size === 1) {
    return null;
  }

  // Use theme-adaptive color, similar to group selection but different
  const strokeColor = colorMode === 'dark' ? '#f59e0b' : '#d97706'; // amber
  const fillColor = colorMode === 'dark' ? '#f59e0b10' : '#f59e0b20';
  const padding = 10 / viewport.zoom; // Greater than the 8px used for groups

  const x = leftRep.bounds.minX - padding;
  const y = topRep.bounds.minY - padding;
  const width = rightRep.bounds.maxX - leftRep.bounds.minX + 2 * padding;
  const height = bottomRep.bounds.maxY - topRep.bounds.minY + 2 * padding;

  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={1 / viewport.zoom}
      pointerEvents="none"
    />
  );
};


const selectPlugin: PluginDefinition<CanvasStore> = {
  id: 'select',
  metadata: getToolMetadata('select'),
  handler: (
    event,
    point,
    target,
    context
  ) => {
    if (target.tagName === 'svg') {
      if (!event.shiftKey) {
        const state = context.store.getState();
        state.clearSelection?.();
      }
      context.helpers.beginSelectionRectangle?.(point);
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
      render: ({ selectedGroupBounds, viewport }) => (
        <GroupSelectionBoundsComponent
          selectedGroupBounds={selectedGroupBounds}
          viewport={viewport}
        />
      ),
    },
    {
      id: 'selection-bbox',
      placement: 'midground',
      render: ({ selectedIds, getElementBounds, elementMap, viewport }) => (
        <SelectionBboxComponent
          selectedIds={selectedIds}
          getElementBounds={getElementBounds}
          elementMap={elementMap}
          viewport={viewport}
        />
      ),
    },
    {
      id: 'selection-rectangle',
      placement: 'midground',
      render: (props) => <SelectionRectangleComponent {...props} />,
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
  duplicateOnDragPlugin,
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
export * from './duplicateOnDrag';
