import { useCallback } from 'react';
import { useDoubleTap } from './useDoubleTap';
import { useCanvasEventBus } from '../CanvasEventBusContext';
import { createSyntheticMouseEvent } from '../utils/touchEventUtils';
import { isCanvasEmptySpace } from '../utils/domUtils';

export interface CanvasTouchHandlersProps {
    activePlugin: string | null;
    handleElementDoubleClick: (elementId: string, e: React.MouseEvent<Element>) => void;
    handleSubpathDoubleClick: (elementId: string, subpathIndex: number, e: React.MouseEvent<Element>) => void;
}

export interface CanvasTouchHandlers {
    handleElementTouchEnd: (elementId: string, e: React.TouchEvent<Element>) => void;
    handleSubpathTouchEnd: (elementId: string, subpathIndex: number, e: React.TouchEvent<SVGPathElement>) => void;
    handleCanvasTouchEnd: (e: React.TouchEvent<SVGSVGElement>) => void;
}

/**
 * Hook for handling mobile touch events and double-tap detection
 */
export const useCanvasTouchHandlers = (
    props: CanvasTouchHandlersProps
): CanvasTouchHandlers => {
    const { activePlugin, handleElementDoubleClick, handleSubpathDoubleClick } = props;
    const eventBus = useCanvasEventBus();

    // Double tap detection hook
    const {
        handleElementTouchEnd: detectElementDoubleTap,
        handleSubpathTouchEnd: detectSubpathDoubleTap,
        handleCanvasTouchEnd: detectCanvasDoubleTap
    } = useDoubleTap();

    // Handle element touch end for double tap detection
    const handleElementTouchEnd = useCallback((elementId: string, e: React.TouchEvent<Element>) => {
        // Detect if this is a double tap
        const isDoubleTap = detectElementDoubleTap(elementId, e);

        if (!isDoubleTap) {
            // Single tap - do nothing special
            return;
        }

        // Double tap detected - prevent default and create synthetic mouse event
        e.preventDefault();
        e.stopPropagation();

        try {
            const syntheticEvent = createSyntheticMouseEvent(e);
            handleElementDoubleClick(elementId, syntheticEvent);
        } catch (_error) {
            // Touch not found, ignore
            return;
        }
    }, [detectElementDoubleTap, handleElementDoubleClick]);

    // Handle canvas touch end for double tap on empty space
    const handleCanvasTouchEnd = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
        // Detect if this is a double tap on empty space
        const isDoubleTap = detectCanvasDoubleTap(e);

        if (!isDoubleTap) {
            // Single tap - do nothing special
            return;
        }

        // Double tap detected on empty space
        if (isCanvasEmptySpace(e.target)) {
            e.preventDefault();
            e.stopPropagation();

            try {
                const syntheticEvent = createSyntheticMouseEvent(e);
                eventBus.emit('canvasDoubleClick', {
                    event: syntheticEvent,
                    activePlugin
                });
            } catch (_error) {
                // Touch not found, ignore
                return;
            }
        }
    }, [detectCanvasDoubleTap, activePlugin, eventBus]);

    // Handle subpath touch end for double tap detection
    const handleSubpathTouchEnd = useCallback((elementId: string, subpathIndex: number, e: React.TouchEvent<SVGPathElement>) => {
        // Detect if this is a double tap on a subpath
        const isDoubleTap = detectSubpathDoubleTap(elementId, subpathIndex, e);

        if (!isDoubleTap) {
            // Single tap - do nothing special
            return;
        }

        // Double tap detected - prevent default and create synthetic mouse event
        e.preventDefault();
        e.stopPropagation();

        try {
            const syntheticEvent = createSyntheticMouseEvent(e);
            handleSubpathDoubleClick(elementId, subpathIndex, syntheticEvent);
        } catch (_error) {
            // Touch not found, ignore
            return;
        }
    }, [detectSubpathDoubleTap, handleSubpathDoubleClick]);

    return {
        handleElementTouchEnd,
        handleSubpathTouchEnd,
        handleCanvasTouchEnd,
    };
};
