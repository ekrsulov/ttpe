import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { getToolMetadata } from '../toolMetadata';
import { createTransformationPluginSlice } from './slice';
import type { TransformationPluginSlice } from './slice';
import React from 'react';
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
  keyboardShortcuts: {
    Escape: (_event, { store }) => {
      const state = store.getState() as CanvasStore;
      if ((state.selectedSubpaths?.length ?? 0) > 0) {
        state.setActivePlugin('subpath');
      } else {
        state.setActivePlugin('select');
      }
    },
  },
  onElementDoubleClick: (elementId, _event, context) => {
    const state = context.store.getState();
    const wasAlreadySelected = state.selectedIds.length === 1 && state.selectedIds[0] === elementId;
    if (wasAlreadySelected) {
      state.setActivePlugin('edit');
    }
  },
  onSubpathDoubleClick: (elementId, subpathIndex, _event, context) => {
    const state = context.store.getState();
    const wasAlreadySelected = (state.selectedSubpaths?.length ?? 0) === 1 &&
      state.selectedSubpaths?.[0].elementId === elementId &&
      state.selectedSubpaths?.[0].subpathIndex === subpathIndex;

    if (wasAlreadySelected) {
      state.setActivePlugin('edit');
    } else {
      const subpathSelection = [{ elementId, subpathIndex }];
      state.setState({ selectedSubpaths: subpathSelection });
    }
  },
  onCanvasDoubleClick: (_event, context) => {
    context.store.getState().setActivePlugin('select');
  },
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
        // This layer handles:
        // 1. Subpath transformations (when in subpath/transformation mode)
        // 2. Single path transformations (when in select/transformation mode)
        // Note: Group and multi-selection handlers are rendered by the select plugin

        // Case 1: Working with subpaths
        if (isWorkingWithSubpaths?.() && (selectedSubpaths ?? []).length > 0) {
          return (
            <>
              {selectedSubpaths!.map((selection: { elementId: string; subpathIndex: number }) => {
                const element = elementMap.get(selection.elementId);

                if (!element || element.type !== 'path' || (isElementHidden && isElementHidden(selection.elementId))) {
                  return null;
                }

                const pathData = element.data as PathData;
                const bounds = measureSubpathBounds(
                  pathData.subPaths[selection.subpathIndex],
                  pathData.strokeWidth ?? 1,
                  viewport.zoom
                );

                return (
                  <TransformationOverlay
                    key={`subpath-${selection.elementId}-${selection.subpathIndex}`}
                    element={element}
                    bounds={bounds}
                    selectedSubpaths={selectedSubpaths ?? []}
                    viewport={viewport}
                    activePlugin={activePlugin}
                    transformation={transformation}
                    isWorkingWithSubpaths={true}
                    onTransformationHandlerPointerDown={handleTransformationHandlerPointerDown}
                    onTransformationHandlerPointerUp={handleTransformationHandlerPointerUp}
                  />
                );
              })}
            </>
          );
        }

        // Case 2: Single path selected (not a group, not multi-selection)
        // Only show if in select or transformation mode
        if (selectedIds.length === 1 && (activePlugin === 'select' || activePlugin === 'transformation')) {
          const element = elementMap.get(selectedIds[0]);
          if (!element || (isElementHidden && isElementHidden(selectedIds[0]))) {
            return null;
          }

          // Only handle paths here (groups are handled by select plugin)
          if (element.type === 'path') {
            const bounds = getElementBounds(element);
            if (bounds) {
              return (
                <TransformationOverlay
                  element={element}
                  bounds={bounds}
                  selectedSubpaths={[]}
                  viewport={viewport}
                  activePlugin={activePlugin}
                  transformation={transformation}
                  isWorkingWithSubpaths={false}
                  onTransformationHandlerPointerDown={handleTransformationHandlerPointerDown}
                  onTransformationHandlerPointerUp={handleTransformationHandlerPointerUp}
                />
              );
            }
          }
        }

        return null;
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
  expandablePanel: () => React.createElement(TransformationPanel, { hideTitle: true }),
  sidebarPanels: [
    {
      key: 'transformation',
      condition: (ctx) => !ctx.isInSpecialPanelMode && ctx.activePlugin === 'transformation',
      component: TransformationPanel,
    },
  ],
};

export type { TransformationPluginSlice };
export { TransformationPanel };
export { TransformationOverlay } from './TransformationOverlay';
export { useCanvasTransformControls } from '../../canvas/hooks/useCanvasTransformControls';
