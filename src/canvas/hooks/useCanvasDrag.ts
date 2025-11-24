import { useState, useEffect } from 'react';
import type { CanvasElement, SubPath, Point, ControlPointInfo, PathData } from '../../types';
import { usePointerState } from './usePointerState';
import {
    calculateDragPosition,
    updateSinglePointPath,
    updateGroupDragPaths,
    type DragState
} from '../interactions/DragStrategy';

// --- Types from usePointerStateController ---

type BeginSelectionRectangle = (
    point: Point,
    shouldClearCommands?: boolean,
    shouldClearSubpaths?: boolean
) => void;

type UpdateSelectionRectangle = (point: Point) => void;

type CompleteSelectionRectangle = () => void;

// --- Types from useCanvasDragInteractions ---

interface DragCallbacks {
    onStopDraggingPoint: () => void;
    onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
    getControlPointInfo: (elementId: string, commandIndex: number, pointIndex: number) => ControlPointInfo | null;
    clearGuidelines?: () => void;
}

interface UseCanvasDragProps {
    // Pointer state props
    isSelecting: boolean;
    beginSelectionRectangle: BeginSelectionRectangle;
    updateSelectionRectangle: UpdateSelectionRectangle;
    completeSelectionRectangle: CompleteSelectionRectangle;

    // Drag interaction props
    dragState: DragState;
    viewport: {
        zoom: number;
        panX: number;
        panY: number;
    };
    elements: Array<CanvasElement>;
    callbacks: DragCallbacks;
}

