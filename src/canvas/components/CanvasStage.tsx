import React, { type RefObject } from 'react';
import { CanvasLayers } from './CanvasLayers';
import { pluginManager } from '../../utils/pluginManager';
import type { CanvasSize } from '../hooks/useDynamicCanvasSize';
import type { CanvasElement } from '../../types';
import type { CanvasLayerContext } from '../../types/plugins';

export interface CanvasStageProps {
  svgRef: RefObject<SVGSVGElement | null>;
  canvasSize: CanvasSize;
  getViewBoxString: (size: CanvasSize) => string;
  isSpacePressed: boolean;
  currentMode: string | null;
  sortedElements: CanvasElement[];
  renderElement: (element: CanvasElement) => React.ReactNode;
  canvasLayerContext: CanvasLayerContext;
  handlePointerDown: (event: React.PointerEvent<SVGSVGElement>) => void;
  handlePointerMove: (event: React.PointerEvent<SVGSVGElement>) => void;
  handlePointerUp: (event: React.PointerEvent<SVGSVGElement>) => void;
  handleCanvasDoubleClick?: (event: React.MouseEvent<SVGSVGElement>) => void;
  handleCanvasTouchEnd?: (event: React.TouchEvent<SVGSVGElement>) => void;
  handleWheel?: (event: React.WheelEvent<SVGSVGElement>) => void;
}

/**
 * Presentational component that renders the SVG canvas and its layers.
 * This component is purely presentational and doesn't manage any state.
 */
export const CanvasStage: React.FC<CanvasStageProps> = ({
  svgRef,
  canvasSize,
  getViewBoxString,
  isSpacePressed,
  currentMode,
  sortedElements,
  renderElement,
  canvasLayerContext,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  handleCanvasDoubleClick,
  handleCanvasTouchEnd,
  handleWheel,
}) => {
  return (
    <svg
      ref={svgRef}
      width={canvasSize.width}
      height={canvasSize.height}
      viewBox={getViewBoxString(canvasSize)}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        cursor: (isSpacePressed || currentMode === 'pan') ? 'grabbing' :
          pluginManager.getCursor(currentMode || 'select')
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      {...(handleCanvasDoubleClick && { onDoubleClick: handleCanvasDoubleClick })}
      {...(handleCanvasTouchEnd && { onTouchEnd: handleCanvasTouchEnd })}
      {...(handleWheel && { onWheel: handleWheel })}
    >
      {/* Sort elements by zIndex */}
      {sortedElements.map(renderElement)}
      <CanvasLayers context={canvasLayerContext} />
    </svg>
  );
};
