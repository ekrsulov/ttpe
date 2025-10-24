import React from 'react';
import { formatToPrecision, PATH_DECIMAL_PRECISION } from '../utils';
import { extractEditablePoints, updateCommands, extractSubpaths, getControlPointAlignmentInfo } from '../utils/path';
import { mapSvgToCanvas } from '../utils/geometry';
import type { CanvasElement, SubPath, Point, ControlPointInfo, Command, PathData } from '../types';

interface DragCallbacks {
  onStopDraggingPoint: () => void;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  getControlPointInfo: (elementId: string, commandIndex: number, pointIndex: number) => ControlPointInfo | null;
  snapToGrid?: (x: number, y: number) => { x: number; y: number };
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
          const canvasX = canvasPoint.x;
          const canvasY = canvasPoint.y;

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
        // Apply snap to grid on pointer up if snap is enabled
        if (callbacks.snapToGrid && dragPosition) {
          const snapped = callbacks.snapToGrid(dragPosition.x, dragPosition.y);

          if (editingPoint?.isDragging) {
            // Apply snap to single point by updating the element directly
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
                // Create update for the snapped position
                const updates = [{
                  commandIndex: pointToUpdate.commandIndex,
                  pointIndex: pointToUpdate.pointIndex,
                  x: formatToPrecision(snapped.x, PATH_DECIMAL_PRECISION),
                  y: formatToPrecision(snapped.y, PATH_DECIMAL_PRECISION),
                  isControl: pointToUpdate.isControl
                }];

                // Handle control point alignment logic
                const alignmentInfo = getControlPointAlignmentInfo(commands, points, editingPoint.commandIndex, editingPoint.pointIndex);
                if (alignmentInfo && (alignmentInfo.type === 'aligned' || alignmentInfo.type === 'mirrored')) {
                  const pairedCommandIndex = alignmentInfo.pairedCommandIndex;
                  const pairedPointIndex = alignmentInfo.pairedPointIndex;
                  const anchor = alignmentInfo.anchor;

                  if (pairedCommandIndex !== undefined && pairedPointIndex !== undefined) {
                    const currentVector = {
                      x: snapped.x - anchor.x,
                      y: snapped.y - anchor.y
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
                        // Aligned: opposite direction, maintain original magnitude
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

                      updates.push({
                        commandIndex: pairedCommandIndex,
                        pointIndex: pairedPointIndex,
                        x: formatToPrecision(pairedX, PATH_DECIMAL_PRECISION),
                        y: formatToPrecision(pairedY, PATH_DECIMAL_PRECISION),
                        isControl: true
                      });
                    }
                  }
                }

                // Update the commands and element
                const updatedCommands = updateCommands(commands, updates.map(u => ({ ...u, type: 'independent' as const, anchor: { x: u.x, y: u.y } })));
                const newSubPaths = extractSubpaths(updatedCommands).map(sp => sp.commands);

                callbacks.onUpdateElement(editingPoint.elementId, {
                  data: {
                    ...(element.data as PathData),
                    subPaths: newSubPaths
                  }
                });
              }
            }
          } else if (draggingSelection?.isDragging) {
            // Apply snap to multi-selection by calculating center and applying offset
            if (draggingSelection.initialPositions.length > 0) {
              // Calculate the current center of all selected points
              let centerX = 0;
              let centerY = 0;
              const pointCount = draggingSelection.initialPositions.length;

              draggingSelection.initialPositions.forEach(pos => {
                centerX += pos.x;
                centerY += pos.y;
              });
              centerX /= pointCount;
              centerY /= pointCount;

              // Calculate the current delta from drag
              const currentDeltaX = dragPosition!.x - draggingSelection.startX;
              const currentDeltaY = dragPosition!.y - draggingSelection.startY;

              // Apply current delta to center
              const currentCenterX = centerX + currentDeltaX;
              const currentCenterY = centerY + currentDeltaY;

              // Snap the center
              const snappedCenter = callbacks.snapToGrid!(currentCenterX, currentCenterY);

              // Calculate snap offset
              const snapOffsetX = snappedCenter.x - currentCenterX;
              const snapOffsetY = snappedCenter.y - currentCenterY;

              // Apply snap offset to all points
              const elementUpdates: Record<string, Array<{
                commandIndex: number;
                pointIndex: number;
                x: number;
                y: number;
                isControl: boolean;
              }>> = {};

              draggingSelection.initialPositions.forEach(pos => {
                const element = elements.find(el => el.id === pos.elementId);
                if (element && element.type === 'path') {
                  const pathData = element.data as PathData;
                  const commands = pathData.subPaths.flat();
                  const points = extractEditablePoints(commands);

                  const pointToUpdate = points.find(p =>
                    p.commandIndex === pos.commandIndex &&
                    p.pointIndex === pos.pointIndex
                  );

                  if (pointToUpdate) {
                    if (!elementUpdates[pos.elementId]) {
                      elementUpdates[pos.elementId] = [];
                    }

                    elementUpdates[pos.elementId].push({
                      commandIndex: pointToUpdate.commandIndex,
                      pointIndex: pointToUpdate.pointIndex,
                      x: formatToPrecision(pos.x + currentDeltaX + snapOffsetX, PATH_DECIMAL_PRECISION),
                      y: formatToPrecision(pos.y + currentDeltaY + snapOffsetY, PATH_DECIMAL_PRECISION),
                      isControl: pointToUpdate.isControl
                    });
                  }
                }
              });

              // Update each element
              Object.entries(elementUpdates).forEach(([elementId, updates]) => {
                const originalSubPaths = originalPathDataMap?.[elementId];
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
          } else if (draggingSubpaths?.isDragging) {
            // Apply snap to subpath dragging using top-left corner of bounding box
            if (draggingSubpaths.initialPositions.length > 0) {
              // Calculate the current delta from drag
              const currentDeltaX = dragPosition!.x - draggingSubpaths.startX;
              const currentDeltaY = dragPosition!.y - draggingSubpaths.startY;

              // For each subpath, snap its top-left corner
              draggingSubpaths.initialPositions.forEach(subpathInfo => {
                const { elementId, subpathIndex, bounds } = subpathInfo;

                // Calculate current top-left position
                const currentTopLeftX = bounds.minX + currentDeltaX;
                const currentTopLeftY = bounds.minY + currentDeltaY;

                // Snap the top-left corner
                const snappedTopLeft = callbacks.snapToGrid!(currentTopLeftX, currentTopLeftY);

                // Calculate snap offset
                const snapOffsetX = snappedTopLeft.x - currentTopLeftX;
                const snapOffsetY = snappedTopLeft.y - currentTopLeftY;

                // Apply snap offset to all points in this subpath
                const element = elements.find(el => el.id === elementId);
                if (element && element.type === 'path') {
                  const pathData = element.data as PathData;
                  const commands = pathData.subPaths.flat();
                  const points = extractEditablePoints(commands);

                  // Find points that belong to this subpath
                  const subpathPoints = points.filter(point => {
                    // Find which subpath this point belongs to
                    let currentSubpathIndex = 0;
                    let commandCount = 0;

                    for (let i = 0; i < pathData.subPaths.length; i++) {
                      const subpathCommandCount = pathData.subPaths[i].length;
                      if (point.commandIndex >= commandCount && point.commandIndex < commandCount + subpathCommandCount) {
                        currentSubpathIndex = i;
                        break;
                      }
                      commandCount += subpathCommandCount;
                    }

                    return currentSubpathIndex === subpathIndex;
                  });

                  if (subpathPoints.length > 0) {
                    // Create updates for all points in this subpath
                    const updates = subpathPoints.map(point => ({
                      commandIndex: point.commandIndex,
                      pointIndex: point.pointIndex,
                      x: formatToPrecision(point.x + currentDeltaX + snapOffsetX, PATH_DECIMAL_PRECISION),
                      y: formatToPrecision(point.y + currentDeltaY + snapOffsetY, PATH_DECIMAL_PRECISION),
                      isControl: point.isControl
                    }));

                    // Update the element
                    const originalSubPaths = originalPathDataMap?.[elementId];
                    if (originalSubPaths) {
                      const originalCommands = originalSubPaths.flat();
                      const updatedCommands = updateCommands(originalCommands, updates.map(u => ({ ...u, type: 'independent' as const, anchor: { x: u.x, y: u.y } })));
                      const newSubPaths = extractSubpaths(updatedCommands).map(sp => sp.commands);

                      callbacks.onUpdateElement(elementId, {
                        data: {
                          ...(element.data as PathData),
                          subPaths: newSubPaths
                        }
                      });
                    }
                  }
                }
              });
            }
          }
        }

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