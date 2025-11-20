import type { StateCreator } from 'zustand';
import type { CanvasElement, PathData, SubPath } from '../../types';
import { performPathSimplifyPaperJS } from '../../utils/pathOperationsUtils';
import { extractSubpaths } from '../../utils/pathParserUtils';

export interface PathSimplificationPluginSlice {
    pathSimplification: {
        tolerance: number;
    };

    // Actions
    updatePathSimplification: (settings: Partial<{ tolerance: number }>) => void;
    applyPathSimplification: () => void;
}

// Type for accessing full canvas store
type FullCanvasState = {
    elements: CanvasElement[];
    updateElement: (id: string, updates: Partial<CanvasElement>) => void;
    pathSimplification?: { tolerance: number };
    selectedCommands?: Array<{ elementId: string; commandIndex: number; pointIndex: number }>;
    selectedIds?: string[];
    editingPoint?: { elementId: string } | null;
    selectedSubpaths?: Array<{ elementId: string; subpathIndex: number }>;
    clearSelectedCommands?: () => void;
};

export const createPathSimplificationPluginSlice: StateCreator<
    PathSimplificationPluginSlice,
    [],
    [],
    PathSimplificationPluginSlice
> = (set, get) => ({
    pathSimplification: {
        tolerance: 1.0,
    },

    updatePathSimplification: (settings) => {
        set((state) => ({
            pathSimplification: { ...state.pathSimplification, ...settings },
        }));
    },

    applyPathSimplification: () => {
        const state = get() as unknown as FullCanvasState;
        const { tolerance } = state.pathSimplification ?? { tolerance: 1 };

        // Find the active element
        let targetElementId: string | null = null;
        if ((state.selectedCommands?.length ?? 0) > 0) {
            targetElementId = state.selectedCommands?.[0].elementId ?? null;
        } else if (state.editingPoint) {
            targetElementId = state.editingPoint.elementId;
        } else if (state.selectedIds && state.selectedIds.length > 0) {
            targetElementId = state.selectedIds[0];
        }

        if (!targetElementId) return;

        const element = state.elements.find((el) => el.id === targetElementId);
        if (!element || element.type !== 'path') return;

        const pathData = element.data as PathData;
        const allCommands = pathData.subPaths.flat();

        // Check if we have selected subpaths
        const hasSelectedSubpaths = (state.selectedSubpaths?.length ?? 0) > 0;
        const selectedSubpathsForElement = hasSelectedSubpaths
            ? (state.selectedSubpaths ?? []).filter((sp) => sp.elementId === targetElementId)
            : [];

        if (selectedSubpathsForElement.length > 0) {
            // Apply simplification only to selected subpaths
            const subpaths = extractSubpaths(allCommands);
            const newSubPaths: SubPath[] = [];

            subpaths.forEach((subpathData, index) => {
                const isSelected = selectedSubpathsForElement.some((sp) => sp.subpathIndex === index);

                if (isSelected) {
                    const tempPathData: PathData = {
                        ...pathData,
                        subPaths: [subpathData.commands],
                    };

                    const simplifiedTempPath = performPathSimplifyPaperJS(tempPathData, tolerance);

                    if (simplifiedTempPath && simplifiedTempPath.subPaths.length > 0) {
                        newSubPaths.push(simplifiedTempPath.subPaths[0]);
                    } else {
                        newSubPaths.push(subpathData.commands);
                    }
                } else {
                    newSubPaths.push(subpathData.commands);
                }
            });

            state.updateElement(targetElementId, {
                data: { ...pathData, subPaths: newSubPaths },
            });
        } else if ((state.selectedCommands?.length ?? 0) > 0) {
            // Simplify only the selected portion
            const selectedElementId = state.selectedCommands?.[0].elementId ?? '';
            const selectedCommands = (state.selectedCommands ?? []).filter((cmd) => cmd.elementId === selectedElementId);

            const commandIndices = selectedCommands.map((cmd) => cmd.commandIndex);
            const minCommandIndex = Math.min(...commandIndices);
            const maxCommandIndex = Math.max(...commandIndices);

            let selectedSubPath = allCommands.slice(minCommandIndex, maxCommandIndex + 1);
            let addedArtificialM = false;

            // Ensure starts with M  command
            if (selectedSubPath.length > 0 && selectedSubPath[0].type !== 'M') {
                let startPosition: { x: number; y: number } = { x: 0, y: 0 };

                if (minCommandIndex > 0) {
                    const prevCommand = allCommands[minCommandIndex - 1];
                    if (prevCommand.type !== 'Z' && 'position' in prevCommand) {
                        startPosition = prevCommand.position;
                    }
                }

                if (startPosition.x === 0 && startPosition.y === 0) {
                    const firstCmd = selectedSubPath[0];
                    if (firstCmd.type !== 'Z' && 'position' in firstCmd) {
                        startPosition = firstCmd.position;
                    }
                }

                selectedSubPath = [{ type: 'M' as const, position: startPosition }, ...selectedSubPath];
                addedArtificialM = true;
            }

            const tempPathData: PathData = {
                ...pathData,
                subPaths: [selectedSubPath],
            };

            const simplifiedTempPath = performPathSimplifyPaperJS(tempPathData, tolerance);

            if (simplifiedTempPath && simplifiedTempPath.subPaths.length > 0) {
                let simplifiedCommands = simplifiedTempPath.subPaths[0];

                if (addedArtificialM && simplifiedCommands.length > 0 && simplifiedCommands[0].type === 'M') {
                    simplifiedCommands = simplifiedCommands.slice(1);
                }

                if (minCommandIndex > 0 && simplifiedCommands.length > 0 && simplifiedCommands[0].type === 'M') {
                    simplifiedCommands = [{ type: 'L', position: simplifiedCommands[0].position }, ...simplifiedCommands.slice(1)];
                }

                const newCommands = [...allCommands];
                newCommands.splice(minCommandIndex, maxCommandIndex - minCommandIndex + 1, ...simplifiedCommands);

                const newSubPaths = extractSubpaths(newCommands).map((s) => s.commands);

                state.updateElement(targetElementId, {
                    data: { ...pathData, subPaths: newSubPaths },
                });

                state.clearSelectedCommands?.();
            }
        } else {
            // No selection - simplify the entire path
            const simplifiedPathData = performPathSimplifyPaperJS(pathData, tolerance);

            if (simplifiedPathData) {
                state.updateElement(targetElementId, {
                    data: simplifiedPathData,
                });
            }
        }
    },
});
