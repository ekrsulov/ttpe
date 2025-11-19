import React from 'react';
import { formatToPrecision, PATH_DECIMAL_PRECISION } from '../../utils';
import { extractEditablePoints, updateCommands, extractSubpaths, getControlPointAlignmentInfo } from '../../utils/pathParserUtils';
import { mapSvgToCanvas } from '../../utils/geometry';
import { pluginManager } from '../../utils/pluginManager';
import type { CanvasElement, SubPath, Point, ControlPointInfo, Command, PathData } from '../../types';

interface DragCallbacks {
  onStopDraggingPoint: () => void;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  getControlPointInfo: (elementId: string, commandIndex: number, pointIndex: number) => ControlPointInfo | null;
  clearGuidelines?: () => void;
}

interface DragState {
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
  draggingSubpaths?: {
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
}

interface UseCanvasDragInteractionsProps {
  dragState: DragState;
  viewport: {
    zoom: number;
    panX: number;
    panY: number;
  };
  elements: Array<CanvasElement>;
  smoothBrush: {
    isActive: boolean;
  };
  callbacks: DragCallbacks;
}

export const useCanvasDragInteractions = ({
  dragState,
  viewport,
  elements,
  smoothBrush,
  callbacks
}: UseCanvasDragInteractionsProps) => {
  const [dragPosition, setDragPosition] = React.useState<Point | null>(null);
  const [originalPathDataMap, setOriginalPathDataMap] = React.useState<Record<string, SubPath[]> | null>(null);

  React.useEffect(() => {
    let lastUpdateTime = 0;
    const UPDATE_THROTTLE = 16; // ~60fps

    const handlePointerMove = (e: PointerEvent) => {
      // Disable all dragging interactions when smooth brush is active
      if (smoothBrush.isActive) return;

      const { editingPoint, draggingSelection, draggingSubpaths } = dragState;

      if (editingPoint?.isDragging || draggingSelection?.isDragging || draggingSubpaths?.isDragging) {
        // Get SVG element as reference for coordinate conversion
        const svgElement = document.querySelector('svg');
        if (svgElement) {
          const svgRect = svgElement.getBoundingClientRect();

          // Convert screen coordinates to SVG coordinates
          const svgX = e.clientX - svgRect.left;
          const svgY = e.clientY - svgRect.top;

          // Convert SVG coordinates to canvas coordinates (accounting for viewport)
          const canvasPoint = mapSvgToCanvas(svgX, svgY, viewport);
          let canvasX = canvasPoint.x;
          let canvasY = canvasPoint.y;

          // Apply drag modifiers (e.g. object snap)
          const modifiers = pluginManager.getDragModifiers();
          let modifiedPoint = { x: canvasX, y: canvasY };

          // Create context for modifiers
          const excludeElementIds: string[] = [];
          if (editingPoint) {
            excludeElementIds.push(editingPoint.elementId);
          } else if (draggingSelection) {
            draggingSelection.initialPositions.forEach(pos => {
              if (!excludeElementIds.includes(pos.elementId)) {
                excludeElementIds.push(pos.elementId);
              }
            });
          } else if (draggingSubpaths) {
            draggingSubpaths.initialPositions.forEach(pos => {
              if (!excludeElementIds.includes(pos.elementId)) {
                excludeElementIds.push(pos.elementId);
              }
            });
          }

          const dragContext = {
            originalPoint: { x: canvasX, y: canvasY },
            excludeElementIds
          };

          for (const modifier of modifiers) {
            modifiedPoint = modifier.modify(modifiedPoint, dragContext);
          }

          canvasX = modifiedPoint.x;
          canvasY = modifiedPoint.y;

          // Update local drag position for smooth visualization
          setDragPosition({
            x: formatToPrecision(canvasX, PATH_DECIMAL_PRECISION),
            y: formatToPrecision(canvasY, PATH_DECIMAL_PRECISION)
          });

          if (editingPoint?.isDragging) {
            // Position updates are handled by updateSinglePointPath below
          } else if (draggingSubpaths?.isDragging) {
            // Position updates are handled by update logic below
          }

          // Throttled path update for real-time feedback
          const now = Date.now();
          if (now - lastUpdateTime >= UPDATE_THROTTLE) {
            lastUpdateTime = now;

            if (editingPoint?.isDragging) {
              updateSinglePointPath(editingPoint, canvasX, canvasY);
            } else if (draggingSelection?.isDragging) {
              updateGroupDragPaths(draggingSelection, canvasX, canvasY);
            }
          }
        }
      }
    };

    const updateSinglePointPath = (editingPoint: NonNullable<DragState['editingPoint']>, canvasX: number, canvasY: number) => {
      const element = elements.find(el => el.id === editingPoint.elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as PathData;
        const commands = pathData.subPaths.flat();
        const points = extractEditablePoints(commands);

        const pointToUpdate = points.find(p =>
          p.commandIndex === editingPoint.commandIndex &&
          p.pointIndex === editingPoint.pointIndex
        );

        if (pointToUpdate) {
          const newX = formatToPrecision(canvasX, PATH_DECIMAL_PRECISION);
          const newY = formatToPrecision(canvasY, PATH_DECIMAL_PRECISION);

          const pointsToUpdate = [pointToUpdate];

          // Handle control point alignment logic
          if (pointToUpdate.isControl) {
            // Calculate alignment info on-demand
            const alignmentInfo = getControlPointAlignmentInfo(commands, points, editingPoint.commandIndex, editingPoint.pointIndex);

            if (alignmentInfo && (alignmentInfo.type === 'aligned' || alignmentInfo.type === 'mirrored')) {
              const pairedCommandIndex = alignmentInfo.pairedCommandIndex;
              const pairedPointIndex = alignmentInfo.pairedPointIndex;
              const anchor = alignmentInfo.anchor;

              if (pairedCommandIndex !== undefined && pairedPointIndex !== undefined) {
                // Calculate the synchronized position for the paired control point
                const currentVector = {
                  x: newX - anchor.x,
                  y: newY - anchor.y
                };
                const magnitude = Math.sqrt(currentVector.x * currentVector.x + currentVector.y * currentVector.y);

                if (magnitude > 0) {
                  const unitVector = {
                    x: currentVector.x / magnitude,
                    y: currentVector.y / magnitude
                  };

                  let pairedX: number;
                  let pairedY: number;

                  if (alignmentInfo.type === 'mirrored') {
                    // Opposite direction, same magnitude
                    pairedX = anchor.x + (-unitVector.x * magnitude);
                    pairedY = anchor.y + (-unitVector.y * magnitude);
                  } else {
                    // Opposite direction, maintain original magnitude
                    const pairedPoint = points.find(p =>
                      p.commandIndex === pairedCommandIndex &&
                      p.pointIndex === pairedPointIndex
                    );
                    if (pairedPoint) {
                      const originalVector = {
                        x: pairedPoint.x - anchor.x,
                        y: pairedPoint.y - anchor.y
                      };
                      const originalMagnitude = Math.sqrt(originalVector.x * originalVector.x + originalVector.y * originalVector.y);
                      pairedX = anchor.x + (-unitVector.x * originalMagnitude);
                      pairedY = anchor.y + (-unitVector.y * originalMagnitude);
                    } else {
                      pairedX = anchor.x + (-unitVector.x * magnitude);
                      pairedY = anchor.y + (-unitVector.y * magnitude);
                    }
                  }

                  // Find and update the paired point
                  const pairedPointToUpdate = points.find(p =>
                    p.commandIndex === pairedCommandIndex &&
                    p.pointIndex === pairedPointIndex
                  );
                  if (pairedPointToUpdate) {
                    pairedPointToUpdate.x = formatToPrecision(pairedX, PATH_DECIMAL_PRECISION);
                    pairedPointToUpdate.y = formatToPrecision(pairedY, PATH_DECIMAL_PRECISION);
                    pointsToUpdate.push(pairedPointToUpdate);
                  }
                }
              }
            }
          }

          pointToUpdate.x = newX;
          pointToUpdate.y = newY;

          const updatedCommands = updateCommands(commands, pointsToUpdate);
          const newSubPaths = extractSubpaths(updatedCommands).map(sp => sp.commands);
          callbacks.onUpdateElement(editingPoint.elementId, {
            data: {
              ...pathData,
              subPaths: newSubPaths
            }
          });
        }
      }
    };

    const updateGroupDragPaths = (draggingSelection: NonNullable<DragState['draggingSelection']>, canvasX: number, canvasY: number) => {
      const deltaX = formatToPrecision(canvasX - draggingSelection.startX, PATH_DECIMAL_PRECISION);
      const deltaY = formatToPrecision(canvasY - draggingSelection.startY, PATH_DECIMAL_PRECISION);

      // Store original path data to prevent accumulation
      if (!originalPathDataMap) {
        const newOriginalPathDataMap: Record<string, SubPath[]> = {};
        draggingSelection.initialPositions.forEach(pos => {
          const element = elements.find(el => el.id === pos.elementId);
          if (element && element.type === 'path') {
            const pathData = element.data as PathData;
            newOriginalPathDataMap[pos.elementId] = pathData.subPaths;
          }
        });
        setOriginalPathDataMap(newOriginalPathDataMap);
      }

      if (originalPathDataMap) {
        // Group updates by element
        const elementUpdates: Record<string, Array<{
          commandIndex: number;
          pointIndex: number;
          x: number;
          y: number;
          isControl: boolean;
        }>> = {};

        draggingSelection.initialPositions.forEach(initialPos => {
          if (!elementUpdates[initialPos.elementId]) {
            elementUpdates[initialPos.elementId] = [];
          }

          elementUpdates[initialPos.elementId].push({
            commandIndex: initialPos.commandIndex,
            pointIndex: initialPos.pointIndex,
            x: formatToPrecision(initialPos.x + deltaX, PATH_DECIMAL_PRECISION),
            y: formatToPrecision(initialPos.y + deltaY, PATH_DECIMAL_PRECISION),
            isControl: false
          });
        });

        // Update each element
        Object.entries(elementUpdates).forEach(([elementId, updates]) => {
          const originalSubPaths = originalPathDataMap[elementId];
          if (originalSubPaths) {
            const originalCommands = originalSubPaths.flat();
            const updatedCommands = updateCommands(originalCommands, updates.map(u => ({ ...u, type: 'independent' as const, anchor: { x: u.x, y: u.y } })));
            const newSubPaths = extractSubpaths(updatedCommands).map(sp => sp.commands);

            const element = elements.find(el => el.id === elementId);
            if (element) {
              callbacks.onUpdateElement(elementId, {
                data: {
                  ...(element.data as PathData),
                  subPaths: newSubPaths
                }
              });
            }
          }
        });
      }
    };

    const handlePointerUp = () => {
      const { editingPoint, draggingSelection, draggingSubpaths } = dragState;

      if (editingPoint?.isDragging || draggingSelection?.isDragging || draggingSubpaths?.isDragging) {
        // Emergency cleanup - clear all temporary state
        setDragPosition(null);
        setOriginalPathDataMap(null);

        // Clear guidelines when drag ends
        if (callbacks.clearGuidelines) {
          callbacks.clearGuidelines();
        }

        // Force cleanup of drag state
        if (editingPoint?.isDragging || draggingSelection?.isDragging || draggingSubpaths?.isDragging) {
          callbacks.onStopDraggingPoint();
        }
      }
    };

    // Emergency cleanup for cases where pointerup might not fire
    const handlePointerCancel = () => {
      setDragPosition(null);
      setOriginalPathDataMap(null);
      const { editingPoint, draggingSelection, draggingSubpaths } = dragState;

      // Clear guidelines when drag is cancelled
      if (callbacks.clearGuidelines) {
        callbacks.clearGuidelines();
      }

      if (editingPoint?.isDragging || draggingSelection?.isDragging || draggingSubpaths?.isDragging) {
        callbacks.onStopDraggingPoint();
      }
    };

    const isAnyDragging = dragState.editingPoint?.isDragging ||
      dragState.draggingSelection?.isDragging ||
      dragState.draggingSubpaths?.isDragging;

    if (isAnyDragging) {
      // Use document for more reliable event capture
      document.addEventListener('pointermove', handlePointerMove, { passive: false });
      document.addEventListener('pointerup', handlePointerUp, { passive: false });
      document.addEventListener('pointercancel', handlePointerCancel, { passive: false });

      // Additional cleanup listeners for edge cases
      document.addEventListener('contextmenu', handlePointerCancel, { passive: false });
      document.addEventListener('blur', handlePointerCancel, { passive: false });
      window.addEventListener('blur', handlePointerCancel, { passive: false });
    }

    return () => {
      // Cleanup all listeners
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerCancel);
      document.removeEventListener('contextmenu', handlePointerCancel);
      document.removeEventListener('blur', handlePointerCancel);
      window.removeEventListener('blur', handlePointerCancel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dragState.editingPoint?.isDragging,
    dragState.editingPoint?.elementId,
    dragState.editingPoint?.commandIndex,
    dragState.editingPoint?.pointIndex,
    dragState.draggingSelection?.isDragging,
    dragState.draggingSubpaths?.isDragging,
    viewport,
    elements,
    callbacks,
    smoothBrush.isActive,
    originalPathDataMap
  ]);

  return {
    dragPosition,
    originalPathDataMap
  };
};