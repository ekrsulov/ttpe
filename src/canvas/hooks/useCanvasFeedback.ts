import { useEffect } from 'react';
import { extractEditablePoints } from '../../utils/pathParserUtils';
import type { CanvasElement, PathData } from '../../types';

export interface SelectedCommand {
    elementId: string;
    commandIndex: number;
    pointIndex: number;
}

export interface UseCanvasFeedbackParams {
    currentMode: string | null;
    selectedCommands: SelectedCommand[];
    elements: CanvasElement[];
    updatePointPositionFeedback?: (x: number, y: number, visible: boolean) => void;
}

export function useCanvasFeedback({
    currentMode,
    selectedCommands,
    elements,
    updatePointPositionFeedback,
}: UseCanvasFeedbackParams): void {
    // Update point position feedback when selection changes
    useEffect(() => {
        if (!updatePointPositionFeedback) return;

        if (currentMode === 'edit' && selectedCommands.length === 1) {
            const selectedCommand = selectedCommands[0];
            const element = elements.find(el => el.id === selectedCommand.elementId);

            if (element && element.type === 'path') {
                const pathData = element.data as PathData;
                const commands = pathData.subPaths.flat();
                const points = extractEditablePoints(commands);

                // Find the specific point
                const point = points.find(p =>
                    p.commandIndex === selectedCommand.commandIndex &&
                    p.pointIndex === selectedCommand.pointIndex
                );

                if (point) {
                    updatePointPositionFeedback(point.x, point.y, true);
                    return;
                }
            }
        }

        // Hide feedback if conditions not met
        updatePointPositionFeedback(0, 0, false);
    }, [currentMode, selectedCommands, elements, updatePointPositionFeedback]);
}
