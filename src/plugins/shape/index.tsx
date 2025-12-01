import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { Shapes } from 'lucide-react';
import { createShapePluginSlice } from './slice';
import type { ShapePluginSlice } from './slice';
import React from 'react';
import { ShapePanel } from './ShapePanel';
import { ShapePreview } from './ShapePreview';
import { BlockingOverlay, FeedbackOverlay } from '../../overlays';
import { createShape } from './actions';
import type { Point, Viewport } from '../../types';
import { getEffectiveShift } from '../../utils/effectiveShift';
import { ShapeCreationController } from './ShapeCreationController';
import { useCanvasStore } from '../../store/canvasStore';

const shapeSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slice = createShapePluginSlice(set as any, get as any, api as any);
  return {
    state: slice,
  };
};

const ShapePreviewWrapper: React.FC = () => {
  const shape = useCanvasStore(state => state.shape);
  const viewport = useCanvasStore(state => state.viewport);

  const { interaction, selectedShape } = shape;

  if (!interaction.isCreating || !interaction.startPoint || !interaction.endPoint) {
    return null;
  }

  return (
    <ShapePreview
      selectedShape={selectedShape}
      shapeStart={interaction.startPoint}
      shapeEnd={interaction.endPoint}
      viewport={viewport}
    />
  );
};

const ShapeBlockingOverlayWrapper: React.FC<{
  viewport: Viewport;
  canvasSize: { width: number; height: number };
}> = ({ viewport, canvasSize }) => {
  const isCreating = useCanvasStore(state => state.shape.interaction.isCreating);

  return (
    <BlockingOverlay
      viewport={viewport}
      canvasSize={canvasSize}
      isActive={isCreating}
    />
  );
};

const ShapeFeedbackOverlayWrapper: React.FC<{
  viewport: Viewport;
  canvasSize: { width: number; height: number };
}> = ({ viewport, canvasSize }) => {
  const shape = useCanvasStore(state => state.shape);
  const isVirtualShiftActive = useCanvasStore(state => state.isVirtualShiftActive);
  
  const { interaction, selectedShape } = shape;
  
  if (!interaction.isCreating || !interaction.startPoint || !interaction.endPoint) {
    return null;
  }
  
  const controller = new ShapeCreationController({
    createShape: () => {},
    getSelectedShape: () => selectedShape
  });
  
  // Calculate feedback based on current drag state
  const feedback = controller.calculateShapeFeedback(
    interaction.startPoint,
    interaction.endPoint,
    isVirtualShiftActive
  );
  
  return (
    <FeedbackOverlay
      viewport={viewport}
      canvasSize={canvasSize}
      shapeFeedback={feedback}
    />
  );
};

export const shapePlugin: PluginDefinition<CanvasStore> = {
  id: 'shape',
  metadata: {
    label: 'Shape',
    icon: Shapes,
    cursor: 'crosshair',
    disablePathInteraction: true,
  },
  modeConfig: {
    description: 'Creates basic geometric shapes.',
    transitions: {
      select: { description: 'Returns to selection mode.' },
      '*': { description: 'Allows transitioning to other modes.' },
    },
  },
  toolDefinition: { order: 9 },
  subscribedEvents: ['pointerdown', 'pointermove', 'pointerup'],
  handler: (event, point, target, context) => {
    const state = context.store.getState();
    const { interaction, selectedShape } = state.shape;
    const effectiveShiftKey = getEffectiveShift(event.shiftKey, state.isVirtualShiftActive);

    const controller = new ShapeCreationController({
      createShape: (start, end) => createShape(start, end, context.store.getState),
      getSelectedShape: () => state.shape.selectedShape
    });

    if (event.type === 'pointerdown') {
      if (target.tagName === 'svg' || target.classList.contains('canvas-background')) {
        const startPoint = state.grid?.snapEnabled ? state.snapToGrid?.(point.x, point.y) || point : point;

        state.setShapeInteraction({
          isCreating: true,
          startPoint: startPoint,
          endPoint: startPoint,
        });
      }
    } else if (event.type === 'pointermove') {
      if (interaction.isCreating && interaction.startPoint) {
        let endPoint = state.grid?.snapEnabled ? state.snapToGrid?.(point.x, point.y) || point : point;

        if (selectedShape === 'line' && effectiveShiftKey) {
          endPoint = controller.calculateConstrainedLineEnd(interaction.startPoint, endPoint);
        } else if (effectiveShiftKey) {
          // 10px snap for other shapes
          const dx = endPoint.x - interaction.startPoint.x;
          const dy = endPoint.y - interaction.startPoint.y;
          const snappedDx = Math.round(dx / 10) * 10;
          const snappedDy = Math.round(dy / 10) * 10;
          endPoint = {
            x: interaction.startPoint.x + snappedDx,
            y: interaction.startPoint.y + snappedDy
          };
        }

        state.setShapeInteraction({
          endPoint: endPoint,
        });
      }
    } else if (event.type === 'pointerup') {
      if (interaction.isCreating && interaction.startPoint && interaction.endPoint) {
        controller.completeShapeCreation(interaction.startPoint, interaction.endPoint);

        state.setShapeInteraction({
          isCreating: false,
          startPoint: null,
          endPoint: null,
        });

        if (!state.shape.keepShapeMode) {
          state.setActivePlugin('select');
        }
      }
    }
  },
  keyboardShortcuts: {
    Escape: (_event, { store }) => {
      const state = store.getState() as CanvasStore;
      state.setShapeInteraction({
        isCreating: false,
        startPoint: null,
        endPoint: null,
      });
    },
  },
  canvasLayers: [
    {
      id: 'shape-blocking-overlay',
      placement: 'midground',
      render: ({ viewport, canvasSize }) => (
        <ShapeBlockingOverlayWrapper
          viewport={viewport}
          canvasSize={canvasSize}
        />
      ),
    },
    {
      id: 'shape-preview',
      placement: 'midground',
      render: () => <ShapePreviewWrapper />,
    },
    {
      id: 'shape-feedback',
      placement: 'foreground',
      render: ({ viewport, canvasSize }) => (
        <ShapeFeedbackOverlayWrapper
          viewport={viewport}
          canvasSize={canvasSize}
        />
      ),
    },
  ],
  slices: [shapeSliceFactory],
  createApi: ({ store }) => ({
    createShape: (startPoint: Point, endPoint: Point) => {
      createShape(startPoint, endPoint, store.getState);
    },
  }),
  expandablePanel: () => React.createElement(ShapePanel, { hideTitle: true }),
  sidebarPanels: [
    {
      key: 'shape',
      condition: (ctx) => !ctx.isInSpecialPanelMode && ctx.activePlugin === 'shape',
      component: ShapePanel,
    },
  ],
};

export type { ShapePluginSlice };
export { ShapePanel };