export const useCanvasDrag = ({
    isSelecting,
    beginSelectionRectangle,
    updateSelectionRectangle,
    completeSelectionRectangle,
    dragState,
    viewport,
    elements,
    callbacks
}: UseCanvasDragProps) => {
    // --- Pointer State Logic ---
    const {
        isDragging,
        dragStart,
        hasDragMoved,
        setIsDragging,
        setDragStart,
        setHasDragMoved,
        stateRefs
    } = usePointerState({ isSelecting });

    // Helper ref for callbacks (kept for compatibility with existing consumers if needed, 
    // though usePointerState handles the core state refs)
    // We recreate helpersRef to match the expected return type structure if needed,
    // or we can just return the functions directly if consumers don't need the ref.
    // Looking at Canvas.tsx, it uses helpers.current. So we need to maintain that.

    // Actually, usePointerState doesn't return helpersRef. We should probably keep it here 
    // or move it to usePointerState if it's generic enough. 
    // For now, let's keep it here to minimize changes to usePointerState.

    // Wait, the original useCanvasDrag returned `helpers` which was a ref.
    // Let's reconstruct it.
    const helpersRef = {
        current: {
            beginSelectionRectangle,
            updateSelectionRectangle,
            completeSelectionRectangle,
        }
    };

    // --- Drag Interaction Logic ---
    const [dragPosition, setDragPosition] = useState<Point | null>(null);
    const [originalPathDataMap, setOriginalPathDataMap] = useState<Record<string, SubPath[]> | null>(null);

    useEffect(() => {
        let lastUpdateTime = 0;
        const UPDATE_THROTTLE = 16; // ~60fps

        const handlePointerMove = (e: MouseEvent) => {
            const { editingPoint, draggingSelection, draggingSubpaths } = dragState;

            if (editingPoint?.isDragging || draggingSelection?.isDragging || draggingSubpaths?.isDragging) {
                const position = calculateDragPosition(e, viewport, dragState);

                if (position) {
                    const { canvasX, canvasY } = position;

                    // Update local drag position for smooth visualization
                    setDragPosition({
                        x: canvasX,
                        y: canvasY
                    });

                    // Throttled path update for real-time feedback
                    const now = Date.now();
                    if (now - lastUpdateTime >= UPDATE_THROTTLE) {
                        lastUpdateTime = now;

                        if (editingPoint?.isDragging) {
                            updateSinglePointPath(editingPoint, canvasX, canvasY, elements, callbacks);
                        } else if (draggingSelection?.isDragging) {
                            updateGroupDragPaths(draggingSelection, canvasX, canvasY, elements, originalPathDataMap, callbacks);
                        }
                    }
                }
            }
        };

        const handlePointerUp = () => {
            const { editingPoint, draggingSelection, draggingSubpaths } = dragState;

            if (editingPoint?.isDragging || draggingSelection?.isDragging || draggingSubpaths?.isDragging) {
                // Emergency cleanup - clear all temporary state
                setDragPosition(null);
                setOriginalPathDataMap(null);

                // Clear guidelines when drag ends
                if (callbacks.clearGuidelines) {
                    callbacks.clearGuidelines();
                }

                // Force cleanup of drag state
                if (editingPoint?.isDragging || draggingSelection?.isDragging || draggingSubpaths?.isDragging) {
                    callbacks.onStopDraggingPoint();
                }
            }
        };

        // Emergency cleanup for cases where pointerup might not fire
        const handlePointerCancel = () => {
            setDragPosition(null);
            setOriginalPathDataMap(null);
            const { editingPoint, draggingSelection, draggingSubpaths } = dragState;

            // Clear guidelines when drag is cancelled
            if (callbacks.clearGuidelines) {
                callbacks.clearGuidelines();
            }

            if (editingPoint?.isDragging || draggingSelection?.isDragging || draggingSubpaths?.isDragging) {
                callbacks.onStopDraggingPoint();
            }
        };

        const isAnyDragging = dragState.editingPoint?.isDragging ||
            dragState.draggingSelection?.isDragging ||
            dragState.draggingSubpaths?.isDragging;

        if (isAnyDragging) {
            // Initialize original path data map if needed
            if (!originalPathDataMap && dragState.draggingSelection?.isDragging) {
                const newOriginalPathDataMap: Record<string, SubPath[]> = {};
                dragState.draggingSelection.initialPositions.forEach(pos => {
                    const element = elements.find(el => el.id === pos.elementId);
                    if (element && element.type === 'path') {
                        const pathData = element.data as PathData;
                        newOriginalPathDataMap[pos.elementId] = pathData.subPaths;
                    }
                });
                setOriginalPathDataMap(newOriginalPathDataMap);
            }

            // Use document for more reliable event capture
            document.addEventListener('pointermove', handlePointerMove, { passive: false });
            document.addEventListener('pointerup', handlePointerUp, { passive: false });
            document.addEventListener('pointercancel', handlePointerCancel, { passive: false });

            // Additional cleanup listeners for edge cases
            document.addEventListener('contextmenu', handlePointerCancel, { passive: false });
            document.addEventListener('blur', handlePointerCancel, { passive: false });
            window.addEventListener('blur', handlePointerCancel, { passive: false });

            // Emergency cleanup for visibility change and unload
            const handleVisibilityChange = () => {
                if (document.hidden) {
                    handlePointerCancel();
                }
            };
            document.addEventListener('visibilitychange', handleVisibilityChange);
            window.addEventListener('beforeunload', handlePointerCancel);

            return () => {
                // Cleanup all listeners
                document.removeEventListener('pointermove', handlePointerMove);
                document.removeEventListener('pointerup', handlePointerUp);
                document.removeEventListener('pointercancel', handlePointerCancel);
                document.removeEventListener('contextmenu', handlePointerCancel);
                document.removeEventListener('blur', handlePointerCancel);
                window.removeEventListener('blur', handlePointerCancel);
                document.removeEventListener('visibilitychange', handleVisibilityChange);
                window.removeEventListener('beforeunload', handlePointerCancel);
            };
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        dragState.editingPoint?.isDragging,
        dragState.editingPoint?.elementId,
        dragState.editingPoint?.commandIndex,
        dragState.editingPoint?.pointIndex,
        dragState.draggingSelection?.isDragging,
        dragState.draggingSubpaths?.isDragging,
        viewport,
        elements,
        callbacks,
        originalPathDataMap
    ]);

    return {
        // Pointer state
        isDragging,
        dragStart,
        hasDragMoved,
        setIsDragging,
        setDragStart,
        setHasDragMoved,
        stateRefs,
        helpers: helpersRef,

        // Drag interaction state
        dragPosition,
        originalPathDataMap
    };
};

