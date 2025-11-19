import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { getToolMetadata } from '../toolMetadata';
import { createSubpathPluginSlice } from './slice';
import type { SubpathPluginSlice } from './slice';
import { SubPathOperationsPanel } from './SubPathOperationsPanel';
import { EditorPanel } from '../../sidebar/panels/EditorPanel';
import { SubpathOverlay } from './SubpathOverlay';
import type { PathData } from '../../types';
import { performPathSimplify, performSubPathReverse, performSubPathJoin } from './actions';
import { calculateSubpathsBounds } from '../../utils/selectionBoundsUtils';

const subpathSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slice = createSubpathPluginSlice(set as any, get as any, api as any);
  return {
    state: slice,
  };
};

export const subpathPlugin: PluginDefinition<CanvasStore> = {
  id: 'subpath',
  metadata: {
    ...getToolMetadata('subpath'),
    disablePathInteraction: true,
  },
  onSubpathDoubleClick: (elementId, subpathIndex, _event, context) => {
    const state = context.store.getState();
    const wasAlreadySelected = (state.selectedSubpaths?.length ?? 0) === 1 &&
      state.selectedSubpaths?.[0].elementId === elementId &&
      state.selectedSubpaths?.[0].subpathIndex === subpathIndex;

    if (wasAlreadySelected) {
      state.setActivePlugin('transformation');
    }
  },
  onCanvasDoubleClick: (_event, context) => {
    context.store.getState().setActivePlugin('select');
  },
  subscribedEvents: ['pointerdown', 'pointerup'],
  handler: (event, point, target, context) => {
    const state = context.store.getState();
    const { pointerState } = context;

    if (event.type === 'pointerdown') {
      if (target.tagName === 'svg') {
        context.helpers.beginSelectionRectangle?.(point, false, !event.shiftKey);
      }
    } else if (event.type === 'pointerup') {
      if (pointerState?.isDragging && pointerState?.hasDragMoved) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fullState = state as any;
        if (fullState.grid?.snapEnabled && fullState.snapToGrid) {
          const selectedSubpaths = state.selectedSubpaths || [];
          if (selectedSubpaths.length > 0) {
            // Convert to Map<string, Set<number>>
            const subpathMap = new Map<string, Set<number>>();
            selectedSubpaths.forEach((sel: { elementId: string; subpathIndex: number }) => {
              if (!subpathMap.has(sel.elementId)) {
                subpathMap.set(sel.elementId, new Set());
              }
              subpathMap.get(sel.elementId)!.add(sel.subpathIndex);
            });

            const bounds = calculateSubpathsBounds(state.elements, subpathMap, state.viewport.zoom);

            if (Number.isFinite(bounds.minX)) {
              const snappedTopLeft = fullState.snapToGrid(bounds.minX, bounds.minY);
              const snapOffsetX = snappedTopLeft.x - bounds.minX;
              const snapOffsetY = snappedTopLeft.y - bounds.minY;

              if (snapOffsetX !== 0 || snapOffsetY !== 0) {
                state.moveSelectedSubpaths(snapOffsetX, snapOffsetY);
              }
            }
          }
        }
      }
    }
  },
  keyboardShortcuts: {
    Escape: (_event, { store }) => {
      const state = store.getState() as CanvasStore;
      if ((state.selectedSubpaths?.length ?? 0) > 0) {
        state.clearSubpathSelection?.();
      } else {
        state.setActivePlugin('select');
      }
    },
    Delete: () => {
      // Reserved for subpath deletion behaviour
    },
  },
  canvasLayers: [
    {
      id: 'subpath-overlay',
      placement: 'foreground',
      render: ({
        elements,
        selectedSubpaths,
        activePlugin,
        smoothBrush,
        selectSubpath,
        setDragStart,
        handleSubpathDoubleClick,
        handleSubpathTouchEnd,
        isElementHidden,
        viewport,
      }) => {
        if (!['subpath', 'transformation', 'edit'].includes(activePlugin ?? '')) {
          return null;
        }

        return (
          <>
            {elements
              .filter((element) => {
                if (element.type !== 'path' || (isElementHidden && isElementHidden(element.id))) {
                  return false;
                }
                const pathData = element.data as PathData;
                return pathData.subPaths?.length > 1;
              })
              .map((element) => (
                <SubpathOverlay
                  key={`subpath-overlay-${element.id}`}
                  element={element}
                  selectedSubpaths={selectedSubpaths ?? []}
                  viewport={viewport}
                  smoothBrush={smoothBrush}
                  onSelectSubpath={selectSubpath ?? (() => {})}
                  onSetDragStart={setDragStart}
                  onSubpathDoubleClick={handleSubpathDoubleClick}
                  onSubpathTouchEnd={handleSubpathTouchEnd}
                  isVisible={activePlugin === 'subpath'}
                />
              ))}
          </>
        );
      },
    },
  ],
  slices: [subpathSliceFactory],
  // Reuse Editor styling controls for subpath editing in the bottom expandable panel
  expandablePanel: EditorPanel,
  createApi: ({ store }) => ({
    performPathSimplify: () => {
      performPathSimplify(store.getState);
    },
    performSubPathReverse: () => {
      performSubPathReverse(store.getState);
    },
    performSubPathJoin: () => {
      performSubPathJoin(store.getState);
    },
  }),
};

export type { SubpathPluginSlice };
export { SubPathOperationsPanel };
export { SubpathOverlay } from './SubpathOverlay';
