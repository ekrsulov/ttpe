import React from 'react';
import { measurePath } from '../utils/measurementUtils';
import { commandsToString } from '../utils/pathParserUtils';
import type { Point, CanvasElement, ControlPointInfo, Command } from '../types';
import { useCanvasDragInteractions } from '../hooks/useCanvasDragInteractions';
import { SelectionOverlay, SubpathSelectionOverlay, EditPointsOverlay, SubpathOverlay, ShapePreview } from './overlays';

interface CanvasRendererProps {
  viewport: {
    zoom: number;
    panX: number;
    panY: number;
  };
  selectedIds: string[];
  selectedCommands: Array<{
    elementId: string;
    commandIndex: number;
    pointIndex: number;
  }>;
  selectedSubpaths: Array<{
    elementId: string;
    subpathIndex: number;
  }>;
  draggingSubpaths: {
    isDragging: boolean;
    initialPositions: Array<{
      elementId: string;
      subpathIndex: number;
      bounds: { minX: number; minY: number; maxX: number; maxY: number };
      originalCommands: Command[];
    }>;
    startX: number;
    startY: number;
    currentX?: number;
    currentY?: number;
    deltaX?: number;
    deltaY?: number;
  } | null;
  transformation: {
    showCoordinates?: boolean;
    showRulers?: boolean;
  };
  shape: {
    selectedShape?: string;
  };
  elements: Array<{
    id: string;
    type: string;
    data: unknown;
    zIndex: number;
  }>;
  activePlugin: string | null;
  editingPoint: {
    elementId: string;
    commandIndex: number;
    pointIndex: number;
    isDragging: boolean;
    offsetX: number;
    offsetY: number;
  } | null;
  draggingSelection: {
    isDragging: boolean;
    draggedPoint: { elementId: string; commandIndex: number; pointIndex: number } | null;
    initialPositions: Array<{
      elementId: string;
      commandIndex: number;
      pointIndex: number;
      x: number;
      y: number;
    }>;
    startX: number;
    startY: number;
  } | null;
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
  onStartDraggingPoint: (elementId: string, commandIndex: number, pointIndex: number, offsetX: number, offsetY: number) => void;
  onUpdateDraggingPoint: (x: number, y: number) => void;
  onStopDraggingPoint: () => void;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  onSelectCommand: (command: { elementId: string; commandIndex: number; pointIndex: number }, multiSelect?: boolean) => void;
  onSelectSubpath: (elementId: string, subpathIndex: number, multiSelect?: boolean) => void;
  onStartDraggingSubpaths: (canvasX: number, canvasY: number) => void;
  onUpdateDraggingSubpaths: (canvasX: number, canvasY: number) => void;
  onStopDraggingSubpaths: () => void;
  getTransformationBounds: () => { minX: number; minY: number; maxX: number; maxY: number } | null;
  isWorkingWithSubpaths: () => boolean;
  getFilteredEditablePoints: (elementId: string) => Array<{
    commandIndex: number;
    pointIndex: number;
    x: number;
    y: number;
    isControl: boolean;
  }>;
  getControlPointInfo: (elementId: string, commandIndex: number, pointIndex: number) => ControlPointInfo | null;
  smoothBrush: {
    radius: number;
    strength: number;
    isActive: boolean;
    cursorX: number;
    cursorY: number;
    affectedPoints: Array<{
      commandIndex: number;
      pointIndex: number;
      x: number;
      y: number;
    }>;
  };
}

