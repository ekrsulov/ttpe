import React from 'react';
import { getCommandStartPoint } from '../../utils/path';
import { mapSvgToCanvas } from '../../utils/geometry';
import { useCanvasStore } from '../../store/canvasStore';
import { getEffectiveShift } from '../../hooks/useEffectiveShift';
import type { Point, PathData, Command } from '../../types';

interface EditPointsOverlayProps {
  element: {
    id: string;
    type: string;
    data: unknown;
  };
  selectedCommands: Array<{
    elementId: string;
    commandIndex: number;
    pointIndex: number;
  }>;
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
  dragPosition: Point | null;
  viewport: {
    zoom: number;
    panX: number;
    panY: number;
  };
  smoothBrush?: {
    radius: number;
    strength: number;
    isActive: boolean;
    cursorX: number;
    cursorY: number;
    affectedPoints: { commandIndex: number; pointIndex: number; x: number; y: number; }[];
  };
  getFilteredEditablePoints: (elementId: string) => Array<{
    commandIndex: number;
    pointIndex: number;
    x: number;
    y: number;
    isControl: boolean;
  }>;
  onStartDraggingPoint: (elementId: string, commandIndex: number, pointIndex: number, offsetX: number, offsetY: number) => void;
  onSelectCommand: (command: { elementId: string; commandIndex: number; pointIndex: number }, multiSelect?: boolean) => void;
}

