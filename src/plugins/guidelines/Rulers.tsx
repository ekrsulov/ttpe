import React, { useCallback, useEffect, useRef } from 'react';
import { Box, useColorModeValue } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { RULER_SIZE } from './constants';

interface RulersProps {
  width: number;
  height: number;
  viewport: {
    zoom: number;
    panX: number;
    panY: number;
  };
}

/**
 * Rulers component that displays horizontal and vertical rulers
 * Allows dragging to create manual guides
 */
export const Rulers: React.FC<RulersProps> = ({ width, height, viewport }) => {
  const rulerBgColor = useColorModeValue('gray.100', 'gray.800');
  const rulerTextColor = useColorModeValue('gray.600', 'gray.400');
  const rulerTickColor = useColorModeValue('gray.400', 'gray.500');
  const rulerBorderColor = useColorModeValue('gray.300', 'gray.600');
  
  const horizontalRulerRef = useRef<HTMLCanvasElement>(null);
  const verticalRulerRef = useRef<HTMLCanvasElement>(null);
  
  const guidelines = useCanvasStore(state => state.guidelines);
  const startDraggingGuide = useCanvasStore(state => state.startDraggingGuide);
  const updateDraggingGuide = useCanvasStore(state => state.updateDraggingGuide);
  const finishDraggingGuide = useCanvasStore(state => state.finishDraggingGuide);
  const cancelDraggingGuide = useCanvasStore(state => state.cancelDraggingGuide);

  // Calculate tick spacing based on zoom
  const getTickSpacing = useCallback(() => {
    const zoom = viewport.zoom;
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
  }, [viewport.zoom]);

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
    ctx.fillStyle = rulerBgColor.includes('gray.100') ? '#f7fafc' : '#1a202c';
    ctx.fillRect(0, 0, width, RULER_SIZE);
    
    // Draw ticks
    const spacing = getTickSpacing();
    const { zoom, panX } = viewport;
    
    // Calculate visible range in canvas coordinates
    const startX = -panX / zoom;
    const endX = (width - panX) / zoom;
    
    // Find first tick
    const firstTick = Math.floor(startX / spacing) * spacing;
    
    ctx.fillStyle = rulerTextColor.includes('gray.600') ? '#718096' : '#a0aec0';
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    
    for (let canvasX = firstTick; canvasX <= endX; canvasX += spacing) {
      const screenX = canvasX * zoom + panX;
      
      // Major tick
      ctx.strokeStyle = rulerTickColor.includes('gray.400') ? '#a0aec0' : '#718096';
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
    ctx.strokeStyle = rulerBorderColor.includes('gray.300') ? '#e2e8f0' : '#4a5568';
    ctx.beginPath();
    ctx.moveTo(0, RULER_SIZE - 0.5);
    ctx.lineTo(width, RULER_SIZE - 0.5);
    ctx.stroke();
  }, [width, viewport, getTickSpacing, rulerBgColor, rulerTextColor, rulerTickColor, rulerBorderColor]);

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
    ctx.fillStyle = rulerBgColor.includes('gray.100') ? '#f7fafc' : '#1a202c';
    ctx.fillRect(0, 0, RULER_SIZE, height);
    
    // Draw ticks
    const spacing = getTickSpacing();
    const { zoom, panY } = viewport;
    
    // Calculate visible range in canvas coordinates
    const startY = -panY / zoom;
    const endY = (height - panY) / zoom;
    
    // Find first tick
    const firstTick = Math.floor(startY / spacing) * spacing;
    
    ctx.fillStyle = rulerTextColor.includes('gray.600') ? '#718096' : '#a0aec0';
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    
    for (let canvasY = firstTick; canvasY <= endY; canvasY += spacing) {
      const screenY = canvasY * zoom + panY;
      
      // Major tick
      ctx.strokeStyle = rulerTickColor.includes('gray.400') ? '#a0aec0' : '#718096';
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
    ctx.strokeStyle = rulerBorderColor.includes('gray.300') ? '#e2e8f0' : '#4a5568';
    ctx.beginPath();
    ctx.moveTo(RULER_SIZE - 0.5, 0);
    ctx.lineTo(RULER_SIZE - 0.5, height);
    ctx.stroke();
  }, [height, viewport, getTickSpacing, rulerBgColor, rulerTextColor, rulerTickColor, rulerBorderColor]);

  // Handle horizontal ruler drag
  const handleHorizontalMouseDown = useCallback((e: React.MouseEvent) => {
    if (!guidelines?.manualGuidesEnabled) return;
    
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const screenY = e.clientY - rect.top + RULER_SIZE;
    const canvasY = (screenY - viewport.panY) / viewport.zoom;
    
    startDraggingGuide?.('horizontal', canvasY);
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newScreenY = moveEvent.clientY;
      const newCanvasY = (newScreenY - viewport.panY) / viewport.zoom;
      updateDraggingGuide?.(newCanvasY);
    };
    
    const handleMouseUp = () => {
      finishDraggingGuide?.();
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [guidelines?.manualGuidesEnabled, viewport, startDraggingGuide, updateDraggingGuide, finishDraggingGuide]);

  // Handle vertical ruler drag
  const handleVerticalMouseDown = useCallback((e: React.MouseEvent) => {
    if (!guidelines?.manualGuidesEnabled) return;
    
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const screenX = e.clientX - rect.left + RULER_SIZE;
    const canvasX = (screenX - viewport.panX) / viewport.zoom;
    
    startDraggingGuide?.('vertical', canvasX);
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newScreenX = moveEvent.clientX;
      const newCanvasX = (newScreenX - viewport.panX) / viewport.zoom;
      updateDraggingGuide?.(newCanvasX);
    };
    
    const handleMouseUp = () => {
      finishDraggingGuide?.();
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [guidelines?.manualGuidesEnabled, viewport, startDraggingGuide, updateDraggingGuide, finishDraggingGuide]);

  // Handle escape to cancel dragging
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && guidelines?.isDraggingGuide) {
        cancelDraggingGuide?.();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [guidelines?.isDraggingGuide, cancelDraggingGuide]);

  if (!guidelines?.enabled) {
    return null;
  }

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
        cursor={guidelines?.manualGuidesEnabled ? 'row-resize' : 'default'}
        onMouseDown={handleHorizontalMouseDown}
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
        cursor={guidelines?.manualGuidesEnabled ? 'col-resize' : 'default'}
        onMouseDown={handleVerticalMouseDown}
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
        bg={rulerBgColor}
        borderRight="1px solid"
        borderBottom="1px solid"
        borderColor={rulerBorderColor}
        zIndex={101}
      />
      
      {/* Dragging guide preview */}
      {guidelines?.isDraggingGuide && guidelines.draggingGuidePosition !== null && (
        <Box
          position="absolute"
          bg={guidelines.manualGuideColor || '#00BFFF'}
          opacity={0.7}
          pointerEvents="none"
          zIndex={102}
          style={guidelines.draggingGuideType === 'horizontal' ? {
            left: `${RULER_SIZE}px`,
            right: 0,
            top: `${guidelines.draggingGuidePosition * viewport.zoom + viewport.panY}px`,
            height: '1px',
          } : {
            top: `${RULER_SIZE}px`,
            bottom: 0,
            left: `${guidelines.draggingGuidePosition * viewport.zoom + viewport.panX}px`,
            width: '1px',
          }}
        />
      )}
    </>
  );
};
