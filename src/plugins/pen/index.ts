import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPenPluginSlice } from './slice';
import { PenTool } from 'lucide-react';
import type { PenPluginSlice } from './slice';
import React from 'react';
import { PenPanel } from './PenPanel';
import { usePenDrawingHook } from './hooks/usePenDrawingHook';
import { RubberBandPreview } from './components/RubberBandPreview';
import { PenPathOverlay } from './components/PenPathOverlay';
import { PenCursorController } from './components/PenCursorController';
import { PenGuidelinesOverlay } from './components/PenGuidelinesOverlay';
import { cancelPath, finalizePath, undoPathPoint, redoPathPoint } from './actions';

const penSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
    // Call the slice creator and cast appropriately
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const slice = createPenPluginSlice(set as any, get as any, api as any);
    return {
        state: slice,
    };
};

export const penPlugin: PluginDefinition<CanvasStore> = {
    id: 'pen',
    metadata: {
        label: 'Pen',
        icon: PenTool,
        cursor: 'crosshair',
        disablePathInteraction: true,
    },
    modeConfig: {
        description: 'Bézier path editor for creating precise vector paths with anchor points and handles.',
        entry: ['clearSubpathSelection', 'clearSelectedCommands'],
        transitions: {
            '*': { description: 'Allows transitioning to any registered mode.' },
        },
    },
    toolDefinition: {
        order: 7, // After pencil (6)
        visibility: 'always-shown',
    },
    // Pen plugin manages its own undo/redo during drawing mode
    disablesGlobalUndoRedo: (store) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const penState = (store as any).pen;
        return penState?.mode === 'drawing';
    },
    subscribedEvents: ['pointerdown', 'pointermove', 'pointerup'],
    handler: (_event, _point, _target, _context) => {
        // Main handler is managed by the hook
        // This is here for compatibility but actual handling is in usePenDrawingHook
    },
    keyboardShortcuts: {
        p: (event, { store }) => {
            if (!event.ctrlKey && !event.metaKey) {
                const state = store.getState() as CanvasStore;
                state.setActivePlugin?.('pen');
            }
        },
        Enter: (_event, { store }) => {
            const state = store.getState() as CanvasStore;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const penState = (state as any).pen;
            if (penState?.mode === 'drawing') {
                finalizePath(state.getState);
            }
        },
        Escape: (_event, { store }) => {
            const state = store.getState() as CanvasStore;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const penState = (state as any).pen;
            if (penState?.mode === 'drawing') {
                cancelPath(state.getState);
            }
        },
        Delete: (_event, { store }) => {
            const state = store.getState() as CanvasStore;
            state.deleteSelectedElements?.();
        },
        'meta+z': (event, { store }) => {
            const state = store.getState() as CanvasStore;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const penState = (state as any).pen;
            if (penState?.mode === 'drawing') {
                event.preventDefault();
                event.stopPropagation();
                undoPathPoint(store.getState as () => CanvasStore);
            }
        },
        'ctrl+z': (event, { store }) => {
            const state = store.getState() as CanvasStore;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const penState = (state as any).pen;
            if (penState?.mode === 'drawing') {
                event.preventDefault();
                event.stopPropagation();
                undoPathPoint(store.getState as () => CanvasStore);
            }
        },
        'meta+shift+z': (event, { store }) => {
            const state = store.getState() as CanvasStore;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const penState = (state as any).pen;
            if (penState?.mode === 'drawing') {
                event.preventDefault();
                event.stopPropagation();
                redoPathPoint(store.getState as () => CanvasStore);
            }
        },
        'ctrl+shift+z': (event, { store }) => {
            const state = store.getState() as CanvasStore;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const penState = (state as any).pen;
            if (penState?.mode === 'drawing') {
                event.preventDefault();
                event.stopPropagation();
                redoPathPoint(store.getState as () => CanvasStore);
            }
        },
    },
    slices: [penSliceFactory],
    hooks: [
        {
            id: 'pen-drawing',
            hook: usePenDrawingHook,
        },
    ],
    canvasLayers: [
        {
            id: 'pen-cursor-controller',
            placement: 'foreground',
            render: (context) => {
                if (context.activePlugin !== 'pen') return null;
                return React.createElement(PenCursorController);
            },
        },
        {
            id: 'pen-guidelines-overlay',
            placement: 'background',
            render: (context) => {
                if (context.activePlugin !== 'pen') return null;
                return React.createElement(PenGuidelinesOverlay, { context });
            },
        },
        {
            id: 'pen-path-overlay',
            placement: 'midground',
            render: (context) => {
                if (context.activePlugin !== 'pen') return null;
                return React.createElement(PenPathOverlay, { context });
            },
        },
        {
            id: 'rubber-band-preview',
            placement: 'foreground',
            render: (context) => {
                if (context.activePlugin !== 'pen') return null;
                return React.createElement(RubberBandPreview, { context });
            },
        },
    ],
    expandablePanel: () => React.createElement(PenPanel, { hideTitle: true }),
    sidebarPanels: [
        {
            key: 'pen',
            condition: (ctx) => !ctx.isInSpecialPanelMode && ctx.activePlugin === 'pen',
            component: PenPanel,
        },
    ],
};

export type { PenPluginSlice };
export { PenPanel };
