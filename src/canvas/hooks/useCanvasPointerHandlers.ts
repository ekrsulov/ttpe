import { useCallback } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import type { Point } from '../../types';
import type { PathData } from '../../types';
import { useCanvasEventBus } from '../CanvasEventBusContext';
import { calculateBounds } from '../../utils/boundsUtils';

export interface CanvasPointerHandlersProps {
    screenToCanvas: (x: number, y: number) => Point;
    isSpacePressed: boolean;
    activePlugin: string | null;
    isSelecting: boolean;
    selectionStart: Point | null;
    isDragging: boolean;
    dragStart: Point | null;
    hasDragMoved: boolean;
    beginSelectionRectangle: (point: Point, shiftKey?: boolean, subpathMode?: boolean) => void;
    setIsDragging: (dragging: boolean) => void;
    setDragStart: (point: Point | null) => void;
    setHasDragMoved: (moved: boolean) => void;
    moveSelectedElements: (deltaX: number, deltaY: number, precisionOverride?: number) => void;
    moveSelectedSubpaths: (deltaX: number, deltaY: number) => void;
    isWorkingWithSubpaths: () => boolean;
    selectedSubpaths: Array<{ elementId: string; subpathIndex: number }>;
    selectedIds: string[];
    completeSelectionRectangle: () => void;
    updateSelectionRectangle: (point: Point) => void;
}

export interface CanvasPointerHandlers {
    handlePointerDown: (e: React.PointerEvent) => void;
    handlePointerMove: (e: React.PointerEvent) => void;
    handlePointerUp: (e: React.PointerEvent) => void;
}

/**
 * Hook for handling pointer events (down, move, up) on the canvas
 */
