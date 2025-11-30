import { formatToPrecision, PATH_DECIMAL_PRECISION } from '../../utils';
import { extractEditablePoints, updateCommands, extractSubpaths, getControlPointAlignmentInfo } from '../../utils/pathParserUtils';
import { mapSvgToCanvas } from '../../utils/geometry';
import { pluginManager } from '../../utils/pluginManager';
import type { CanvasElement, SubPath, ControlPointInfo, Command, PathData } from '../../types';

export interface DragState {
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

export interface DragCallbacks {
    onStopDraggingPoint: () => void;
    onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
    getControlPointInfo: (elementId: string, commandIndex: number, pointIndex: number) => ControlPointInfo | null;
}

export const calculateDragPosition = (
    e: MouseEvent,
    viewport: { zoom: number; panX: number; panY: number },
    dragState: DragState
): { canvasX: number; canvasY: number } | null => {
    const svgElement = document.querySelector('svg');
    if (!svgElement) return null;

    const svgRect = svgElement.getBoundingClientRect();
    const svgX = e.clientX - svgRect.left;
    const svgY = e.clientY - svgRect.top;

    const canvasPoint = mapSvgToCanvas(svgX, svgY, viewport);
    const canvasX = canvasPoint.x;
    const canvasY = canvasPoint.y;

    // Apply drag modifiers
    const modifiers = pluginManager.getDragModifiers();
    let modifiedPoint = { x: canvasX, y: canvasY };

    const excludeElementIds: string[] = [];
    if (dragState.editingPoint) {
        excludeElementIds.push(dragState.editingPoint.elementId);
    } else if (dragState.draggingSelection) {
        dragState.draggingSelection.initialPositions.forEach(pos => {
            if (!excludeElementIds.includes(pos.elementId)) {
                excludeElementIds.push(pos.elementId);
            }
        });
    } else if (dragState.draggingSubpaths) {
        dragState.draggingSubpaths.initialPositions.forEach(pos => {
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

    return { canvasX: modifiedPoint.x, canvasY: modifiedPoint.y };
};

export const updateSinglePointPath = (
    editingPoint: NonNullable<DragState['editingPoint']>,
    canvasX: number,
    canvasY: number,
    elements: CanvasElement[],
    callbacks: DragCallbacks
) => {
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
                const alignmentInfo = getControlPointAlignmentInfo(commands, points, editingPoint.commandIndex, editingPoint.pointIndex);

                if (alignmentInfo && (alignmentInfo.type === 'aligned' || alignmentInfo.type === 'mirrored')) {
                    const pairedCommandIndex = alignmentInfo.pairedCommandIndex;
                    const pairedPointIndex = alignmentInfo.pairedPointIndex;
                    const anchor = alignmentInfo.anchor;

                    if (pairedCommandIndex !== undefined && pairedPointIndex !== undefined) {
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
                                pairedX = anchor.x + (-unitVector.x * magnitude);
                                pairedY = anchor.y + (-unitVector.y * magnitude);
                            } else {
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

export const updateGroupDragPaths = (
    draggingSelection: NonNullable<DragState['draggingSelection']>,
    canvasX: number,
    canvasY: number,
    elements: CanvasElement[],
    originalPathDataMap: Record<string, SubPath[]> | null,
    callbacks: DragCallbacks
) => {
    const deltaX = formatToPrecision(canvasX - draggingSelection.startX, PATH_DECIMAL_PRECISION);
    const deltaY = formatToPrecision(canvasY - draggingSelection.startY, PATH_DECIMAL_PRECISION);

    if (originalPathDataMap) {
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
