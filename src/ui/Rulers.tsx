import React, { useCallback, useEffect, useRef } from 'react';
import { Box } from '@chakra-ui/react';
import { useThemeColors } from '../hooks';

/** Standard ruler size in pixels */
export const RULER_SIZE = 20;

export interface RulerViewport {
  zoom: number;
  panX: number;
  panY: number;
}

export interface RulersProps {
  /** Width of the ruler area */
  width: number;
  /** Height of the ruler area */
  height: number;
  /** Viewport state for coordinate transformation */
  viewport: RulerViewport;
  /** Whether rulers are interactive (can drag to create guides) */
  interactive?: boolean;
  /** Callback when starting to drag from horizontal ruler */
  onHorizontalDragStart?: (canvasY: number) => void;
  /** Callback when dragging position updates */
  onDragUpdate?: (position: number) => void;
  /** Callback when drag finishes */
  onDragEnd?: () => void;
  /** Callback when drag is cancelled (e.g., Escape key) */
  onDragCancel?: () => void;
  /** Callback when starting to drag from vertical ruler */
  onVerticalDragStart?: (canvasX: number) => void;
  /** Whether currently dragging a guide */
  isDragging?: boolean;
  /** Type of guide being dragged */
  draggingType?: 'horizontal' | 'vertical' | null;
  /** Position of guide being dragged (in canvas coordinates) */
  draggingPosition?: number | null;
  /** Color of the dragging preview */
  draggingPreviewColor?: string;
}

/**
 * Calculate tick spacing based on zoom level.
 * Returns a "nice" round number for tick intervals.
 */
function getTickSpacing(zoom: number): number {
  const targetPixels = 50; // Target screen pixels between major ticks
  const canvasUnits = targetPixels / zoom;
  
  // Find a nice round number
  const magnitudes = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
  for (const mag of magnitudes) {
    if (canvasUnits <= mag) {
      return mag;
    }
  }
  return 1000;
}

/**
 * Rulers component that displays horizontal and vertical rulers.
 * Can optionally allow dragging to create guides when interactive.
 */
