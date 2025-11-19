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
  handler: (event, point, target, context) => {
    if (target.tagName === 'svg') {
      context.helpers.beginSelectionRectangle?.(point, false, !event.shiftKey);
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
