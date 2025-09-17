import React from 'react';
import { measurePath } from '../utils/measurementUtils';
import type { Point } from '../types';

interface CanvasRendererProps {
  viewport: any;
  selectedIds: string[];
  plugins: any;
  elements: any[];
  isSelecting: boolean;
  selectionStart: Point | null;
  selectionEnd: Point | null;
  isCreatingShape: boolean;
  shapeStart: Point | null;
  shapeEnd: Point | null;
  onElementClick: (elementId: string, e: React.PointerEvent) => void;
  onElementPointerDown: (elementId: string, e: React.PointerEvent) => void;
  onTransformationHandlerPointerDown: (e: React.PointerEvent, elementId: string, handler: string) => void;
  onTransformationHandlerPointerUp: (e: React.PointerEvent) => void;
}

export const CanvasRenderer: React.FC<CanvasRendererProps> = ({
  viewport,
  selectedIds,
  plugins,
  elements,
  isSelecting,
  selectionStart,
  selectionEnd,
  isCreatingShape,
  shapeStart,
  shapeEnd,
  onElementClick,
  onElementPointerDown,
  onTransformationHandlerPointerDown,
  onTransformationHandlerPointerUp,
}) => {
  // Render selection box for selected elements
  const renderSelectionBox = (element: typeof elements[0]) => {
    const bounds = getTransformedBounds(element);
    if (!bounds) return null;

    const isTransformationMode = plugins.transformation?.showTransform || false;
    const handlerSize = 8 / viewport.zoom;

    return (
      <g key={`selection-${element.id}`}>
        {/* Selection rectangle */}
        <rect
          x={bounds.minX}
          y={bounds.minY}
          width={bounds.maxX - bounds.minX}
          height={bounds.maxY - bounds.minY}
          fill="none"
          stroke="#ff6b35"
          strokeWidth={3 / viewport.zoom}
          strokeDasharray={`${6 / viewport.zoom} ${4 / viewport.zoom}`}
          pointerEvents="none"
        />

        {/* Transformation handlers */}
        {isTransformationMode && renderTransformationHandlers(bounds, element.id, handlerSize)}
      </g>
    );
  };

  const renderTransformationHandlers = (bounds: any, elementId: string, handlerSize: number) => (
    <>
      {/* Corner handlers */}
      <rect
        x={bounds.minX - handlerSize / 2}
        y={bounds.minY - handlerSize / 2}
        width={handlerSize}
        height={handlerSize}
        fill="#ff6b35"
        stroke="#fff"
        strokeWidth={1 / viewport.zoom}
        style={{ cursor: 'nw-resize' }}
        onPointerDown={(e) => onTransformationHandlerPointerDown(e, elementId, 'corner-tl')}
        onPointerUp={onTransformationHandlerPointerUp}
      />
      <rect
        x={bounds.maxX - handlerSize / 2}
        y={bounds.minY - handlerSize / 2}
        width={handlerSize}
        height={handlerSize}
        fill="#ff6b35"
        stroke="#fff"
        strokeWidth={1 / viewport.zoom}
        style={{ cursor: 'ne-resize' }}
        onPointerDown={(e) => onTransformationHandlerPointerDown(e, elementId, 'corner-tr')}
        onPointerUp={onTransformationHandlerPointerUp}
      />
      <rect
        x={bounds.minX - handlerSize / 2}
        y={bounds.maxY - handlerSize / 2}
        width={handlerSize}
        height={handlerSize}
        fill="#ff6b35"
        stroke="#fff"
        strokeWidth={1 / viewport.zoom}
        style={{ cursor: 'sw-resize' }}
        onPointerDown={(e) => onTransformationHandlerPointerDown(e, elementId, 'corner-bl')}
        onPointerUp={onTransformationHandlerPointerUp}
      />
      <rect
        x={bounds.maxX - handlerSize / 2}
        y={bounds.maxY - handlerSize / 2}
        width={handlerSize}
        height={handlerSize}
        fill="#ff6b35"
        stroke="#fff"
        strokeWidth={1 / viewport.zoom}
        style={{ cursor: 'se-resize' }}
        onPointerDown={(e) => onTransformationHandlerPointerDown(e, elementId, 'corner-br')}
        onPointerUp={onTransformationHandlerPointerUp}
      />
    </>
  );

  // Helper function to get transformed bounds
  const getTransformedBounds = (element: typeof elements[0]) => {
    if (element.type === 'path') {
      const pathData = element.data as import('../types').PathData;
      return measurePath(pathData.d, pathData.strokeWidth, viewport.zoom);
    }
    return null;
  };

  // Render elements
  const renderElement = (element: typeof elements[0]) => {
    const { data, type } = element;
    const isSelected = selectedIds.includes(element.id);

    switch (type) {
      case 'path': {
        const pathData = data as import('../types').PathData;

        return (
          <g key={element.id}>
            <path
              d={pathData.d}
              stroke={pathData.strokeColor}
              strokeWidth={pathData.strokeWidth}
              fill={pathData.fillColor}
              fillOpacity={pathData.fillOpacity}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              opacity={pathData.opacity}
              onPointerUp={(e) => onElementClick(element.id, e)}
              onPointerDown={(e) => onElementPointerDown(element.id, e)}
              style={{
                cursor: isSelected ? 'move' : 'pointer'
              }}
            />
            {isSelected && renderSelectionBox(element)}
          </g>
        );
      }
      default:
        return null;
    }
  };

  // Sort elements by zIndex
  const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <>
      {sortedElements.map(renderElement)}

      {/* Selection rectangle */}
      {isSelecting && selectionStart && selectionEnd && (
        <rect
          x={Math.min(selectionStart.x, selectionEnd.x)}
          y={Math.min(selectionStart.y, selectionEnd.y)}
          width={Math.abs(selectionEnd.x - selectionStart.x)}
          height={Math.abs(selectionEnd.y - selectionStart.y)}
          fill="rgba(0, 123, 255, 0.1)"
          stroke="#007bff"
          strokeWidth={1 / viewport.zoom}
          strokeDasharray={`${2 / viewport.zoom} ${2 / viewport.zoom}`}
        />
      )}

      {/* Shape preview */}
      {isCreatingShape && shapeStart && shapeEnd && renderShapePreview()}
    </>
  );

  function renderShapePreview() {
    const selectedShape = plugins.shape?.selectedShape || 'rectangle';
    const width = Math.abs(shapeEnd!.x - shapeStart!.x);
    const height = Math.abs(shapeEnd!.y - shapeStart!.y);
    const centerX = (shapeStart!.x + shapeEnd!.x) / 2;
    const centerY = (shapeStart!.y + shapeEnd!.y) / 2;

    let pathData = '';
    switch (selectedShape) {
      case 'square':
        const halfSize = Math.min(width, height) / 2;
        pathData = `M ${centerX - halfSize} ${centerY - halfSize} L ${centerX + halfSize} ${centerY - halfSize} L ${centerX + halfSize} ${centerY + halfSize} L ${centerX - halfSize} ${centerY + halfSize} Z`;
        break;
      case 'rectangle':
        pathData = `M ${shapeStart!.x} ${shapeStart!.y} L ${shapeEnd!.x} ${shapeStart!.y} L ${shapeEnd!.x} ${shapeEnd!.y} L ${shapeStart!.x} ${shapeEnd!.y} Z`;
        break;
      case 'circle':
        const radius = Math.min(width, height) / 2;
        const kappa = 0.552284749831;
        pathData = `M ${centerX - radius} ${centerY} C ${centerX - radius} ${centerY - radius * kappa} ${centerX - radius * kappa} ${centerY - radius} ${centerX} ${centerY - radius} C ${centerX + radius * kappa} ${centerY - radius} ${centerX + radius} ${centerY - radius * kappa} ${centerX + radius} ${centerY} C ${centerX + radius} ${centerY + radius * kappa} ${centerX + radius * kappa} ${centerY + radius} ${centerX} ${centerY + radius} C ${centerX - radius * kappa} ${centerY + radius} ${centerX - radius} ${centerY + radius * kappa} ${centerX - radius} ${centerY} Z`;
        break;
      case 'triangle':
        pathData = `M ${centerX} ${shapeStart!.y} L ${shapeEnd!.x} ${shapeEnd!.y} L ${shapeStart!.x} ${shapeEnd!.y} Z`;
        break;
    }

    return (
      <path
        d={pathData}
        stroke="#007bff"
        strokeWidth={1 / viewport.zoom}
        fill="none"
        strokeOpacity={0.7}
        strokeDasharray={`${2 / viewport.zoom} ${2 / viewport.zoom}`}
      />
    );
  }
};