export const Rulers: React.FC<RulersProps> = ({
  width,
  height,
  viewport,
  interactive = false,
  onHorizontalDragStart,
  onVerticalDragStart,
  onDragUpdate,
  onDragEnd,
  onDragCancel,
  isDragging = false,
  draggingType = null,
  draggingPosition = null,
  draggingPreviewColor = '#00BFFF',
}) => {
  const { ruler } = useThemeColors();
  
  const horizontalRulerRef = useRef<HTMLCanvasElement>(null);
  const verticalRulerRef = useRef<HTMLCanvasElement>(null);

  // Calculate tick spacing based on zoom
  const spacing = getTickSpacing(viewport.zoom);

  // Draw horizontal ruler
  useEffect(() => {
    const canvas = horizontalRulerRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = RULER_SIZE * dpr;
    ctx.scale(dpr, dpr);
    
    // Clear
    ctx.fillStyle = ruler.bgHex;
    ctx.fillRect(0, 0, width, RULER_SIZE);
    
    const { zoom, panX } = viewport;
    
    // Calculate visible range in canvas coordinates
    const startX = -panX / zoom;
    const endX = (width - panX) / zoom;
    
    // Find first tick
    const firstTick = Math.floor(startX / spacing) * spacing;
    
    ctx.fillStyle = ruler.textHex;
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    
    for (let canvasX = firstTick; canvasX <= endX; canvasX += spacing) {
      const screenX = canvasX * zoom + panX;
      
      // Major tick
      ctx.strokeStyle = ruler.tickHex;
      ctx.beginPath();
      ctx.moveTo(screenX, RULER_SIZE - 8);
      ctx.lineTo(screenX, RULER_SIZE);
      ctx.stroke();
      
      // Label
      ctx.fillText(Math.round(canvasX).toString(), screenX, RULER_SIZE - 10);
      
      // Minor ticks
      const minorSpacing = spacing / 5;
      for (let i = 1; i < 5; i++) {
        const minorX = (canvasX + minorSpacing * i) * zoom + panX;
        if (minorX > 0 && minorX < width) {
          ctx.beginPath();
          ctx.moveTo(minorX, RULER_SIZE - 4);
          ctx.lineTo(minorX, RULER_SIZE);
          ctx.stroke();
        }
      }
    }
    
    // Border
    ctx.strokeStyle = ruler.borderHex;
    ctx.beginPath();
    ctx.moveTo(0, RULER_SIZE - 0.5);
    ctx.lineTo(width, RULER_SIZE - 0.5);
    ctx.stroke();
  }, [width, viewport, spacing, ruler]);

  // Draw vertical ruler
  useEffect(() => {
    const canvas = verticalRulerRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    canvas.width = RULER_SIZE * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    
    // Clear
    ctx.fillStyle = ruler.bgHex;
    ctx.fillRect(0, 0, RULER_SIZE, height);
    
    const { zoom, panY } = viewport;
    
    // Calculate visible range in canvas coordinates
    const startY = -panY / zoom;
    const endY = (height - panY) / zoom;
    
    // Find first tick
    const firstTick = Math.floor(startY / spacing) * spacing;
    
    ctx.fillStyle = ruler.textHex;
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    
    for (let canvasY = firstTick; canvasY <= endY; canvasY += spacing) {
      const screenY = canvasY * zoom + panY;
      
      // Major tick
      ctx.strokeStyle = ruler.tickHex;
      ctx.beginPath();
      ctx.moveTo(RULER_SIZE - 8, screenY);
      ctx.lineTo(RULER_SIZE, screenY);
      ctx.stroke();
      
      // Label (rotated)
      ctx.save();
      ctx.translate(RULER_SIZE - 10, screenY);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(Math.round(canvasY).toString(), 0, 0);
      ctx.restore();
      
      // Minor ticks
      const minorSpacing = spacing / 5;
      for (let i = 1; i < 5; i++) {
        const minorY = (canvasY + minorSpacing * i) * zoom + panY;
        if (minorY > 0 && minorY < height) {
          ctx.beginPath();
          ctx.moveTo(RULER_SIZE - 4, minorY);
          ctx.lineTo(RULER_SIZE, minorY);
          ctx.stroke();
        }
      }
    }
    
    // Border
    ctx.strokeStyle = ruler.borderHex;
    ctx.beginPath();
    ctx.moveTo(RULER_SIZE - 0.5, 0);
    ctx.lineTo(RULER_SIZE - 0.5, height);
    ctx.stroke();
  }, [height, viewport, spacing, ruler]);

  // Handle horizontal ruler drag (using pointer events for desktop + mobile support)
  const handleHorizontalPointerDown = useCallback((e: React.PointerEvent) => {
    if (!interactive || !onHorizontalDragStart) return;
    
    // Capture pointer for reliable tracking
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const screenY = e.clientY - rect.top + RULER_SIZE;
    const canvasY = (screenY - viewport.panY) / viewport.zoom;
    
    onHorizontalDragStart(canvasY);
    
    const handlePointerMove = (moveEvent: PointerEvent) => {
      const newScreenY = moveEvent.clientY;
      const newCanvasY = (newScreenY - viewport.panY) / viewport.zoom;
      onDragUpdate?.(newCanvasY);
    };
    
    const handlePointerUp = (upEvent: PointerEvent) => {
      (upEvent.target as HTMLElement).releasePointerCapture(upEvent.pointerId);
      onDragEnd?.();
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);
    };
    
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerUp);
  }, [interactive, viewport, onHorizontalDragStart, onDragUpdate, onDragEnd]);

  // Handle vertical ruler drag (using pointer events for desktop + mobile support)
  const handleVerticalPointerDown = useCallback((e: React.PointerEvent) => {
    if (!interactive || !onVerticalDragStart) return;
    
    // Capture pointer for reliable tracking
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const screenX = e.clientX - rect.left + RULER_SIZE;
    const canvasX = (screenX - viewport.panX) / viewport.zoom;
    
    onVerticalDragStart(canvasX);
    
    const handlePointerMove = (moveEvent: PointerEvent) => {
      const newScreenX = moveEvent.clientX;
      const newCanvasX = (newScreenX - viewport.panX) / viewport.zoom;
      onDragUpdate?.(newCanvasX);
    };
    
    const handlePointerUp = (upEvent: PointerEvent) => {
      (upEvent.target as HTMLElement).releasePointerCapture(upEvent.pointerId);
      onDragEnd?.();
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);
    };
    
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerUp);
  }, [interactive, viewport, onVerticalDragStart, onDragUpdate, onDragEnd]);

  // Handle escape to cancel dragging
  useEffect(() => {
    if (!isDragging || !onDragCancel) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDragCancel();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDragging, onDragCancel]);

  return (
    <>
      {/* Horizontal ruler */}
      <Box
        position="absolute"
        top={0}
        left={`${RULER_SIZE}px`}
        width={`calc(100% - ${RULER_SIZE}px)`}
        height={`${RULER_SIZE}px`}
        zIndex={100}
        cursor={interactive ? 'row-resize' : 'default'}
        onPointerDown={handleHorizontalPointerDown}
        style={{ touchAction: 'none' }}
      >
        <canvas
          ref={horizontalRulerRef}
          style={{
            width: '100%',
            height: `${RULER_SIZE}px`,
            pointerEvents: 'none',
          }}
        />
      </Box>
      
      {/* Vertical ruler */}
      <Box
        position="absolute"
        top={`${RULER_SIZE}px`}
        left={0}
        width={`${RULER_SIZE}px`}
        height={`calc(100% - ${RULER_SIZE}px)`}
        zIndex={100}
        cursor={interactive ? 'col-resize' : 'default'}
        onPointerDown={handleVerticalPointerDown}
        style={{ touchAction: 'none' }}
      >
        <canvas
          ref={verticalRulerRef}
          style={{
            width: `${RULER_SIZE}px`,
            height: '100%',
            pointerEvents: 'none',
          }}
        />
      </Box>
      
      {/* Corner box */}
      <Box
        position="absolute"
        top={0}
        left={0}
        width={`${RULER_SIZE}px`}
        height={`${RULER_SIZE}px`}
        bg={ruler.bg}
        borderRight="1px solid"
        borderBottom="1px solid"
        borderColor={ruler.borderColor}
        zIndex={101}
      />
      
      {/* Dragging guide preview */}
      {isDragging && draggingPosition !== null && (
        <Box
          position="absolute"
          bg={draggingPreviewColor}
          opacity={0.7}
          pointerEvents="none"
          zIndex={102}
          style={draggingType === 'horizontal' ? {
            left: `${RULER_SIZE}px`,
            right: 0,
            top: `${draggingPosition * viewport.zoom + viewport.panY}px`,
            height: '1px',
          } : {
            top: `${RULER_SIZE}px`,
            bottom: 0,
            left: `${draggingPosition * viewport.zoom + viewport.panX}px`,
            width: '1px',
          }}
        />
      )}
    </>
  );
};
