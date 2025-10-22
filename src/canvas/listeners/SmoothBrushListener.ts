import { pluginManager } from '../../utils/pluginManager';
import type {
  CanvasService,
  CanvasServiceContext,
  CanvasServiceInstance,
} from '../../utils/pluginManager';
import type { Point } from '../../types';

export const SMOOTH_BRUSH_SERVICE_ID = 'smooth-brush-listener';

export interface SmoothBrushServiceState {
  activePlugin: string | null;
  isSmoothBrushActive: boolean;
  screenToCanvas: (x: number, y: number) => Point;
  emitPointerEvent: (
    type: 'pointerdown' | 'pointermove' | 'pointerup',
    event: PointerEvent,
    point: Point
  ) => void;
  getApplySmoothBrush: () => (x: number, y: number) => void;
  setSmoothBrushCursor: (point: Point) => void;
}

class SmoothBrushListenerService implements CanvasService<SmoothBrushServiceState> {
  readonly id = SMOOTH_BRUSH_SERVICE_ID;

  create({ svg }: CanvasServiceContext): CanvasServiceInstance<SmoothBrushServiceState> {
    let currentState: SmoothBrushServiceState | null = null;
    let isBrushing = false;
    let lastApplyTime = 0;
    let listenersAttached = false;

    // Reduced throttle for smoother continuous application while pointer is held down
    const APPLY_THROTTLE = 50; // Apply brush every 50ms for smooth continuous effect

    const getState = () => currentState;

    const handlePointerDown = (event: PointerEvent) => {
      const state = getState();
      if (!state || !state.isSmoothBrushActive || state.activePlugin !== 'edit') {
        return;
      }

      if (event.button !== 0) {
        return;
      }

      const point = state.screenToCanvas(event.clientX, event.clientY);
      state.emitPointerEvent('pointerdown', event, point);
      
      // Capture pointer to ensure we receive move and up events
      if (event.target && 'setPointerCapture' in event.target) {
        (event.target as Element).setPointerCapture(event.pointerId);
      }
      
      isBrushing = true;
      lastApplyTime = 0;
      // Apply brush immediately on pointer down
      const applySmoothBrush = state.getApplySmoothBrush();
      applySmoothBrush(point.x, point.y);
      lastApplyTime = Date.now();
    };

    const handlePointerMove = (event: PointerEvent) => {
      const state = getState();
      if (!state || state.activePlugin !== 'edit') {
        return;
      }

      const point = state.screenToCanvas(event.clientX, event.clientY);
      state.emitPointerEvent('pointermove', event, point);
      state.setSmoothBrushCursor(point);

      // When brushing is active and smooth brush is on, continuously apply brush while pointer moves
      if (!isBrushing || !state.isSmoothBrushActive) {
        return;
      }

      const now = Date.now();
      // Apply brush continuously as pointer moves (with throttle to prevent performance issues)
      if (now - lastApplyTime >= APPLY_THROTTLE) {
        const applySmoothBrush = state.getApplySmoothBrush();
        applySmoothBrush(point.x, point.y);
        lastApplyTime = now;
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      const state = getState();
      if (!state || state.activePlugin !== 'edit') {
        return;
      }

      const point = state.screenToCanvas(event.clientX, event.clientY);
      state.emitPointerEvent('pointerup', event, point);

      // Release pointer capture
      if (event.target && 'releasePointerCapture' in event.target) {
        try {
          (event.target as Element).releasePointerCapture(event.pointerId);
        } catch {
          // Ignore errors if capture was already released
        }
      }

      if (!isBrushing) {
        return;
      }

      isBrushing = false;
      lastApplyTime = 0;
    };

    const attachListeners = () => {
      if (listenersAttached) {
        return;
      }

      svg.addEventListener('pointerdown', handlePointerDown, { passive: true });
      svg.addEventListener('pointermove', handlePointerMove, { passive: true });
      svg.addEventListener('pointerup', handlePointerUp, { passive: true });
      svg.addEventListener('pointercancel', handlePointerUp as EventListener, { passive: true });
      listenersAttached = true;
    };

    const detachListeners = () => {
      if (!listenersAttached) {
        return;
      }

      svg.removeEventListener('pointerdown', handlePointerDown);
      svg.removeEventListener('pointermove', handlePointerMove);
      svg.removeEventListener('pointerup', handlePointerUp);
      svg.removeEventListener('pointercancel', handlePointerUp as EventListener);
      listenersAttached = false;
    };

    return {
      update: (state: SmoothBrushServiceState) => {
        currentState = state;

        if (state.activePlugin === 'edit' && state.isSmoothBrushActive) {
          attachListeners();
          // Don't reset isBrushing here - let it maintain its state during brushing
        } else {
          detachListeners();
          // Only reset isBrushing when we're actually leaving edit mode or deactivating brush
          isBrushing = false;
          lastApplyTime = 0;
        }
      },
      dispose: () => {
        detachListeners();
        currentState = null;
        isBrushing = false;
        lastApplyTime = 0;
      },
    };
  }
}

pluginManager.registerCanvasService(new SmoothBrushListenerService());
