import type { StateCreator } from 'zustand';
import type { CanvasElement, PathData, SubPath } from '../../types';
import { performPathRound } from '../../utils/pathOperationsUtils';
import { extractSubpaths } from '../../utils/pathParserUtils';

export interface RoundPathPluginSlice {
    pathRounding: {
        radius: number;
    };

    // Actions
    updatePathRounding: (settings: Partial<{ radius: number }>) => void;
    applyPathRounding: () => void;
}

// Type for accessing full canvas store
type FullCanvasState = {
    elements: CanvasElement[];
    updateElement: (id: string, updates: Partial<CanvasElement>) => void;
    pathRounding?: { radius: number };
    selectedCommands?: Array<{ elementId: string; commandIndex: number; pointIndex: number }>;
    selectedIds?: string[];
    editingPoint?: { elementId: string } | null;
    selectedSubpaths?: Array<{ elementId: string; subpathIndex: number }>;
    clearSelectedCommands?: () => void;
};

export const createRoundPathPluginSlice: StateCreator<RoundPathPluginSlice, [], [], RoundPathPluginSlice> = (
    set,
    get
) => ({
    pathRounding: {
        radius: 5.0,
    },

    updatePathRounding: (settings) => {
        set((state) => ({
            pathRounding: { ...state.pathRounding, ...settings },
        }));
    },

    applyPathRounding: () => {
        const state = get() as unknown as FullCanvasState;
        const { radius } = state.pathRounding ?? { radius: 5 };

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

        // Check if we have selected subpaths
        const hasSelectedSubpaths = (state.selectedSubpaths?.length ?? 0) > 0;
        const selectedSubpathsForElement = hasSelectedSubpaths
            ? (state.selectedSubpaths ?? []).filter((sp) => sp.elementId === targetElementId)
            : [];

        if (selectedSubpathsForElement.length > 0) {
            // Apply rounding only to selected subpaths
            const allCommands = pathData.subPaths.flat();
            const subpaths = extractSubpaths(allCommands);
            const newSubPaths: SubPath[] = [];

            subpaths.forEach((subpathData, index) => {
                const isSelected = selectedSubpathsForElement.some((sp) => sp.subpathIndex === index);

                if (isSelected) {
                    const tempPathData: PathData = {
                        ...pathData,
                        subPaths: [subpathData.commands],
                    };

                    const roundedTempPath = performPathRound(tempPathData, radius);

                    if (roundedTempPath && roundedTempPath.subPaths.length > 0) {
                        newSubPaths.push(roundedTempPath.subPaths[0]);
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

            state.clearSelectedCommands?.();
        } else {
            // Apply path rounding to the entire path
            const roundedPathData = performPathRound(pathData, radius);

            if (roundedPathData) {
                state.updateElement(targetElementId, {
                    data: roundedPathData,
                });

                state.clearSelectedCommands?.();
            }
        }
    },
});
