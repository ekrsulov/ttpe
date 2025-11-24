import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../store/canvasStore';
import type { CanvasElement, GroupElement, PathElement } from '../../types';
import { importSVGWithDimensions, type ImportedElement } from '../../utils/svgImportUtils';

export interface SourcePluginSlice {
    source: {
        isDialogOpen: boolean;
        svgContent: string;
        hasUnsavedChanges: boolean;
    };
    setSourceDialogOpen: (isOpen: boolean) => void;
    setSourceSvgContent: (content: string) => void;
    setSourceHasUnsavedChanges: (hasChanges: boolean) => void;
    importSvgToCanvas: (file: File) => Promise<void>;
}

// Helper to convert ImportedElement to CanvasElement
const convertImportedToCanvasElement = (
    imported: ImportedElement,
    parentId: string | null,
    zIndex: number
): CanvasElement[] => {
    const id = `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const elements: CanvasElement[] = [];

    if (imported.type === 'group') {
        const childIds: string[] = [];
        let currentZIndex = 0;

        // Process children first to get their IDs
        const childrenElements: CanvasElement[] = [];
        imported.children.forEach((child) => {
            const convertedChildren = convertImportedToCanvasElement(child, id, currentZIndex++);
            childrenElements.push(...convertedChildren);
            // The first element in the returned array is the direct child (root of the converted tree)
            if (convertedChildren.length > 0) {
                childIds.push(convertedChildren[0].id);
            }
        });

        const groupElement: GroupElement = {
            id,
            type: 'group',
            zIndex,
            parentId,
            data: {
                childIds,
                name: imported.name || `Group ${id.substr(-4)}`,
                isLocked: false,
                isHidden: false,
                isExpanded: true,
                transform: {
                    translateX: 0,
                    translateY: 0,
                    rotation: 0,
                    scaleX: 1,
                    scaleY: 1,
                },
            },
        };

        elements.push(groupElement);
        elements.push(...childrenElements);
    } else if (imported.type === 'path') {
        const pathElement: PathElement = {
            id,
            type: 'path',
            zIndex,
            parentId,
            data: imported.data,
        };
        elements.push(pathElement);
    }

    return elements;
};

export const createSourcePluginSlice: StateCreator<
    CanvasStore,
    [],
    [],
    SourcePluginSlice
> = (set) => ({
    source: {
        isDialogOpen: false,
        svgContent: '',
        hasUnsavedChanges: false,
    },
    setSourceDialogOpen: (isOpen) =>
        set((state) => ({
            source: { ...state.source, isDialogOpen: isOpen },
        })),
    setSourceSvgContent: (content) =>
        set((state) => ({
            source: { ...state.source, svgContent: content },
        })),
    setSourceHasUnsavedChanges: (hasChanges) =>
        set((state) => ({
            source: { ...state.source, hasUnsavedChanges: hasChanges },
        })),
    importSvgToCanvas: async (file: File) => {
        try {
            const { elements: importedElements } = await importSVGWithDimensions(file);

            const newCanvasElements: CanvasElement[] = [];
            let zIndex = 0;

            importedElements.forEach((imported) => {
                const converted = convertImportedToCanvasElement(imported, null, zIndex++);
                newCanvasElements.push(...converted);
            });

            set({
                elements: newCanvasElements,
                selectedIds: [],
                activePlugin: 'select',
            });

            // Reset unsaved changes and close dialog
            set((state) => ({
                source: {
                    ...state.source,
                    hasUnsavedChanges: false,
                    isDialogOpen: false,
                }
            }));

        } catch (error) {
            console.error('Failed to import SVG:', error);
            throw error;
        }
    },
});
