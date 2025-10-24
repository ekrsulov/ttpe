import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { getToolMetadata } from '../toolMetadata';
import { createEditPluginSlice } from './slice';
import type { EditPluginSlice } from './slice';
import { EditPanel } from './EditPanel';
import { ControlPointAlignmentPanel } from './ControlPointAlignmentPanel';
import { PathOperationsPanel } from './PathOperationsPanel';
import { EditPointsOverlay } from './EditPointsOverlay';
import { AddPointFeedbackOverlay } from './AddPointFeedbackOverlay';
import { BlockingOverlay } from '../../components/overlays';

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
  handler: (
    event,
    point,
    target,
    isSmoothBrushActive,
    beginSelectionRectangle,
    _startShapeCreation,
    _context
  ) => {
    // Allow selection rectangle to start on SVG or on path elements (but not on edit points)
    if ((target.tagName === 'svg' || target.tagName === 'path') && !isSmoothBrushActive) {
      beginSelectionRectangle(point, !event.shiftKey, false);
    }
  },
  keyboardShortcuts: {
    Delete: () => {
      // Reserved for edit tool deletion behaviour
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
                const hasSelectedSubpath = (selectedSubpaths ?? []).some((subpath) => subpath.elementId === element.id);

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
                    onStartDraggingPoint={startDraggingPoint ?? (() => {})}
                    onSelectCommand={selectCommand ?? (() => {})}
                  />
                );
              })}
          </>
        );
      },
    },
    {
      id: 'smooth-brush-cursor',
      placement: 'foreground',
      render: ({ activePlugin, isSmoothBrushActive, smoothBrushCursor, smoothBrush }) => {
        if (activePlugin !== 'edit' || !isSmoothBrushActive) {
          return null;
        }

        return (
          <ellipse
            cx={smoothBrushCursor.x}
            cy={smoothBrushCursor.y}
            rx={smoothBrush.radius}
            ry={smoothBrush.radius}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="1.2"
            style={{ pointerEvents: 'none' }}
          />
        );
      },
    },
    {
      id: 'add-point-feedback',
      placement: 'foreground',
      render: ({ activePlugin, viewport, addPointMode }) => {
        if (activePlugin !== 'edit' || !addPointMode?.isActive) {
          return null;
        }

        return (
          <AddPointFeedbackOverlay
            hoverPosition={addPointMode.hoverPosition}
            isActive={addPointMode.isActive}
            viewport={viewport}
          />
        );
      },
    },
  ],
  slices: [editSliceFactory],
};

export type { EditPluginSlice };
export { EditPanel, ControlPointAlignmentPanel, PathOperationsPanel };
export { EditPointsOverlay } from './EditPointsOverlay';