export const CanvasRenderer: React.FC<CanvasRendererProps> = ({
  viewport,
  selectedIds,
  selectedCommands,
  selectedSubpaths,
  draggingSubpaths,
  transformation,
  shape,
  elements,
  activePlugin,
  editingPoint,
  draggingSelection,
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
  onStartDraggingPoint,
  onUpdateDraggingPoint,
  onStopDraggingPoint,
  onUpdateElement,
  onSelectCommand,
  onSelectSubpath,
  onStartDraggingSubpaths,
  onUpdateDraggingSubpaths,
  onStopDraggingSubpaths,
  isWorkingWithSubpaths,
  getFilteredEditablePoints,
  getControlPointInfo,
  smoothBrush,
}) => {
  // Use the custom hook for drag interactions
  const { dragPosition } = useCanvasDragInteractions({
    dragState: {
      editingPoint,
      draggingSelection,
      draggingSubpaths
    },
    viewport,
    elements: elements as CanvasElement[],
    smoothBrush,
    callbacks: {
      onUpdateDraggingPoint,
      onStopDraggingPoint,
      onUpdateDraggingSubpaths,
      onStopDraggingSubpaths,
      onUpdateElement,
      getControlPointInfo
    }
  });

  // Helper function to get transformed bounds
  const getTransformedBounds = (element: typeof elements[0]) => {
    if (element.type === 'path') {
      const pathData = element.data as import('../types').PathData;
      return measurePath(pathData.subPaths, pathData.strokeWidth, viewport.zoom);
    }
    return null;
  };

  // Render edit points for path editing - moved to EditPointsOverlay

  // Render elements
  const renderElement = (element: typeof elements[0]) => {
    const { data, type } = element;
    const isSelected = selectedIds.includes(element.id);

    switch (type) {
      case 'path': {
        const pathData = data as import('../types').PathData;
        // For pencil paths, if strokeColor is 'none', render with black
        const effectiveStrokeColor = pathData.isPencilPath && pathData.strokeColor === 'none'
          ? '#000000'
          : pathData.strokeColor;

        const pathD = commandsToString(pathData.subPaths.flat());

        return (
          <g key={element.id}>
            <path
              d={pathD}
              stroke={effectiveStrokeColor}
              strokeWidth={pathData.strokeWidth}
              fill={pathData.fillColor}
              fillOpacity={pathData.fillOpacity}
              strokeLinecap={pathData.strokeLinecap || "round"}
              strokeLinejoin={pathData.strokeLinejoin || "round"}
              vectorEffect="non-scaling-stroke"
              opacity={pathData.strokeOpacity}
              onPointerUp={(e) => onElementClick(element.id, e)}
              onPointerDown={(e) => onElementPointerDown(element.id, e)}
              style={{
                cursor: activePlugin === 'select' ? (isSelected ? 'move' : 'pointer') : 'default',
                pointerEvents: activePlugin === 'subpath' ? 'none' : 'auto'
              }}
            />
            {/* Selection overlay */}
            {isSelected && (
              <SelectionOverlay
                element={element}
                bounds={getTransformedBounds(element)}
                viewport={viewport}
                activePlugin={activePlugin}
                transformation={transformation}
                showTransformations={!(activePlugin === 'transformation' && isWorkingWithSubpaths())}
                onTransformationHandlerPointerDown={onTransformationHandlerPointerDown}
                onTransformationHandlerPointerUp={onTransformationHandlerPointerUp}
              />
            )}
            {/* Render subpath selection box if in subpath mode and element has selected subpaths */}
            {activePlugin === 'transformation' && isWorkingWithSubpaths() && selectedSubpaths.some(sp => sp.elementId === element.id) && (
              <SubpathSelectionOverlay
                element={element}
                selectedSubpaths={selectedSubpaths}
                viewport={viewport}
                activePlugin={activePlugin}
                transformation={transformation}
                onTransformationHandlerPointerDown={onTransformationHandlerPointerDown}
                onTransformationHandlerPointerUp={onTransformationHandlerPointerUp}
              />
            )}
            {isSelected && activePlugin === 'edit' && (
              <EditPointsOverlay
                element={element}
                selectedCommands={selectedCommands}
                editingPoint={editingPoint}
                draggingSelection={draggingSelection}
                dragPosition={dragPosition}
                viewport={viewport}
                smoothBrush={smoothBrush}
                getFilteredEditablePoints={getFilteredEditablePoints}
                onStartDraggingPoint={onStartDraggingPoint}
                onSelectCommand={onSelectCommand}
              />
            )}
            {activePlugin === 'subpath' && (
              <SubpathOverlay
                element={element}
                selectedSubpaths={selectedSubpaths}
                draggingSubpaths={draggingSubpaths}
                viewport={viewport}
                smoothBrush={smoothBrush}
                onSelectSubpath={onSelectSubpath}
                onStartDraggingSubpaths={onStartDraggingSubpaths}
                onStopDraggingSubpaths={onStopDraggingSubpaths}
              />
            )}
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
      {isCreatingShape && shapeStart && shapeEnd && (
        <ShapePreview
          selectedShape={shape?.selectedShape}
          shapeStart={shapeStart}
          shapeEnd={shapeEnd}
          viewport={viewport}
        />
      )}
    </>
  );
};