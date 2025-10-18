import { useState, useMemo, useCallback, useEffect } from 'react';
import type React from 'react';
import { useSmoothBrushNativeListeners } from './useSmoothBrushNativeListeners';
import { SmoothBrushNativeService } from '../canvas/services/SmoothBrushNativeService';
import type { Point } from '../types';
import type { PencilPluginSlice } from '../plugins/pencil/slice';

export interface UseSmoothBrushIntegrationParams {
  svgRef: React.RefObject<SVGSVGElement | null>;
  currentMode: string;
  pencil: PencilPluginSlice['pencil'];
  viewportZoom: number;
  screenToCanvas: (screenX: number, screenY: number) => Point;
  emitPointerEvent: (
    type: 'pointerdown' | 'pointermove' | 'pointerup',
    event: PointerEvent,
    point: Point
  ) => void;
  startPath: (point: Point) => void;
  addPointToPath: (point: Point) => void;
  isSmoothBrushActive: boolean;
}

export interface UseSmoothBrushIntegrationReturn {
  smoothBrushCursor: Point;
  setSmoothBrushCursor: React.Dispatch<React.SetStateAction<Point>>;
  canvasServicesValue: {
    smoothBrushService: SmoothBrushNativeService;
    registerSmoothBrushService: (service: SmoothBrushNativeService) => void;
    resetSmoothBrushService: () => void;
  };
}

/**
 * Hook that encapsulates the smooth brush native integration.
 * Manages cursor state, service registration, and native listeners.
 */
export function useSmoothBrushIntegration(
  params: UseSmoothBrushIntegrationParams
): UseSmoothBrushIntegrationReturn {
  const {
    svgRef,
    currentMode,
    pencil,
    viewportZoom,
    screenToCanvas,
    emitPointerEvent,
    startPath,
    addPointToPath,
    isSmoothBrushActive,
  } = params;

  // Local state for smooth brush cursor position (not in store to avoid re-renders)
  const [smoothBrushCursor, setSmoothBrushCursor] = useState<Point>({ x: 0, y: 0 });

  // Setup native listeners for smooth brush
  useSmoothBrushNativeListeners({
    svgRef,
    activePlugin: currentMode,
    isSmoothBrushActive,
    screenToCanvas,
    emitPointerEvent,
    setSmoothBrushCursor,
  });

  // Service management
  const defaultSmoothBrushService = useMemo(
    () => new SmoothBrushNativeService(),
    []
  );

  const [smoothBrushServiceOverride, setSmoothBrushServiceOverride] = useState<SmoothBrushNativeService | null>(
    null
  );

  const activeSmoothBrushService = smoothBrushServiceOverride ?? defaultSmoothBrushService;

  const registerSmoothBrushService = useCallback((service: SmoothBrushNativeService) => {
    setSmoothBrushServiceOverride(service);
  }, []);

  const resetSmoothBrushService = useCallback(() => {
    setSmoothBrushServiceOverride(null);
  }, []);

  const canvasServicesValue = useMemo(
    () => ({
      smoothBrushService: activeSmoothBrushService,
      registerSmoothBrushService,
      resetSmoothBrushService,
    }),
    [activeSmoothBrushService, registerSmoothBrushService, resetSmoothBrushService]
  );

  // Attach smooth brush listeners to the service
  useEffect(() => {
    return activeSmoothBrushService.attachSmoothBrushListeners(svgRef, {
      activePlugin: currentMode,
      pencil,
      viewportZoom,
      screenToCanvas,
      emitPointerEvent,
      startPath,
      addPointToPath,
    });
  }, [
    activeSmoothBrushService,
    svgRef,
    currentMode,
    pencil,
    viewportZoom,
    screenToCanvas,
    emitPointerEvent,
    startPath,
    addPointToPath,
  ]);

  return {
    smoothBrushCursor,
    setSmoothBrushCursor,
    canvasServicesValue,
  };
}
