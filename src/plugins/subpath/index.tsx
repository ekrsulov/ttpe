import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { getToolMetadata } from '../toolMetadata';
import { createSubpathPluginSlice } from './slice';
import type { SubpathPluginSlice } from './slice';
import { SubPathOperationsPanel } from './SubPathOperationsPanel';
import { SubpathOverlay } from './SubpathOverlay';
import type { PathData } from '../../types';

const subpathSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => ({
  state: createSubpathPluginSlice(set, get, api),
});

export const subpathPlugin: PluginDefinition<CanvasStore> = {
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
                  selectedSubpaths={selectedSubpaths}
                  viewport={viewport}
                  smoothBrush={smoothBrush}
                  onSelectSubpath={selectSubpath}
                  onSetDragStart={setDragStart}
                  onSubpathDoubleClick={handleSubpathDoubleClick}
                  isVisible={activePlugin === 'subpath'}
                />
              ))}
          </>
        );
      },
    },
  ],
  slices: [subpathSliceFactory],
};

export type { SubpathPluginSlice };
export { SubPathOperationsPanel };
export { SubpathOverlay } from './SubpathOverlay';
