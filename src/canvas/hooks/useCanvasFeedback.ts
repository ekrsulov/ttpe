import { useEffect } from 'react';
import { extractEditablePoints } from '../../utils/pathParserUtils';
import type { CanvasElement, PathData } from '../../types';
import { pluginManager } from '../../utils/pluginManager';

export interface SelectedCommand {
    elementId: string;
    commandIndex: number;
    pointIndex: number;
}

export interface UseCanvasFeedbackParams {
    currentMode: string | null;
    selectedCommands: SelectedCommand[];
    elements: CanvasElement[];
    /** Optional callback to update point position feedback UI */
    onPointPositionChange?: (x: number, y: number, visible: boolean) => void;
}

/**
 * Hook that provides visual feedback for selected points.
 * When a single point is selected and the plugin has showPointFeedback enabled,
 * it reports the point's position.
 */
export function useCanvasFeedback({
    currentMode,
    selectedCommands,
    elements,
    onPointPositionChange,
}: UseCanvasFeedbackParams): void {
    useEffect(() => {
        if (!onPointPositionChange) return;

        // Check if the current plugin wants point feedback
        const shouldShowFeedback = pluginManager.shouldShowPointFeedback();

        if (shouldShowFeedback && selectedCommands.length === 1) {
            const selectedCommand = selectedCommands[0];
            const element = elements.find(el => el.id === selectedCommand.elementId);

            if (element && element.type === 'path') {
                const pathData = element.data as PathData;
                const commands = pathData.subPaths.flat();
                const points = extractEditablePoints(commands);

                const point = points.find(p =>
                    p.commandIndex === selectedCommand.commandIndex &&
                    p.pointIndex === selectedCommand.pointIndex
                );

                if (point) {
                    onPointPositionChange(point.x, point.y, true);
                    return;
                }
            }
        }

        onPointPositionChange(0, 0, false);
    }, [currentMode, selectedCommands, elements, onPointPositionChange]);
}
