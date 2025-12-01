import { useCallback, useMemo } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import type { Point } from '../../types';
import { useCanvasEventBus } from '../CanvasEventBusContext';
import {
    buildPointerEventPayload,
    createPointerEventHelpers,
    createPointerEventState,
} from '../utils/pointerEventUtils';
import { pluginManager } from '../../utils/pluginManager';
import { DEFAULT_MODE } from '../../constants';

export interface CanvasPointerHandlersProps {
    screenToCanvas: (x: number, y: number) => Point;
    isSpacePressed: boolean;
    activePlugin: string | null;
    isSelecting: boolean;
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

    // Create memoized helpers and state builders
    const helpers = useMemo(() => createPointerEventHelpers({
        beginSelectionRectangle,
        updateSelectionRectangle,
        completeSelectionRectangle,
        setIsDragging,
        setDragStart,
        setHasDragMoved,
    }), [beginSelectionRectangle, updateSelectionRectangle, completeSelectionRectangle, setIsDragging, setDragStart, setHasDragMoved]);

    // Handle pointer down
    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        const point = screenToCanvas(e.clientX, e.clientY);
        const target = (e.target as Element) ?? null;

        if (isSpacePressed || pluginManager.isInPanMode()) {
            return;
        }

        const state = createPointerEventState({ isSelecting, isDragging, dragStart, hasDragMoved });
        eventBus.emit('pointerdown', buildPointerEventPayload({
            event: e,
            point,
            target,
            activePlugin,
            helpers,
            state,
        }));
    }, [
        activePlugin,
        screenToCanvas,
        isSpacePressed,
        eventBus,
        helpers,
        isSelecting,
        isDragging,
        dragStart,
        hasDragMoved,
    ]);

    // Handle pointer move
    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        const point = screenToCanvas(e.clientX, e.clientY);
        const target = (e.target as Element) ?? null;

        const state = createPointerEventState({ isSelecting, isDragging, dragStart, hasDragMoved });
        eventBus.emit('pointermove', buildPointerEventPayload({
            event: e,
            point,
            target,
            activePlugin,
            helpers,
            state,
        }));

        if (isSpacePressed && e.buttons === 1) {
            // Pan the canvas with spacebar + pointer button
            const deltaX = e.movementX;
            const deltaY = e.movementY;
            useCanvasStore.getState().pan(deltaX, deltaY);
            return;
        }

        // Check for potential element dragging (when we have dragStart but may not be isDragging yet)
        const currentDragStart = dragStart;

        if (currentDragStart && !isSelecting) {
            let deltaX = point.x - currentDragStart.x;
            let deltaY = point.y - currentDragStart.y;

            // Only start actual dragging if we've moved more than a threshold
            const shouldStartDragging = !isDragging && (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3);
            const shouldContinueDragging = isDragging && (Math.abs(deltaX) > 0.001 || Math.abs(deltaY) > 0.001);

            if (shouldStartDragging || shouldContinueDragging) {
                if (!isDragging) {
                    setIsDragging(true);
                    useCanvasStore.getState().setIsDraggingElements(true);
                }
                setHasDragMoved(true);

                // Check if we're working with subpaths
                if (isWorkingWithSubpaths() && activePlugin !== DEFAULT_MODE) {
                    if (currentDragStart && selectedSubpaths.length > 0) {
                        moveSelectedSubpaths(deltaX, deltaY);
                        setDragStart(point);
                    }
                    return;
                }

                // Apply element drag modifiers from plugins (e.g., guidelines snapping)
                const elementDragModifiers = pluginManager.getElementDragModifiers();
                const viewport = useCanvasStore.getState().viewport;
                const dragContext = {
                    selectedIds,
                    originalDelta: { x: deltaX, y: deltaY },
                    viewport,
                };
                
                for (const modifier of elementDragModifiers) {
                    const result = modifier.modify(deltaX, deltaY, dragContext);
                    if (result.applied) {
                        deltaX = result.deltaX;
                        deltaY = result.deltaY;
                    }
                }

                moveSelectedElements(deltaX, deltaY, 3);
                setDragStart(point);
            }
            return;
        }

        if (isSelecting) {
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
        updateSelectionRectangle,
        selectedIds,
        helpers,
        eventBus,
        hasDragMoved,
    ]);

    // Handle pointer up
    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        const point = screenToCanvas(e.clientX, e.clientY);
        const target = (e.target as Element) ?? null;

        const state = createPointerEventState({ isSelecting, isDragging, dragStart, hasDragMoved });
        eventBus.emit('pointerup', buildPointerEventPayload({
            event: e,
            point,
            target,
            activePlugin,
            helpers,
            state,
        }));

        // Only handle dragging if it hasn't been handled by element click already
        if (isDragging) {
            setIsDragging(false);
            
            // Call onDragEnd on all element drag modifiers
            const elementDragModifiers = pluginManager.getElementDragModifiers();
            for (const modifier of elementDragModifiers) {
                modifier.onDragEnd?.();
            }
            
            // Notify plugins that element drag ended (for cache invalidation, etc.)
            pluginManager.executeLifecycleAction('onDragEnd');
        }

        // Always clear global flag on pointer up
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
        helpers,
        eventBus,
        dragStart,
        hasDragMoved,
    ]);

    return {
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
    };
};
