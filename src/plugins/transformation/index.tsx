import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { getToolMetadata } from '../toolMetadata';
import { createTransformationPluginSlice } from './slice';
import type { TransformationPluginSlice } from './slice';
import { TransformationPanel } from './TransformationPanel';
import { TransformationOverlay } from './TransformationOverlay';
import { FeedbackOverlay, BlockingOverlay } from '../../overlays';
import { measureSubpathBounds } from '../../utils/geometry';
import type { PathData } from '../../types';

const transformationSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slice = createTransformationPluginSlice(set as any, get as any, api as any);
  return {
    state: slice,
  };
};

export const transformationPlugin: PluginDefinition<CanvasStore> = {
  id: 'transformation',
  metadata: getToolMetadata('transformation'),
  handler: (
    _event,
    _point,
    _target,
    _context
  ) => {
    // Transformation tool relies on pointer event listeners elsewhere
  },
  canvasLayers: [
    {
      id: 'transformation-controls',
      placement: 'foreground',
      render: ({
        selectedIds,
        selectedSubpaths,
        elementMap,
        viewport,
        activePlugin,
        transformation,
        isElementHidden,
        isWorkingWithSubpaths,
        handleTransformationHandlerPointerDown,
        handleTransformationHandlerPointerUp,
        getElementBounds,
      }) => {
        const selections = (selectedSubpaths ?? []).length > 0 ? selectedSubpaths ?? [] : selectedIds;
        if (!selections || selections.length === 0) {
          return null;
        }

        return (
          <>
            {selections.map((selection) => {
              const elementId = typeof selection === 'string' ? selection : selection.elementId;
              const element = elementMap.get(elementId);

              if (!element || element.type !== 'path' || (isElementHidden && isElementHidden(elementId))) {
                return null;
              }

              const pathData = element.data as PathData;
              let bounds = getElementBounds(element);

              if (typeof selection !== 'string') {
                const subpathIndex = selection.subpathIndex;
                bounds = measureSubpathBounds(
                  pathData.subPaths[subpathIndex],
                  pathData.strokeWidth ?? 1,
                  viewport.zoom
                );
              }

              return (
                <TransformationOverlay
                  key={typeof selection === 'string' ? elementId : `subpath-${elementId}-${selection.subpathIndex}`}
                  element={element}
                  bounds={bounds}
                  selectedSubpaths={selectedSubpaths ?? []}
                  viewport={viewport}
                  activePlugin={activePlugin}
                  transformation={transformation}
                  isWorkingWithSubpaths={isWorkingWithSubpaths?.() ?? false}
                  onTransformationHandlerPointerDown={handleTransformationHandlerPointerDown}
                  onTransformationHandlerPointerUp={handleTransformationHandlerPointerUp}
                />
              );
            })}
          </>
        );
      },
    },
    {
      id: 'transformation-feedback',
      placement: 'foreground',
      render: ({ viewport, canvasSize, transformFeedback, shapeFeedback }) => (
        <FeedbackOverlay
          viewport={viewport}
          canvasSize={canvasSize}
          rotationFeedback={transformFeedback?.rotation}
          resizeFeedback={transformFeedback?.resize}
          shapeFeedback={shapeFeedback?.shape}
          pointPositionFeedback={shapeFeedback?.pointPosition}
        />
      ),
    },
    {
      id: 'transformation-blocking-overlay',
      placement: 'foreground',
      render: ({ viewport, canvasSize, transformation, handleTransformationHandlerPointerUp }) => (
        <BlockingOverlay
          viewport={viewport}
          canvasSize={canvasSize}
          isActive={transformation?.isTransforming ?? false}
          onPointerUp={handleTransformationHandlerPointerUp}
        />
      ),
    },
  ],
  slices: [transformationSliceFactory],
};

export type { TransformationPluginSlice };
export { TransformationPanel };
export { TransformationOverlay } from './TransformationOverlay';
export { useCanvasTransformControls } from '../../canvas/hooks/useCanvasTransformControls';
