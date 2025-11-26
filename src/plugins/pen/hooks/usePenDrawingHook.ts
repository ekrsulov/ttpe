import { useEffect, useRef } from 'react';
import { useCanvasStore } from '../../../store/canvasStore';
import type { PluginHooksContext } from '../../../types/plugins';
import type { Point } from '../../../types';
import {
    startPath,
    addStraightAnchor,
    addCurvedAnchor,
    closePath,
    finalizePath,
    cancelPath,
    startEditingPath,
    addAnchorToSegment,
    deleteAnchor,
    convertAnchorType,
    continueFromEndpoint,
    updateHandle,
    moveLastAnchor,
    moveAnchor,
    curveSegment,
    updateAnchorHandles
} from '../actions';
import { calculateCursorState, calculateEditCursorState } from '../utils/cursorState';
import { constrainAngleTo45Degrees } from '../utils/pathConverter';
import { findPathAtPoint, findSegmentOnPath } from '../utils/anchorDetection';
import { applyGridSnap } from '../../../utils/gridSnapUtils';
import { distance } from '../../../utils/snapPointUtils';

/**
 * Main hook for Pen tool pointer event handling
 */
export function usePenDrawingHook(context: PluginHooksContext): void {
    const { svgRef, screenToCanvas, activePlugin, viewportZoom } = context;

    // Use refs for state that needs to persist across renders but doesn't trigger re-renders
    const isDraggingRef = useRef(false);
    const dragStartPointRef = useRef<Point | null>(null);
    const rawDragStartPointRef = useRef<Point | null>(null); // Track raw start point for drag detection
    const isShiftPressedRef = useRef(false);
    const isAltPressedRef = useRef(false);
    const savedInHandleRef = useRef<Point | null>(null);
    const isMovingLastAnchorRef = useRef(false);
    const lastAnchorOriginalPositionRef = useRef<Point | null>(null);

    // Only activate when pen tool is active
    const isActive = activePlugin === 'pen';

    // Reset pen state when tool becomes active (cleanup from previous session)
    useEffect(() => {
        if (isActive) {
            const state = useCanvasStore.getState();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const penState = (state as any).pen;

            // Only reset if there's stale state from a previous session
            if (penState?.currentPath || penState?.mode === 'drawing') {
                state.updatePenState?.({
                    mode: 'idle',
                    currentPath: null,
                    activeAnchorIndex: null,
                    previewAnchor: null,
                    dragState: null,
                    cursorState: 'new-path',
                    editingPathId: null,
                    editingSubPathIndex: null,
                    selectedAnchorIndex: null,
                });

                // Also reset local refs
                isDraggingRef.current = false;
                dragStartPointRef.current = null;
                isShiftPressedRef.current = false;
                isAltPressedRef.current = false;
                savedInHandleRef.current = null;
                isMovingLastAnchorRef.current = false;
                lastAnchorOriginalPositionRef.current = null;
            }
        }
    }, [isActive]);

    useEffect(() => {

        if (!isActive) return;


        /**
         * Handle pointer down - start new anchor or operation
         */
        const handlePointerDown = (event: PointerEvent) => {

            if (!svgRef.current || event.button !== 0) return; // Only left button

            // Check if the click is actually on the SVG canvas (not on UI elements)
            const target = event.target as HTMLElement;
            const svgElement = svgRef.current;

            // Ignore clicks that are not on the SVG or its children
            if (!svgElement.contains(target)) {
                return;
            }

            const rect = svgRef.current.getBoundingClientRect();
            const rawCanvasPoint = screenToCanvas(
                event.clientX - rect.left,
                event.clientY - rect.top
            );

            const state = useCanvasStore.getState();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const penState = (state as any).pen;

            if (!penState) return;

            // Apply snapping for actions (drawing/dragging)
            // We exclude the current path being drawn/edited from object snap to avoid self-snapping issues during creation
            // although sometimes self-snapping is desired (e.g. closing path).
            // For now, let's exclude nothing and see if it works, or exclude editingPathId.
            // Actually, closing path is handled by specific logic, so we might want to exclude current path.
            const excludeIds = penState.editingPathId ? [penState.editingPathId] : [];

            // Helper to apply snapping
            const getSnappedPoint = (point: Point) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const objectSnapStore = state as any;
                let finalPoint = point;
                let snapped = false;

                // 1. Object Snap
                if (objectSnapStore.applyObjectSnap) {
                    const snappedPoint = objectSnapStore.applyObjectSnap(point, excludeIds);
                    if (snappedPoint.x !== point.x || snappedPoint.y !== point.y) {
                        finalPoint = snappedPoint;
                        snapped = true;
                    }
                }

                // 2. Grid Snap (only if not snapped to object)
                if (!snapped) {
                    finalPoint = applyGridSnap(point);
                }
                return finalPoint;
            };

            const canvasPoint = getSnappedPoint(rawCanvasPoint);
            // Use raw point for detection to avoid snapping away from targets
            const detectionPoint = rawCanvasPoint;

            const { mode, currentPath, cursorState } = penState;


            // Store modifier keys
            isShiftPressedRef.current = event.shiftKey;
            isAltPressedRef.current = event.altKey;

            // Handle based on cursor state
            if (cursorState === 'close' && mode === 'drawing') {
                // Closing the path
                closePath(useCanvasStore.getState);
                return;
            }

            // Handle editing actions based on cursor state
            if (mode === 'editing' || mode === 'idle') {
                // We need to re-detect what we are hovering over to be sure
                // Or rely on cursorState if it's reliable.
                // Re-detecting is safer.

                // If we are editing a specific path, check that first
                if (penState.editingPathId && penState.currentPath) {
                    const { hoverTarget } = calculateEditCursorState(
                        detectionPoint, // Use raw point for detection
                        penState.currentPath,
                        penState.editingPathId,
                        penState.autoAddDelete,
                        viewportZoom
                    );

                    // Handle direct handle manipulation
                    if (hoverTarget.type === 'handle' && hoverTarget.anchorIndex !== undefined && hoverTarget.handleType) {
                        // Start dragging the handle
                        isDraggingRef.current = true;
                        dragStartPointRef.current = { ...canvasPoint }; // Use snapped point for drag start
                        state.updatePenState?.({
                            dragState: {
                                type: 'handle',
                                anchorIndex: hoverTarget.anchorIndex,
                                handleType: hoverTarget.handleType,
                                startPoint: canvasPoint,
                                currentPoint: canvasPoint,
                            },
                        });
                        return;
                    }

                    if (hoverTarget.type === 'anchor' && hoverTarget.anchorIndex !== undefined) {
                        if (isAltPressedRef.current) {
                            // Cycle anchor type
                            convertAnchorType(hoverTarget.anchorIndex, useCanvasStore.getState);
                        } else if (penState.autoAddDelete) {
                            // Delete anchor
                            deleteAnchor(hoverTarget.anchorIndex, useCanvasStore.getState);
                        } else {
                            // Auto Add/Delete disabled: start dragging anchor
                            isDraggingRef.current = true;
                            dragStartPointRef.current = { ...canvasPoint };
                            state.updatePenState?.({
                                dragState: {
                                    type: 'anchor',
                                    anchorIndex: hoverTarget.anchorIndex,
                                    startPoint: canvasPoint,
                                    currentPoint: canvasPoint,
                                },
                            });
                        }
                        return;
                    }

                    if (hoverTarget.type === 'segment' && hoverTarget.segmentIndex !== undefined) {
                        if (penState.autoAddDelete) {
                            // Add anchor - use snapped point for new anchor position
                            addAnchorToSegment(hoverTarget.segmentIndex, canvasPoint, useCanvasStore.getState);
                            return;
                        } else {
                            // Auto Add/Delete disabled: start curving segment
                            // Need to find the segment again to get the 't' parameter
                            const result = findSegmentOnPath(detectionPoint, penState.currentPath, 8 / viewportZoom);
                            if (result) {
                                isDraggingRef.current = true;
                                dragStartPointRef.current = { ...canvasPoint };
                                state.updatePenState?.({
                                    dragState: {
                                        type: 'segment',
                                        segmentIndex: result.segmentIndex,
                                        t: result.t,
                                        startPoint: canvasPoint,
                                        currentPoint: canvasPoint,
                                    },
                                });
                            }
                            return;
                        }
                    }

                    if (hoverTarget.type === 'endpoint' && hoverTarget.anchorIndex !== undefined && hoverTarget.pathId) {
                        // Continue path
                        continueFromEndpoint(hoverTarget.pathId, hoverTarget.anchorIndex, useCanvasStore.getState);
                        return;
                    }
                }

                // If not editing or didn't hit anything on current path, check for other paths
                const result = findPathAtPoint(detectionPoint, state.elements, viewportZoom);
                if (result) {
                    // Check if we hit an endpoint of this path to continue immediately
                    const { hoverTarget } = calculateEditCursorState(
                        detectionPoint,
                        result.penPath,
                        result.pathId,
                        penState.autoAddDelete,
                        viewportZoom
                    );

                    if (hoverTarget.type === 'endpoint' && hoverTarget.anchorIndex !== undefined) {
                        continueFromEndpoint(result.pathId, hoverTarget.anchorIndex, useCanvasStore.getState);
                        return;
                    }

                    if (penState.editingPathId !== result.pathId || penState.editingSubPathIndex !== result.subPathIndex) {
                        // Start editing this path/subpath with the detected subpath
                        startEditingPath(result.pathId, result.subPathIndex, useCanvasStore.getState);
                        return;
                    }
                } else if (mode === 'editing') {
                    // Clicked on empty space while editing -> stop editing / start new path?
                    // Usually tools allow starting new path.
                    // Let's finalize editing (which just means deselecting/clearing state)
                    // and start new path.
                    cancelPath(useCanvasStore.getState); // Clears editing state
                    // Fall through to start new path
                }
            }

            if (mode === 'idle' || !currentPath) {
                // Start new path
                startPath(canvasPoint, useCanvasStore.getState);
                dragStartPointRef.current = { ...canvasPoint };
                rawDragStartPointRef.current = { ...detectionPoint };
                isDraggingRef.current = true;
                savedInHandleRef.current = null;
                return;
            }

            if (mode === 'drawing') {
                // Continue path - prepare for drag
                dragStartPointRef.current = { ...canvasPoint };
                rawDragStartPointRef.current = { ...detectionPoint };
                isDraggingRef.current = true;
                savedInHandleRef.current = null;
            }
        };

        /**
         * Handle pointer move - update preview or drag handles
         */
        const handlePointerMove = (event: PointerEvent) => {
            if (!svgRef.current) return;

            const rect = svgRef.current.getBoundingClientRect();
            const rawCanvasPoint = screenToCanvas(
                event.clientX - rect.left,
                event.clientY - rect.top
            );

            const state = useCanvasStore.getState();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const penState = (state as any).pen;

            if (!penState) return;

            const { mode, currentPath, rubberBandEnabled } = penState;
            const viewportZoom = state.viewport.zoom;

            // Apply snapping
            const excludeIds = penState.editingPathId ? [penState.editingPathId] : [];

            // Helper to apply snapping (duplicated from pointerDown, could be extracted)
            const getSnappedPoint = (point: Point) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const objectSnapStore = state as any;
                let finalPoint = point;
                let snapped = false;

                // 1. Object Snap
                if (objectSnapStore.applyObjectSnap) {
                    const snappedPoint = objectSnapStore.applyObjectSnap(point, excludeIds);
                    if (snappedPoint.x !== point.x || snappedPoint.y !== point.y) {
                        finalPoint = snappedPoint;
                        snapped = true;
                    }
                }

                // 2. Grid Snap (only if not snapped to object)
                if (!snapped) {
                    finalPoint = applyGridSnap(point);
                }
                return finalPoint;
            };

            const canvasPoint = getSnappedPoint(rawCanvasPoint);
            const detectionPoint = rawCanvasPoint;

            // Update modifier keys state
            isShiftPressedRef.current = event.shiftKey;
            isAltPressedRef.current = event.altKey;

            // Update cursor state and hover target based on hover (using detectionPoint)
            if (mode === 'drawing' && currentPath) {
                const { cursorState, hoverTarget } = calculateCursorState(
                    detectionPoint, // Use raw point for detection
                    mode,
                    currentPath,
                    penState.autoAddDelete,
                    viewportZoom
                );

                if (cursorState !== penState.cursorState || JSON.stringify(hoverTarget) !== JSON.stringify(penState.hoverTarget)) {
                    state.updatePenState?.({ cursorState, hoverTarget });
                }

                // Update rubber band preview if enabled (using snapped canvasPoint)
                if (rubberBandEnabled && !isDraggingRef.current) {
                    // Store preview point for rendering
                    state.updatePenState?.({
                        previewAnchor: {
                            id: 'preview',
                            position: canvasPoint,
                            type: 'corner',
                        }
                    });
                }
            } else if ((mode === 'idle' || mode === 'editing')) {
                // Check for existing paths to edit (using detectionPoint)
                let newCursorState = 'new-path';
                let newHoverTarget: typeof penState.hoverTarget = { type: 'none' };

                // If editing a specific path, check it first
                if (penState.editingPathId && penState.currentPath) {
                    const result = calculateEditCursorState(
                        detectionPoint, // Use raw point
                        penState.currentPath,
                        penState.editingPathId,
                        penState.autoAddDelete,
                        viewportZoom
                    );
                    newCursorState = result.cursorState;
                    newHoverTarget = { ...result.hoverTarget, subPathIndex: penState.editingSubPathIndex ?? 0 };
                }

                // If nothing found on current path, check others
                if (newHoverTarget.type === 'none') {
                    const result = findPathAtPoint(detectionPoint, state.elements, viewportZoom);
                    if (result) {
                        const editResult = calculateEditCursorState(
                            detectionPoint,
                            result.penPath,
                            result.pathId,
                            penState.autoAddDelete,
                            viewportZoom
                        );
                        // If we hit something specific (anchor/segment), show that cursor
                        // Otherwise show default (to indicate selection/editing start)
                        newCursorState = editResult.cursorState === 'default' ? 'default' : editResult.cursorState;
                        newHoverTarget = { ...editResult.hoverTarget, subPathIndex: result.subPathIndex };
                    } else {
                        // Not hovering over anything
                        if (penState.hoverTarget !== null) {
                            state.updatePenState?.({ hoverTarget: null });
                        }
                    }
                }

                if (newCursorState !== penState.cursorState) {
                    state.updatePenState?.({ cursorState: newCursorState });
                }
                if (JSON.stringify(newHoverTarget) !== JSON.stringify(penState.hoverTarget)) {
                    state.updatePenState?.({ hoverTarget: newHoverTarget });
                }
            }

            // Handle "Move Last Anchor" with Shift (when NOT dragging)
            // This allows repositioning the last placed anchor by holding Shift and moving the mouse
            if (!isDraggingRef.current && isShiftPressedRef.current && mode === 'drawing' && currentPath && currentPath.anchors.length > 0) {
                if (!isMovingLastAnchorRef.current) {
                    // Just started moving, save original position
                    isMovingLastAnchorRef.current = true;
                    const lastAnchor = currentPath.anchors[currentPath.anchors.length - 1];
                    lastAnchorOriginalPositionRef.current = { ...lastAnchor.position };
                }

                // Move the last anchor to current position
                moveLastAnchor(canvasPoint, useCanvasStore.getState);
            }

            // If we were moving the anchor but Shift key was released
            if (isMovingLastAnchorRef.current && !isShiftPressedRef.current) {
                // Stop moving mode
                isMovingLastAnchorRef.current = false;
                lastAnchorOriginalPositionRef.current = null;

                // We don't need to update dragStartPointRef here because we are not in a drag operation
            }

            // Handle dragging (using snapped canvasPoint)
            if (isDraggingRef.current && dragStartPointRef.current) {
                const state = useCanvasStore.getState();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const penState = (state as any).pen;

                // Check if dragging a handle
                if (penState?.dragState?.type === 'handle') {
                    const { anchorIndex, handleType } = penState.dragState;
                    if (anchorIndex !== undefined && handleType && penState.currentPath) {
                        const anchor = penState.currentPath.anchors[anchorIndex];
                        if (anchor) {
                            // Apply Shift constraint if needed
                            let finalHandlePos = canvasPoint;
                            if (isShiftPressedRef.current) {
                                finalHandlePos = constrainAngleTo45Degrees(anchor.position, canvasPoint);
                            }

                            // Update the handle in real-time
                            updateHandle(
                                anchorIndex,
                                handleType,
                                finalHandlePos,
                                anchor.position,
                                isAltPressedRef.current,
                                useCanvasStore.getState
                            );
                        }
                    }
                    return;
                }

                // Check if dragging an anchor
                if (penState?.dragState?.type === 'anchor') {
                    const { anchorIndex } = penState.dragState;
                    if (anchorIndex !== undefined) {
                        // Move the anchor to current position
                        moveAnchor(anchorIndex, canvasPoint, useCanvasStore.getState);
                    }
                    return;
                }

                // Check if dragging/curving a segment
                if (penState?.dragState?.type === 'segment') {
                    const { segmentIndex } = penState.dragState;
                    if (segmentIndex !== undefined && penState.currentPath) {
                        // Recalculate 't' parameter based on current mouse position
                        // to allow dynamic adjustment of handle weights
                        const result = findSegmentOnPath(detectionPoint, penState.currentPath, 20 / viewportZoom); // Use detectionPoint for finding segment t
                        const dynamicT = result && result.segmentIndex === segmentIndex ? result.t : 0.5;

                        // Curve the segment in real-time with dynamic t
                        curveSegment(segmentIndex, canvasPoint, dynamicT, useCanvasStore.getState);
                    }
                    return;
                }

                // Original drag logic for new anchors
                if (dragStartPointRef.current) {
                    // Calculate handle vector (outHandle)
                    const handleVector = {
                        x: canvasPoint.x - dragStartPointRef.current.x,
                        y: canvasPoint.y - dragStartPointRef.current.y,
                    };

                    // Apply Shift constraint to handle direction if needed
                    if (isShiftPressedRef.current) {
                        const constrainedEnd = constrainAngleTo45Degrees(dragStartPointRef.current, canvasPoint);
                        handleVector.x = constrainedEnd.x - dragStartPointRef.current.x;
                        handleVector.y = constrainedEnd.y - dragStartPointRef.current.y;
                    }

                    // Handle Alt key logic for Cusp Creation
                    if (isAltPressedRef.current) {
                        // If Alt is pressed, we are moving outHandle independently.
                        // We need to lock inHandle to what it was before Alt was pressed.
                        if (!savedInHandleRef.current) {
                            // If we just pressed Alt, save the current symmetric inHandle
                            savedInHandleRef.current = {
                                x: -handleVector.x,
                                y: -handleVector.y
                            };
                        }
                        // If we already saved it, keep it.
                    } else {
                        // If Alt is NOT pressed, inHandle is symmetric to outHandle
                        savedInHandleRef.current = {
                            x: -handleVector.x,
                            y: -handleVector.y
                        };
                    }
                    // The user wants visual feedback.
                    // Let's assume for now the preview shows symmetric, but creation is correct.
                    // Wait, user complained "Visual Feedback PENDIENTE DE PROBAR".
                    // If I want preview to be correct, I need to pass the locked handle.

                    // Update drag state for preview rendering
                    state.updatePenState?.({
                        dragState: {
                            type: 'new-anchor',
                            startPoint: dragStartPointRef.current,
                            currentPoint: canvasPoint,
                            // Pass explicit handles if available (for Cusp Creation visualization)
                            inHandle: savedInHandleRef.current || undefined,
                            outHandle: handleVector
                        },
                    });
                }
            }
        };

        /**
         * Handle pointer up - finalize anchor placement
         */
        const handlePointerUp = (event: PointerEvent) => {

            if (!svgRef.current || !isDraggingRef.current || !dragStartPointRef.current) return;

            const rect = svgRef.current.getBoundingClientRect();
            const canvasPoint = screenToCanvas(
                event.clientX - rect.left,
                event.clientY - rect.top
            );

            const state = useCanvasStore.getState();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const penState = (state as any).pen;

            if (!penState) return;

            const { mode, currentPath, dragState } = penState;

            // If dragging a handle, just clear the drag state (update was already done in move)
            if (dragState?.type === 'handle') {
                isDraggingRef.current = false;
                dragStartPointRef.current = null;
                state.updatePenState?.({ dragState: null });
                return;
            }

            // If dragging an anchor, just clear the drag state (update was already done in move)
            if (dragState?.type === 'anchor') {
                isDraggingRef.current = false;
                dragStartPointRef.current = null;
                state.updatePenState?.({ dragState: null });
                return;
            }

            // If dragging/curving a segment, just clear the drag state (update was already done in move)
            if (dragState?.type === 'segment') {
                isDraggingRef.current = false;
                dragStartPointRef.current = null;
                state.updatePenState?.({ dragState: null });
                return;
            }

            if (mode === 'drawing') {
                // Calculate distance moved using RAW points to avoid snap-induced drags
                let isDragGesture = false;

                if (rawDragStartPointRef.current) {
                    const rawCurrentPoint = screenToCanvas(
                        event.clientX - rect.left,
                        event.clientY - rect.top
                    );
                    const rawDist = distance(rawDragStartPointRef.current, rawCurrentPoint);
                    isDragGesture = rawDist > 2 / viewportZoom;
                } else {
                    // Fallback to snapped distance if raw not available
                    const dist = distance(dragStartPointRef.current, canvasPoint);
                    isDragGesture = dist > 2 / viewportZoom;
                }

                if (isDragGesture) {
                    // It's a drag - create curved point with handles
                    // Calculate handle vector (outHandle) based on snapped points
                    const handleVector = {
                        x: canvasPoint.x - dragStartPointRef.current.x,
                        y: canvasPoint.y - dragStartPointRef.current.y,
                    };

                    // Apply Shift constraint to handle direction if needed
                    if (isShiftPressedRef.current) {
                        const constrainedEnd = constrainAngleTo45Degrees(dragStartPointRef.current, canvasPoint);
                        handleVector.x = constrainedEnd.x - dragStartPointRef.current.x;
                        handleVector.y = constrainedEnd.y - dragStartPointRef.current.y;
                    }

                    if (isAltPressedRef.current && savedInHandleRef.current) {
                        // Add with symmetric handles first (using outHandle)
                        // Check if we are dragging the last anchor (e.g. first point creation)
                        const lastAnchor = currentPath?.anchors[currentPath.anchors.length - 1];
                        const isDraggingLastAnchor = lastAnchor && distance(lastAnchor.position, dragStartPointRef.current) < 0.1;

                        if (isDraggingLastAnchor) {
                            // Update existing anchor handles
                            updateAnchorHandles(
                                currentPath.anchors.length - 1,
                                {
                                    inHandle: savedInHandleRef.current,
                                    outHandle: handleVector
                                },
                                useCanvasStore.getState
                            );

                            // Ensure type is set to cusp
                            const stateAfterUpdate = useCanvasStore.getState();
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const penStateAfterUpdate = (stateAfterUpdate as any).pen;
                            const updatedPath = penStateAfterUpdate.currentPath;
                            if (updatedPath && updatedPath.anchors.length > 0) {
                                const newIndex = updatedPath.anchors.length - 1;
                                const anchors = [...updatedPath.anchors];
                                anchors[newIndex] = {
                                    ...anchors[newIndex],
                                    type: 'cusp'
                                };
                                stateAfterUpdate.updatePenState?.({
                                    currentPath: {
                                        ...updatedPath,
                                        anchors
                                    }
                                });
                            }
                        } else {
                            // Add new anchor
                            addCurvedAnchor(dragStartPointRef.current, handleVector, useCanvasStore.getState);

                            // Then immediately update to set the correct inHandle and type
                            const stateAfterAdd = useCanvasStore.getState();
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const penStateAfterAdd = (stateAfterAdd as any).pen;
                            const updatedPath = penStateAfterAdd.currentPath;

                            if (updatedPath && updatedPath.anchors.length > 0) {
                                const newIndex = updatedPath.anchors.length - 1;
                                const anchors = [...updatedPath.anchors];
                                anchors[newIndex] = {
                                    ...anchors[newIndex],
                                    type: 'cusp',
                                    inHandle: savedInHandleRef.current,
                                    outHandle: handleVector
                                };

                                stateAfterAdd.updatePenState?.({
                                    currentPath: {
                                        ...updatedPath,
                                        anchors
                                    }
                                });
                            }
                        }
                    } else {
                        // Check if we are dragging the last anchor (e.g. first point creation)
                        const lastAnchor = currentPath?.anchors[currentPath.anchors.length - 1];
                        const isDraggingLastAnchor = lastAnchor && distance(lastAnchor.position, dragStartPointRef.current) < 0.1;

                        if (isDraggingLastAnchor) {
                            // Update existing anchor handles
                            updateAnchorHandles(
                                currentPath.anchors.length - 1,
                                {
                                    outHandle: handleVector,
                                    // Explicitly set symmetric inHandle so it's preserved for path closing
                                    inHandle: {
                                        x: -handleVector.x,
                                        y: -handleVector.y
                                    }
                                },
                                useCanvasStore.getState
                            );
                        } else {
                            addCurvedAnchor(dragStartPointRef.current, handleVector, useCanvasStore.getState);
                        }
                    }
                } else {
                    // Simple click - add straight anchor
                    // Use dragStartPointRef.current (snapped down position) as the anchor position
                    let finalPoint = dragStartPointRef.current;

                    // Apply Shift constraint for straight lines
                    if (isShiftPressedRef.current && currentPath && currentPath.anchors.length > 0) {
                        const lastAnchor = currentPath.anchors[currentPath.anchors.length - 1];
                        finalPoint = constrainAngleTo45Degrees(lastAnchor.position, dragStartPointRef.current);
                    }

                    // Check if we are clicking on the last anchor (duplicate click)
                    const lastAnchor = currentPath?.anchors[currentPath.anchors.length - 1];
                    const isClickingLastAnchor = lastAnchor && distance(lastAnchor.position, finalPoint) < 0.1;

                    if (!isClickingLastAnchor) {
                        // Check for snap-to-close (clicking near start point)
                        // Useful for mobile where hover is not available
                        let closed = false;
                        if (currentPath && currentPath.anchors.length >= 3) {
                            const firstAnchor = currentPath.anchors[0];
                            const distToFirst = distance(firstAnchor.position, finalPoint);
                            // Threshold: 10 screen pixels converted to canvas units
                            if (distToFirst < 10 / viewportZoom) {
                                closePath(useCanvasStore.getState);
                                closed = true;
                            }
                        }

                        if (!closed) {
                            addStraightAnchor(finalPoint, useCanvasStore.getState);
                        }
                    }
                }
            }

            // Reset drag state
            isDraggingRef.current = false;
            dragStartPointRef.current = null;
            savedInHandleRef.current = null;
            state.updatePenState?.({ dragState: null });
        };

        /**
         * Handle keyboard events
         */
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Shift') {
                isShiftPressedRef.current = true;
            } else if (event.key === 'Alt') {
                isAltPressedRef.current = true;

            } else if (event.key === 'Enter') {
                // Finalize current path
                finalizePath(useCanvasStore.getState);
            } else if (event.key === 'Escape') {
                // Cancel current path
                cancelPath(useCanvasStore.getState);
            }
        };

        const handleKeyUp = (event: KeyboardEvent) => {
            if (event.key === 'Shift') {
                isShiftPressedRef.current = false;
            } else if (event.key === 'Alt') {
                isAltPressedRef.current = false;

            }
        };

        // Install event listeners
        window.addEventListener('pointerdown', handlePointerDown);
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);


        return () => {
            window.removeEventListener('pointerdown', handlePointerDown);
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [isActive, svgRef, screenToCanvas, viewportZoom]);
}
