import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { getToolMetadata } from '../toolMetadata';
import { createEditPluginSlice } from './slice';
import type { EditPluginSlice } from './slice';
// no React import needed
import { EditPanel } from './EditPanel';
import { useCanvasStore } from '../../store/canvasStore';
import { BlockingOverlay } from '../../overlays';

const EditExpandablePanelWrapper: React.FC = () => {
  const activePlugin = useCanvasStore(s => s.activePlugin);

  return <EditPanel activePlugin={activePlugin} />;
};
import { ControlPointAlignmentPanel } from './ControlPointAlignmentPanel';
import { EditPointsOverlay } from './EditPointsOverlay';
import { FeedbackOverlay } from '../../overlays';

const editSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slice = createEditPluginSlice(set as any, get as any, api as any);
  return {
    state: slice,
  };
};

export const editPlugin: PluginDefinition<CanvasStore> = {
  id: 'edit',
  metadata: getToolMetadata('edit'),
  onElementDoubleClick: (elementId, _event, context) => {
    const state = context.store.getState();
    const wasAlreadySelected = state.selectedIds.length === 1 && state.selectedIds[0] === elementId;
    if (!wasAlreadySelected) {
      // Different element -> selection changed, stay in edit mode
    }
  },
  onSubpathDoubleClick: (elementId, subpathIndex, _event, context) => {
    const state = context.store.getState();
    const wasAlreadySelected = (state.selectedSubpaths?.length ?? 0) === 1 &&
      state.selectedSubpaths?.[0].elementId === elementId &&
      state.selectedSubpaths?.[0].subpathIndex === subpathIndex;

    if (!wasAlreadySelected) {
      const subpathSelection = [{ elementId, subpathIndex }];
      state.setState({ selectedSubpaths: subpathSelection });
    }
  },
  onCanvasDoubleClick: (_event, context) => {
    context.store.getState().setActivePlugin('select');
  },
  handler: (
    event,
    point,
    target,
    context
  ) => {
    // Check if add point mode is active
    const state = context.store.getState() as CanvasStore;
    const isAddPointModeActive = state.addPointMode?.isActive ?? false;

    // Don't start selection rectangle if add point mode is active
    if (isAddPointModeActive) {
      return;
    }

    // Allow selection rectangle to start on SVG or on path elements (but not on edit points)
    if ((target.tagName === 'svg' || target.tagName === 'path') && !context.helpers.isSmoothBrushActive) {
      context.helpers.beginSelectionRectangle?.(point, !event.shiftKey, false);
    }
  },
  keyboardShortcuts: {
    Delete: (_event, context) => {
      const store = context.store as { deleteSelectedCommands?: () => void };
      store.deleteSelectedCommands?.();
    },
    Escape: (_event, { store }) => {
      const state = store.getState() as CanvasStore;
      if ((state.selectedCommands?.length ?? 0) > 0) {
        state.clearSelectedCommands?.();
      } else if ((state.selectedSubpaths?.length ?? 0) > 0) {
        state.setActivePlugin('subpath');
      } else {
        state.setActivePlugin('select');
      }
    },
  },
  canvasLayers: [
    {
      id: 'edit-blocking-overlay',
      placement: 'midground',
      render: ({ viewport, canvasSize, editingPoint, draggingSelection }) => {
        // Activate overlay when dragging points or selections
        const isActive = (editingPoint?.isDragging ?? false) || (draggingSelection?.isDragging ?? false);
        return (
          <BlockingOverlay
            viewport={viewport}
            canvasSize={canvasSize}
            isActive={isActive}
          />
        );
      },
    },
    {
      id: 'edit-points-overlay',
      placement: 'foreground',
      render: ({
        elements,
        selectedIds,
        selectedSubpaths,
        activePlugin,
        selectedCommands,
        editingPoint,
        draggingSelection,
        dragPosition,
        viewport,
        smoothBrush,
        getFilteredEditablePoints,
        startDraggingPoint,
        selectCommand,
        isElementHidden,
      }) => {
        if (activePlugin !== 'edit') {
          return null;
        }

        return (
          <>
            {elements
              .filter((element) =>
                element.type === 'path' && (!isElementHidden || !isElementHidden(element.id))
              )
              .map((element) => {
                const isSelected = selectedIds.includes(element.id);
                const hasSelectedSubpath = (selectedSubpaths ?? []).some((subpath: { elementId: string }) => subpath.elementId === element.id);

                if (!isSelected && !hasSelectedSubpath) {
                  return null;
                }

                return (
                  <EditPointsOverlay
                    key={`edit-overlay-${element.id}`}
                    element={element}
                    selectedCommands={selectedCommands ?? []}
                    editingPoint={editingPoint ?? null}
                    draggingSelection={draggingSelection ?? null}
                    dragPosition={dragPosition}
                    viewport={viewport}
                    smoothBrush={smoothBrush}
                    getFilteredEditablePoints={getFilteredEditablePoints ?? (() => [])}
                    onStartDraggingPoint={startDraggingPoint ?? (() => { })}
                    onSelectCommand={selectCommand ?? (() => { })}
                  />
                );
              })}
          </>
        );
      },
    },

    {
      id: 'point-position-feedback',
      placement: 'foreground',
      render: ({ activePlugin, pointPositionFeedback, viewport, canvasSize }) => {
        if (activePlugin !== 'edit' || !pointPositionFeedback?.visible) {
          return null;
        }

        return (
          <FeedbackOverlay
            viewport={viewport}
            canvasSize={canvasSize}
            pointPositionFeedback={pointPositionFeedback}
          />
        );
      },
    },
  ],
  slices: [editSliceFactory],
  // Use a proper React component wrapper for the expandable panel
  expandablePanel: EditExpandablePanelWrapper,
};

export type { EditPluginSlice };
export { EditPanel, ControlPointAlignmentPanel };
export { EditPointsOverlay } from './EditPointsOverlay';
