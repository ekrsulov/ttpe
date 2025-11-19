import type { PluginHooksContext } from '../../../types/plugins';
import { useCanvasStore } from '../../../store/canvasStore';
import { usePencilDrawing } from './usePencilDrawing';
import { startPath, addPointToPath, finalizePath } from '../actions';

/**
 * Hook wrapper for pencil drawing functionality.
 * This is registered as a plugin hook contribution.
 */
export function usePencilDrawingHook(context: PluginHooksContext): void {
    const pencil = useCanvasStore(state => state.pencil);
    const defaultStrokeColor = useCanvasStore(state => state.settings.defaultStrokeColor);

    // Default pencil settings if not initialized
    const effectivePencil = pencil ?? {
        strokeWidth: 4,
        strokeColor: defaultStrokeColor,
        strokeOpacity: 1,
        fillColor: 'none',
        fillOpacity: 1,
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const,
        fillRule: 'nonzero' as const,
        strokeDasharray: 'none',
        reusePath: false,
        simplificationTolerance: 0,
    };

    usePencilDrawing({
        svgRef: context.svgRef,
        currentMode: context.activePlugin || 'select',
        pencil: effectivePencil,
        viewportZoom: context.viewportZoom,
        scaleStrokeWithZoom: context.scaleStrokeWithZoom,
        screenToCanvas: context.screenToCanvas,
        emitPointerEvent: context.emitPointerEvent,
        startPath: (point) => startPath(point, useCanvasStore.getState),
        addPointToPath: (point) => addPointToPath(point, useCanvasStore.getState),
        finalizePath: (points) => finalizePath(points, useCanvasStore.getState),
    });
}