export const useCanvasPointerHandlers = (
    props: CanvasPointerHandlersProps
): CanvasPointerHandlers => {
    const {
        screenToCanvas,
        isSpacePressed,
        activePlugin,
        isSelecting,
        selectionStart,
        isDragging,
        dragStart,
        hasDragMoved,
        beginSelectionRectangle,
        setIsDragging,
        setDragStart,
        setHasDragMoved,
        moveSelectedElements,
        moveSelectedSubpaths,
        isWorkingWithSubpaths,
        selectedSubpaths,
        selectedIds,
        completeSelectionRectangle,
        updateSelectionRectangle,
    } = props;

    const eventBus = useCanvasEventBus();

    // Handle pointer down
    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        const point = screenToCanvas(e.clientX, e.clientY);
        const target = (e.target as Element) ?? null;

        if (isSpacePressed || activePlugin === 'pan') {
            return;
        }

        eventBus.emit('pointerdown', {
            event: e,
            point,
            target,
            activePlugin,
            helpers: {
                beginSelectionRectangle,
                updateSelectionRectangle,
                completeSelectionRectangle,
                setIsDragging,
                setDragStart,
                setHasDragMoved,
            },
            state: {
                isSelecting,
                isDragging,
                dragStart,
                hasDragMoved,
            },
        });
    }, [
        activePlugin,
        screenToCanvas,
        isSpacePressed,
        eventBus,
        beginSelectionRectangle,
        updateSelectionRectangle,
        completeSelectionRectangle,
        isSelecting,
        isDragging,
        dragStart,
        hasDragMoved,
        setIsDragging,
        setDragStart,
        setHasDragMoved,
    ]);

    // Handle pointer move
    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        const point = screenToCanvas(e.clientX, e.clientY);
        const target = (e.target as Element) ?? null;

        eventBus.emit('pointermove', {
            event: e,
            point,
            target,
            activePlugin,
            helpers: {
                beginSelectionRectangle,
                updateSelectionRectangle,
                completeSelectionRectangle,
                setIsDragging,
                setDragStart,
                setHasDragMoved,
            },
            state: {
                isSelecting,
                isDragging,
                dragStart,
                hasDragMoved,
            },
        });

        if (isSpacePressed && e.buttons === 1) {
            // Pan the canvas with spacebar + pointer button
            const deltaX = e.movementX;
            const deltaY = e.movementY;
            useCanvasStore.getState().pan(deltaX, deltaY);
            return;
        }

        // Check for potential element dragging (when we have dragStart but may not be isDragging yet)
        // Use fresh state for dragStart to avoid race conditions
        const currentDragStart = dragStart;

        if (currentDragStart && !isSelecting) {
            const deltaX = point.x - currentDragStart.x;
            const deltaY = point.y - currentDragStart.y;

            // Only start actual dragging if we've moved more than a threshold
            // Once dragging has started, move with any delta (no threshold) for smooth continuous movement
            const shouldStartDragging = !isDragging && (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3);
            const shouldContinueDragging = isDragging && (Math.abs(deltaX) > 0.001 || Math.abs(deltaY) > 0.001);

            if (shouldStartDragging || shouldContinueDragging) {
                if (!isDragging) {
                    setIsDragging(true); // Start dragging now
                    // Set global flag to prevent re-renders in action bars and select panel
                    useCanvasStore.getState().setIsDraggingElements(true);
                }
                setHasDragMoved(true);

                // Check if we're working with subpaths
                if (isWorkingWithSubpaths() && activePlugin !== 'select') {
                    // Move selected subpaths if we have a drag start
                    if (currentDragStart && selectedSubpaths.length > 0) {
                        const deltaX = point.x - currentDragStart.x;
                        const deltaY = point.y - currentDragStart.y;
                        moveSelectedSubpaths(deltaX, deltaY);
                        setDragStart(point);
                    }
                    return;
                } else {
                    // Move entire selected elements
                    let deltaX = point.x - currentDragStart.x;
                    let deltaY = point.y - currentDragStart.y;

                    // Calculate guidelines for selected elements
                    const state = useCanvasStore.getState();
                    if (state.guidelines && state.guidelines.enabled && selectedIds.length > 0) {
                        // Calculate bounds for the first selected element (for simplicity, we use the first one for snapping)
                        const firstElementId = selectedIds[0];
                        const element = state.elements.find(el => el.id === firstElementId);

                        if (element && element.type === 'path') {
                            const pathData = element.data as PathData;

                            // Calculate current bounds using consolidated utility
                            const bounds = calculateBounds(pathData.subPaths, pathData.strokeWidth || 0, state.viewport.zoom);

                            if (isFinite(bounds.minX)) {
                                // Apply the delta to get the "would-be" position
                                const projectedBounds = {
                                    minX: bounds.minX + deltaX,
                                    minY: bounds.minY + deltaY,
                                    maxX: bounds.maxX + deltaX,
                                    maxY: bounds.maxY + deltaY,
                                };

                                // Find alignment guidelines
                                const alignmentMatches = state.findAlignmentGuidelines?.(firstElementId, projectedBounds) ?? [];

                                // Find distance guidelines if enabled (pass alignment matches for 2-element detection)
                                const distanceMatches = (state.guidelines?.distanceEnabled && state.findDistanceGuidelines)
                                    ? state.findDistanceGuidelines(firstElementId, projectedBounds, alignmentMatches)
                                    : [];

                                // Update the guidelines state
                                if (state.updateGuidelinesState) {
                                    state.updateGuidelinesState({
                                        currentMatches: alignmentMatches,
                                        currentDistanceMatches: distanceMatches,
                                    });
                                }

                                // Apply sticky snap
                                if (state.checkStickySnap) {
                                    const snappedDelta = state.checkStickySnap(deltaX, deltaY, projectedBounds);
                                    deltaX = snappedDelta.x;
                                    deltaY = snappedDelta.y;
                                }
                            }
                        }
                    }

                    moveSelectedElements(deltaX, deltaY, 3);
                    setDragStart(point);
                }
            }
            return;
        }

        if (isSelecting && selectionStart) {
            updateSelectionRectangle(point);
        }

        // Handle subpath dragging
        if (isWorkingWithSubpaths() && dragStart && selectedSubpaths.length > 0) {
            const canvasStart = screenToCanvas(dragStart.x, dragStart.y);
            const canvasCurrent = screenToCanvas(point.x, point.y);
            const deltaX = canvasCurrent.x - canvasStart.x;
            const deltaY = canvasCurrent.y - canvasStart.y;
            moveSelectedSubpaths(deltaX, deltaY);
            setDragStart(point);
            return;
        }
    }, [
        activePlugin,
        screenToCanvas,
        isSpacePressed,
        dragStart,
        isSelecting,
        isDragging,
        setIsDragging,
        setHasDragMoved,
        isWorkingWithSubpaths,
        selectedSubpaths,
        moveSelectedSubpaths,
        moveSelectedElements,
        setDragStart,
        selectionStart,
        updateSelectionRectangle,
        selectedIds,
        beginSelectionRectangle,
        completeSelectionRectangle,
        eventBus,
        hasDragMoved,
    ]);

    // Handle pointer up
    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        const point = screenToCanvas(e.clientX, e.clientY);
        const target = (e.target as Element) ?? null;

        eventBus.emit('pointerup', {
            event: e,
            point,
            target,
            activePlugin,
            helpers: {
                beginSelectionRectangle,
                updateSelectionRectangle,
                completeSelectionRectangle,
                setIsDragging,
                setDragStart,
                setHasDragMoved,
            },
            state: {
                isSelecting,
                isDragging,
                dragStart,
                hasDragMoved,
            },
        });

        // Only handle dragging if it hasn't been handled by element click already
        if (isDragging) {
            setIsDragging(false);
            // Clear guidelines when drag ends
            const state = useCanvasStore.getState();
            if (state.clearGuidelines) {
                state.clearGuidelines();
            }
        }

        // Always clear global flag on pointer up (even if local isDragging is false)
        // This ensures the flag doesn't get stuck when clicking to add shapes, etc.
        useCanvasStore.getState().setIsDraggingElements(false);

        setDragStart(null);
        setHasDragMoved(false);

        if (isSelecting) {
            completeSelectionRectangle();
        }
    }, [
        activePlugin,
        isDragging,
        setIsDragging,
        setDragStart,
        setHasDragMoved,
        isSelecting,
        completeSelectionRectangle,
        screenToCanvas,
        updateSelectionRectangle,
        eventBus,
        dragStart,
        beginSelectionRectangle,
        hasDragMoved,
    ]);

    return {
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
    };
};