export const EditPointsOverlay: React.FC<EditPointsOverlayProps> = ({
  element,
  selectedCommands,
  editingPoint,
  draggingSelection,
  dragPosition,
  viewport,
  smoothBrush,
  getFilteredEditablePoints,
  onStartDraggingPoint,
  onSelectCommand,
}) => {
  if (element.type !== 'path') return null;

  const pathData = element.data as PathData;
  const commands = pathData.subPaths.flat();

  // Use filtered points that consider subpath selection
  const points = getFilteredEditablePoints(element.id);

  return (
    <g>
      {points.map((point, index) => {
        // Use drag position if available, otherwise use original position
        let displayX = point.x;
        let displayY = point.y;

        if (draggingSelection?.isDragging && draggingSelection.draggedPoint) {
          // Handle group drag visualization
          const draggedPoint = draggingSelection.draggedPoint;
          const initialPos = draggingSelection.initialPositions.find(p =>
            p.elementId === element.id &&
            p.commandIndex === point.commandIndex &&
            p.pointIndex === point.pointIndex
          );

          if (initialPos && dragPosition) {
            // Calculate delta from the dragged point
            const draggedInitialPos = draggingSelection.initialPositions.find(p =>
              p.elementId === draggedPoint.elementId &&
              p.commandIndex === draggedPoint.commandIndex &&
              p.pointIndex === draggedPoint.pointIndex
            );

            if (draggedInitialPos) {
              const deltaX = dragPosition.x - draggedInitialPos.x;
              const deltaY = dragPosition.y - draggedInitialPos.y;

              displayX = initialPos.x + deltaX;
              displayY = initialPos.y + deltaY;
            }
          }
        } else if (editingPoint?.isDragging &&
          editingPoint.elementId === element.id &&
          editingPoint.commandIndex === point.commandIndex &&
          editingPoint.pointIndex === point.pointIndex) {
          // Use drag position for smooth visual feedback during single drag
          if (dragPosition) {
            displayX = dragPosition.x;
            displayY = dragPosition.y;
          }
        }

        const pointStyle = getPointStyle(point, selectedCommands, element, commands, pathData, smoothBrush);
        
        // Calculate larger hit area for better touch/mouse interaction
        // Use a minimum size in screen pixels (12px) regardless of zoom
        const hitAreaSize = Math.max(12 / viewport.zoom, pointStyle.size / viewport.zoom);

        return (
          <g key={index}>
            {/* Transparent overlay for easier interaction */}
            <circle
              cx={displayX}
              cy={displayY}
              r={hitAreaSize}
              fill="transparent"
              stroke="none"
              style={{ 
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
              onPointerDown={(e) => handlePointPointerDown(e, point, element, selectedCommands, viewport, onStartDraggingPoint, onSelectCommand, smoothBrush)}
            />
            {/* Visible point */}
            <circle
              cx={displayX}
              cy={displayY}
              r={pointStyle.size / viewport.zoom}
              fill={pointStyle.color}
              stroke={pointStyle.strokeColor}
              strokeWidth={2 / viewport.zoom}
              style={{ pointerEvents: 'none' }} // Let the overlay handle interactions
            />
          </g>
        );
      })}

      {/* Render control point lines - only for filtered points */}
      <ControlPointLines
        commands={commands}
        points={points}
        element={element}
        editingPoint={editingPoint}
        dragPosition={dragPosition}
        viewport={viewport}
      />
    </g>
  );
};

const getPointStyle = (
  point: {
    commandIndex: number;
    pointIndex: number;
    x: number;
    y: number;
    isControl: boolean;
  },
  selectedCommands: Array<{
    elementId: string;
    commandIndex: number;
    pointIndex: number;
  }>,
  element: {
    id: string;
    type: string;
    data: unknown;
  },
  commands: Command[],
  pathData: PathData,
  smoothBrush?: {
    isActive: boolean;
    affectedPoints: Array<{
      commandIndex: number;
      pointIndex: number;
      x: number;
      y: number;
    }>;
  }
) => {
  let color = 'black';
  let size = 4;
  let strokeColor = 'white';
  let strokeWidth = 1;

  // Check if this point is selected
  const isSelected = selectedCommands.some(
    cmd => cmd.elementId === element.id &&
      cmd.commandIndex === point.commandIndex &&
      cmd.pointIndex === point.pointIndex
  );

  // Check if this point is affected by smooth brush
  const isAffectedByBrush = smoothBrush?.isActive && smoothBrush.affectedPoints.some(
    (affected) => affected.commandIndex === point.commandIndex &&
      affected.pointIndex === point.pointIndex
  );

  if (isAffectedByBrush) {
    color = '#f59e0b'; // orange color for affected points
    strokeColor = '#92400e'; // darker orange stroke
    strokeWidth = 1.5;
  } else if (isSelected) {
    strokeColor = 'yellow';
    strokeWidth = 2;
  }

  if (point.isControl) {
    color = 'blue'; // control points in blue
    size = 3;
  } else {
    // command points
    const cmd = commands[point.commandIndex];
    const isLastCommand = point.commandIndex === commands.length - 1;
    const pointsLength = cmd.type === 'M' || cmd.type === 'L' ? 1 : cmd.type === 'C' ? 3 : 0;
    const isLastPointInCommand = point.pointIndex === pointsLength - 1;
    const isLastPointInPath = isLastCommand && isLastPointInCommand && cmd.type !== 'Z';

    // Check if this is the end of a sub-path
    let isEndOfSubPath = false;
    let cumulativeIndex = 0;
    for (const subPath of pathData.subPaths) {
      const subPathStartIndex = cumulativeIndex;
      const subPathEndIndex = cumulativeIndex + subPath.length - 1;
      if (point.commandIndex >= subPathStartIndex && point.commandIndex <= subPathEndIndex) {
        isEndOfSubPath = point.commandIndex === subPathEndIndex && isLastPointInCommand && cmd.type !== 'Z';
        break;
      }
      cumulativeIndex += subPath.length;
    }

    if (cmd.type === 'M') {
      color = 'green';
      size = 6; // larger
    } else if (isLastPointInPath || isEndOfSubPath) {
      color = 'red';
      size = 3; // smaller
    } else {
      color = 'blue'; // intermediate command points in blue
      size = 4;
    }
  }

  return { color, size, strokeColor, strokeWidth };
};

const handlePointPointerDown = (
  e: React.PointerEvent,
  point: {
    commandIndex: number;
    pointIndex: number;
    x: number;
    y: number;
    isControl: boolean;
  },
  element: {
    id: string;
    type: string;
    data: unknown;
  },
  selectedCommands: Array<{
    elementId: string;
    commandIndex: number;
    pointIndex: number;
  }>,
  viewport: {
    zoom: number;
    panX: number;
    panY: number;
  },
  onStartDraggingPoint: (elementId: string, commandIndex: number, pointIndex: number, offsetX: number, offsetY: number) => void,
  onSelectCommand: (command: { elementId: string; commandIndex: number; pointIndex: number }, multiSelect?: boolean) => void,
  smoothBrush?: {
    isActive: boolean;
  }
) => {
  e.stopPropagation();

  // Disable point interaction when smooth brush is active
  if (smoothBrush?.isActive) return;

  // Get virtual shift state
  const isVirtualShiftActive = useCanvasStore.getState().isVirtualShiftActive;
  const effectiveShiftKey = getEffectiveShift(e.shiftKey, isVirtualShiftActive);

  // Check if this point is already selected
  const isAlreadySelected = selectedCommands.some(cmd =>
    cmd.elementId === element.id &&
    cmd.commandIndex === point.commandIndex &&
    cmd.pointIndex === point.pointIndex
  );

  // Handle selection logic
  if (effectiveShiftKey) {
    // Shift+click: toggle selection (add/remove from selection)
    onSelectCommand({
      elementId: element.id,
      commandIndex: point.commandIndex,
      pointIndex: point.pointIndex
    }, true);
  } else if (!isAlreadySelected) {
    // Normal click on unselected point: select it (clear others)
    onSelectCommand({
      elementId: element.id,
      commandIndex: point.commandIndex,
      pointIndex: point.pointIndex
    }, false);
  }
  // If point is already selected and no shift, keep it selected (no action needed)

  // Only start dragging if not using shift (to avoid accidental drags during selection)
  if (!effectiveShiftKey) {
    // Get mouse coordinates relative to SVG
    const svgElement = (e.currentTarget as SVGElement).ownerSVGElement;
    if (svgElement) {
      const svgRect = svgElement.getBoundingClientRect();
      const svgX = e.clientX - svgRect.left;
      const svgY = e.clientY - svgRect.top;

      // Convert to canvas coordinates
      const canvasPoint = mapSvgToCanvas(svgX, svgY, viewport);

      onStartDraggingPoint(element.id, point.commandIndex, point.pointIndex, canvasPoint.x, canvasPoint.y);
    } else {
      // Fallback to original coordinates
      onStartDraggingPoint(element.id, point.commandIndex, point.pointIndex, point.x, point.y);
    }
  }
};

const ControlPointLines: React.FC<{
  commands: Command[];
  points: Array<{
    commandIndex: number;
    pointIndex: number;
    x: number;
    y: number;
    isControl: boolean;
  }>;
  element: {
    id: string;
    type: string;
    data: unknown;
  };
  editingPoint: {
    elementId: string;
    commandIndex: number;
    pointIndex: number;
    isDragging: boolean;
    offsetX: number;
    offsetY: number;
  } | null;
  dragPosition: Point | null;
  viewport: {
    zoom: number;
    panX: number;
    panY: number;
  };
}> = ({ commands, points, element, editingPoint, dragPosition, viewport }) => {
  return (
    <>
      {commands.map((cmd, cmdIndex) => {
        if (cmd.type === 'C') {
          // Check if this command has any control points in the filtered points list
          const hasFilteredControlPoints = points.some(point =>
            point.commandIndex === cmdIndex && (point.pointIndex === 0 || point.pointIndex === 1)
          );

          // Only render lines if this command's control points are included in filtered points
          if (!hasFilteredControlPoints) {
            return null;
          }

          const startPoint = getCommandStartPoint(commands, cmdIndex);
          if (startPoint) {
            let control1X = cmd.controlPoint1.x;
            let control1Y = cmd.controlPoint1.y;
            let control2X = cmd.controlPoint2.x;
            let control2Y = cmd.controlPoint2.y;
            const endX = cmd.position.x;
            const endY = cmd.position.y;

            // Update control point positions if being dragged
            if (editingPoint?.isDragging && editingPoint.elementId === element.id) {
              const dragX = dragPosition?.x ?? editingPoint.offsetX;
              const dragY = dragPosition?.y ?? editingPoint.offsetY;

              if (editingPoint.commandIndex === cmdIndex && editingPoint.pointIndex === 0) {
                control1X = dragX;
                control1Y = dragY;
              } else if (editingPoint.commandIndex === cmdIndex && editingPoint.pointIndex === 1) {
                control2X = dragX;
                control2Y = dragY;
              }
            }

            return (
              <g key={`lines-${cmdIndex}`}>
                <line
                  x1={startPoint.x}
                  y1={startPoint.y}
                  x2={control1X}
                  y2={control1Y}
                  stroke="blue"
                  strokeWidth={1 / viewport.zoom}
                />
                <line
                  x1={control2X}
                  y1={control2Y}
                  x2={endX}
                  y2={endY}
                  stroke="blue"
                  strokeWidth={1 / viewport.zoom}
                />
              </g>
            );
          }
        }
        return null;
      })}
    </>
  );
};