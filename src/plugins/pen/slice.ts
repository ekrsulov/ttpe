import type { StateCreator } from 'zustand';
import type { PenMode, PenPath, PenAnchorPoint, PenCursorState, PenDragState, PenHoverTarget } from './types';

/**
 * Pen Plugin State Interface
 * Stroke/fill settings come from central pencil state
 */
export interface PenPluginSlice {
    pen: {
        // Drawing state
        mode: PenMode;
        currentPath: PenPath | null;

        // Preview state
        rubberBandEnabled: boolean;
        previewAnchor: PenAnchorPoint | null;

        // Interaction state
        cursorState: PenCursorState;
        dragState: PenDragState | null;
        activeAnchorIndex: number | null;
        hoverTarget: PenHoverTarget | null;

        // Editing state
        editingPathId: string | null;
        editingSubPathIndex: number | null;
        selectedAnchorIndex: number | null;

        // Preferences
        autoAddDelete: boolean;
        snapToPoints: boolean;
    };
    updatePenState: (state: Partial<PenPluginSlice['pen']>) => void;
}

/**
 * Create Pen Plugin Slice
 */
export const createPenPluginSlice: StateCreator<PenPluginSlice> = (set) => ({
    pen: {
        mode: 'idle',
        currentPath: null,
        rubberBandEnabled: true,
        previewAnchor: null,
        cursorState: 'new-path',
        dragState: null,
        activeAnchorIndex: null,
        hoverTarget: null,
        editingPathId: null,
        editingSubPathIndex: null,
        selectedAnchorIndex: null,
        autoAddDelete: true,
        snapToPoints: false,
    },
    updatePenState: (newState) =>
        set((state) => ({
            pen: {
                ...state.pen,
                ...newState,
            },
        })),
});
