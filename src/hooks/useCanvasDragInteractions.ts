import React from 'react';
import { formatToPrecision, PATH_DECIMAL_PRECISION } from '../utils';
import { extractEditablePoints, updateCommands, extractSubpaths } from '../utils/pathParserUtils';
import type { CanvasElement, SubPath, Point, ControlPointInfo, Command, PathData } from '../types';

interface DragCallbacks {
  onUpdateDraggingPoint: (x: number, y: number) => void;
  onStopDraggingPoint: () => void;
  onUpdateDraggingSubpaths: (x: number, y: number) => void;
  onStopDraggingSubpaths: () => void;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  getControlPointInfo: (elementId: string, commandIndex: number, pointIndex: number) => ControlPointInfo | null;
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
          const canvasX = (svgX - viewport.panX) / viewport.zoom;
          const canvasY = (svgY - viewport.panY) / viewport.zoom;
          
          // Update local drag position for smooth visualization
          setDragPosition({ 
            x: formatToPrecision(canvasX, PATH_DECIMAL_PRECISION), 
            y: formatToPrecision(canvasY, PATH_DECIMAL_PRECISION) 
          });
          
          if (editingPoint?.isDragging) {
            // Update store position
            callbacks.onUpdateDraggingPoint(
              formatToPrecision(canvasX, PATH_DECIMAL_PRECISION), 
              formatToPrecision(canvasY, PATH_DECIMAL_PRECISION)
            );
          } else if (draggingSubpaths?.isDragging) {
            // Update subpath dragging
            callbacks.onUpdateDraggingSubpaths(
              formatToPrecision(canvasX, PATH_DECIMAL_PRECISION), 
              formatToPrecision(canvasY, PATH_DECIMAL_PRECISION)
            );
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
            let info = callbacks.getControlPointInfo(editingPoint.elementId, editingPoint.commandIndex, editingPoint.pointIndex);
            
            // If this point doesn't have alignment info, try to find paired point structurally and check if it has alignment
            if (!info || info.type === 'independent') {
              // Determine the paired point structurally
              const element = elements.find(el => el.id === editingPoint.elementId);
              if (element && element.type === 'path') {
                const pathData = element.data as PathData;
                const commands = pathData.subPaths.flat();
                const isClosed = commands.length > 2 && commands[commands.length - 1].type === 'Z';
                
                let pairedCommandIndex = -1;
                let pairedPointIndex = -1;
                const handleType = editingPoint.pointIndex === 0 ? 'outgoing' : 'incoming';
                
                if (handleType === 'incoming') {
                  // For incoming handle, find the next command's outgoing handle
                  if (editingPoint.commandIndex < commands.length - 1) {
                    const nextCommand = commands[editingPoint.commandIndex + 1];
                    if (nextCommand.type === 'C') {
                      pairedCommandIndex = editingPoint.commandIndex + 1;
                      pairedPointIndex = 0;
                    }
                  } else if (isClosed && commands[editingPoint.commandIndex].type === 'C') {
                    // Find first C command
                    for (let i = 1; i < commands.length; i++) {
                      if (commands[i].type === 'C') {
                        pairedCommandIndex = i;
                        pairedPointIndex = 0;
                        break;
                      }
                    }
                  }
                } else {
                  // For outgoing handle, find the previous command's incoming handle
                  if (editingPoint.commandIndex > 0) {
                    const prevCommand = commands[editingPoint.commandIndex - 1];
                    if (prevCommand.type === 'C') {
                      pairedCommandIndex = editingPoint.commandIndex - 1;
                      pairedPointIndex = 1;
                    }
                  } else if (isClosed && commands[editingPoint.commandIndex].type === 'C') {
                    // Find last C command
                    for (let i = commands.length - 2; i >= 0; i--) {
                      if (commands[i].type === 'C') {
                        pairedCommandIndex = i;
                        pairedPointIndex = 1;
                        break;
                      }
                    }
                  }
                }
                
                // If found paired point, check if it has alignment info
                if (pairedCommandIndex !== -1) {
                  const pairedInfo = callbacks.getControlPointInfo(editingPoint.elementId, pairedCommandIndex, pairedPointIndex);
                  if (pairedInfo && pairedInfo.type !== 'independent') {
                    // Use the paired point's alignment info
                    info = {
                      commandIndex: editingPoint.commandIndex,
                      pointIndex: editingPoint.pointIndex,
                      type: pairedInfo.type,
                      pairedCommandIndex: pairedCommandIndex,
                      pairedPointIndex: pairedPointIndex,
                      anchor: pairedInfo.anchor,
                      isControl: true
                    };
                  }
                } else {
                  // Special case: if no paired point found and path is closed, look for control points that share coordinates with the M point
                  const element = elements.find(el => el.id === editingPoint.elementId);
                  if (element && element.type === 'path') {
                    const pathData = element.data as PathData;
                    const commands = pathData.subPaths.flat();
                    const isClosed = commands.length > 2 && commands[commands.length - 1].type === 'Z';
                    
                    if (isClosed && commands[editingPoint.commandIndex].type === 'C') {
                      // Find the M point for this subpath
                      let mCommandIndex = -1;
                      for (let i = editingPoint.commandIndex; i >= 0; i--) {
                        if (commands[i].type === 'M') {
                          mCommandIndex = i;
                          break;
                        }
                      }
                      
                      if (mCommandIndex !== -1) {
                        const mPoint = commands[mCommandIndex].type !== 'Z' ? (commands[mCommandIndex] as { position: Point }).position : { x: 0, y: 0 };
                        const currentPoint = points.find(p => p.commandIndex === editingPoint.commandIndex && p.pointIndex === editingPoint.pointIndex);
                        
                        if (currentPoint) {
                          // Check if current point shares x or y coordinate with M point
                          const sharesX = Math.abs(currentPoint.x - mPoint.x) < 0.1;
                          const sharesY = Math.abs(currentPoint.y - mPoint.y) < 0.1;
                          
                          if (sharesX || sharesY) {
                            // Find other control points in the same subpath that share the same coordinate
                            for (const otherPoint of points) {
                              if (otherPoint.commandIndex !== editingPoint.commandIndex || otherPoint.pointIndex !== editingPoint.pointIndex) {
                                // Check if it's in the same subpath (between M and Z)
                                let inSameSubpath = false;
                                if (otherPoint.commandIndex > mCommandIndex) {
                                  inSameSubpath = true;
                                  // Check if there's an M between them (new subpath)
                                  for (let i = mCommandIndex + 1; i < otherPoint.commandIndex; i++) {
                                    if (commands[i].type === 'M') {
                                      inSameSubpath = false;
                                      break;
                                    }
                                  }
                                }
                                
                                if (inSameSubpath && otherPoint.isControl) {
                                  const sharesCoord = (sharesX && Math.abs(otherPoint.x - mPoint.x) < 0.1) || 
                                                     (sharesY && Math.abs(otherPoint.y - mPoint.y) < 0.1);
                                  
                                  if (sharesCoord) {
                                    // Found a matching point, check if it has alignment info
                                    const pairedInfo = callbacks.getControlPointInfo(editingPoint.elementId, otherPoint.commandIndex, otherPoint.pointIndex);
                                    if (pairedInfo && pairedInfo.type !== 'independent') {
                                      info = {
                                        commandIndex: editingPoint.commandIndex,
                                        pointIndex: editingPoint.pointIndex,
                                        type: pairedInfo.type,
                                        pairedCommandIndex: otherPoint.commandIndex,
                                        pairedPointIndex: otherPoint.pointIndex,
                                        anchor: pairedInfo.anchor,
                                        isControl: true
                                      };
                                    }
                                    break;
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
            
            if (info && (info.type === 'aligned' || info.type === 'mirrored')) {
              const pairedCommandIndex = info.pairedCommandIndex;
              const pairedPointIndex = info.pairedPointIndex;
              const anchor = info.anchor;
              
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
                
                if (info.type === 'mirrored') {
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
        
        // Force cleanup of drag state
        if (editingPoint?.isDragging) {
          callbacks.onStopDraggingPoint();
        } else if (draggingSelection?.isDragging) {
          callbacks.onStopDraggingPoint(); // This will handle draggingSelection cleanup
        } else if (draggingSubpaths?.isDragging) {
          callbacks.onStopDraggingSubpaths();
        }
      }
    };

    // Emergency cleanup for cases where pointerup might not fire
    const handlePointerCancel = () => {
      setDragPosition(null);
      setOriginalPathDataMap(null);
      const { editingPoint, draggingSelection, draggingSubpaths } = dragState;
      
      if (editingPoint?.isDragging) {
        callbacks.onStopDraggingPoint();
      } else if (draggingSelection?.isDragging) {
        callbacks.onStopDraggingPoint();
      } else if (draggingSubpaths?.isDragging) {
        callbacks.onStopDraggingSubpaths();
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