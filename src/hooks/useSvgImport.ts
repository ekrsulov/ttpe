import { useCallback } from 'react';
import { useToast } from '@chakra-ui/react';
import { useCanvasStore } from '../store/canvasStore';
import { DEFAULT_MODE } from '../constants';
import {
    logger,
    importSVGWithDimensions,
    measurePath,
    performPathUnion,
    transformCommands,
    translateCommands,
    calculateScaledStrokeWidth,
    flattenImportedElements
} from '../utils';
import {
    addImportedElementsToCanvas,
    mapImportedElements,
    translateImportedElements
} from '../utils/importHelpers';
import type { PathData } from '../types';

export interface ImportOptions {
    appendMode?: boolean;
    resizeImport?: boolean;
    resizeWidth?: number;
    resizeHeight?: number;
    applyUnion?: boolean;
    addFrame?: boolean;
}

export const useSvgImport = () => {
    const toast = useToast();
    const addElement = useCanvasStore(state => state.addElement);
    const updateElement = useCanvasStore(state => state.updateElement);
    const clearSelection = useCanvasStore(state => state.clearSelection);
    const selectElements = useCanvasStore(state => state.selectElements);
    const setActivePlugin = useCanvasStore(state => state.setActivePlugin);
    const settings = useCanvasStore(state => state.settings);

    // Helper function to create a frame rectangle
    const createFrame = useCallback((width: number, height: number): PathData => {
        const defaultStrokeColor = settings.defaultStrokeColor;
        return {
            subPaths: [[
                { type: 'M', position: { x: 0, y: 0 } },
                { type: 'L', position: { x: width, y: 0 } },
                { type: 'L', position: { x: width, y: height } },
                { type: 'L', position: { x: 0, y: height } },
                { type: 'Z' }
            ]],
            strokeWidth: 1,
            strokeColor: defaultStrokeColor,
            strokeOpacity: 1,
            fillColor: 'none',
            fillOpacity: 1,
            strokeLinecap: 'round',
            strokeLinejoin: 'round'
        };
    }, [settings.defaultStrokeColor]);

    const importSvgFiles = useCallback(async (files: FileList | File[], options: ImportOptions = {}) => {
        if (!files || files.length === 0) return;

        const {
            appendMode = false,
            resizeImport = settings.importResize,
            resizeWidth = settings.importResizeWidth,
            resizeHeight = settings.importResizeHeight,
            applyUnion = settings.importApplyUnion,
            addFrame = settings.importAddFrame
        } = options;

        try {
            logger.info('Importing SVG files', { fileCount: files.length });

            // Clear selection if not in append mode
            if (!appendMode) {
                clearSelection();
            }

            const selectionIds: string[] = [];
            let importedPathCount = 0;

            // Grid layout variables for organizing imported SVGs
            let currentXOffset = 0;        // Current horizontal position in the row
            let currentYOffset = 0;        // Current vertical position (row start)
            let currentRowMaxHeight = 0;   // Maximum height in current row
            const margin = 160;            // Margin between imported groups (4x increased for maximum spacing)
            const maxRowWidth = 12288;     // Maximum horizontal width per row (3x 4096px for very wide rows)
            let importedGroupCounter = 1;
            const getNextGroupName = () => `Imported Group ${importedGroupCounter++}`;

            // Global zIndex counter for the entire import batch
            // We start with a high enough number or just let it increment from 0 relative to this batch?
            // The addImportedElementsToCanvas uses a counter object.
            // If we want to respect global order across multiple files, we should share the counter.
            // However, addElement in baseSlice handles zIndex if not provided explicitly, 
            // OR if provided explicitly it uses it.
            // Our new addImportedElementsToCanvas logic uses a counter starting at 0.
            // If we use explicit zIndex, we might conflict with existing elements if we just start at 0?
            // Wait, addElement implementation:
            // const zIndex = explicitZIndex !== undefined ? explicitZIndex : ...
            // If we pass explicitZIndex 0, it will be 0.
            // If we have existing elements, we probably want to append to the end.
            // But we don't know the current max zIndex easily without querying the store.
            // Actually, for drag and drop, we usually want to add on top.
            // If we don't pass explicitZIndex to addElement, it calculates based on sibling count, which effectively appends to the end.
            // BUT, we changed addImportedElementsToCanvas to ALWAYS pass explicitZIndex derived from the counter.
            // If we start the counter at 0, we might be inserting elements at the bottom (zIndex 0) or overwriting zIndices?
            // No, zIndex is just a property. Multiple elements can have same zIndex (though sorting might be unstable).
            // But we want them to be ON TOP of existing elements.

            // Let's check baseSlice.ts again.
            // const zIndex = parentId ? existingElements.filter(...).length : existingElements.filter(...).length;
            // This logic puts new elements at the end (highest zIndex).

            // If we use our new logic with explicitZIndex, we need to know where to start.
            // If we pass 0, it will be 0.

            // We should probably get the current max zIndex from the store to start our counter?
            // Or, we can modify addImportedElementsToCanvas to NOT pass explicitZIndex if we want default behavior (append).
            // BUT, the whole point of the previous fix was to control the order WITHIN the imported group/hierarchy.

            // If we want to maintain relative order within the import BUT append to the end of existing elements:
            // We need to know the starting zIndex.
            // We can get `state.elements.length` (for root elements).
            // But for nested elements, it's relative to parent.

            // Wait, the previous fix was: "Assign global zIndex values that respect document order across the entire tree."
            // And we modified addElement to use explicitZIndex if provided.
            // And we modified addImportedElementsToCanvas to use a global counter and pass it.

            // If we import a new file, we want its elements to be after all existing elements.
            // So we should initialize the counter with the current number of elements?
            // Or better, the current highest zIndex + 1?
            // Actually, zIndex in our system seems to be "index in the array" effectively, or at least "rendering order".
            // If we have 10 elements (0-9), we want the next one to be 10.

            // So we should initialize globalZIndexCounter with `useCanvasStore.getState().elements.length`.
            // But `elements` includes ALL elements (nested ones too).
            // If we use a single global zIndex for EVERYTHING, then yes, elements.length is a good approximation if zIndices are dense.
            // If zIndices are sparse or not strictly sequential, we might want `max(zIndex) + 1`.
            // But `baseSlice` logic `existingElements.filter((el) => !el.parentId).length` implies zIndex is per-parent-scope in the OLD logic.
            // The NEW logic we introduced in the previous task seems to imply we want a GLOBAL zIndex for everything?
            // Let's re-read the previous fix.
            // "Assign global zIndex values that respect document order across the entire tree."
            // And we updated `convertImportedToCanvasElement` (for source plugin) and `addImportedElementsToCanvas` (for file panel).

            // If we use a global zIndex, then `zIndex` property on `CanvasElement` is now a global rendering order.
            // The `CanvasControllerContext` sorts by this zIndex.
            // So yes, we need to pick a zIndex that is higher than any existing element.

            const currentElements = useCanvasStore.getState().elements;
            const maxZIndex = currentElements.length > 0
                ? Math.max(...currentElements.map(e => e.zIndex))
                : -1;
            const globalZIndexCounter = { value: maxZIndex + 1 };

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                logger.info('Processing SVG file', { fileName: file.name, index: i });

                const { dimensions, elements: importedElements } = await importSVGWithDimensions(file);

                if (!importedElements || importedElements.length === 0) {
                    logger.warn('No paths found in SVG file', { fileName: file.name });
                    continue;
                }

                let workingElements = importedElements;
                let pathDataArray = flattenImportedElements(workingElements);

                if (pathDataArray.length === 0) {
                    logger.warn('No paths found after parsing SVG elements', { fileName: file.name });
                    continue;
                }

                // Apply resize if requested
                if (resizeImport && dimensions.width > 0 && dimensions.height > 0) {
                    const scaleX = resizeWidth / dimensions.width;
                    const scaleY = resizeHeight / dimensions.height;

                    workingElements = mapImportedElements(workingElements, (pathData) => {
                        const scaledSubPaths = pathData.subPaths.map(subPath =>
                            transformCommands(subPath, {
                                scaleX,
                                scaleY,
                                originX: 0,
                                originY: 0,
                                rotation: 0,
                                rotationCenterX: 0,
                                rotationCenterY: 0,
                            })
                        );

                        return {
                            ...pathData,
                            subPaths: scaledSubPaths,
                            strokeWidth: calculateScaledStrokeWidth(pathData.strokeWidth, scaleX, scaleY),
                        };
                    });

                    pathDataArray = flattenImportedElements(workingElements);
                } else if (resizeImport) {
                    logger.warn('Resize requested but SVG dimensions are missing or zero', { fileName: file.name });
                }

                // Apply union if requested
                if (applyUnion) {
                    const unionSource = flattenImportedElements(workingElements);
                    if (unionSource.length > 1) {
                        const unionResult = performPathUnion(unionSource);
                        if (unionResult) {
                            workingElements = [{ type: 'path', data: unionResult }];
                            pathDataArray = flattenImportedElements(workingElements);
                        }
                    }
                }

                // Recalculate bounds after resize and union operations
                let finalGroupMinX = Infinity;
                let finalGroupMaxX = -Infinity;
                let finalGroupMinY = Infinity;
                let finalGroupMaxY = -Infinity;

                pathDataArray.forEach(pathData => {
                    const bounds = measurePath(pathData.subPaths, pathData.strokeWidth, 1);
                    finalGroupMinX = Math.min(finalGroupMinX, bounds.minX);
                    finalGroupMaxX = Math.max(finalGroupMaxX, bounds.maxX);
                    finalGroupMinY = Math.min(finalGroupMinY, bounds.minY);
                    finalGroupMaxY = Math.max(finalGroupMaxY, bounds.maxY);
                });

                const finalGroupWidth = finalGroupMaxX - finalGroupMinX;
                const finalGroupHeight = finalGroupMaxY - finalGroupMinY;

                // Grid layout: Check if current SVG fits in the current row
                if (currentXOffset > 0 && currentXOffset + finalGroupWidth > maxRowWidth) {
                    currentXOffset = 0;
                    currentYOffset += currentRowMaxHeight + margin;
                    currentRowMaxHeight = 0;
                }

                // Apply translation to position this group in the grid
                const translateX = currentXOffset - finalGroupMinX;
                const translateY = currentYOffset - finalGroupMinY;

                workingElements = translateImportedElements(workingElements, translateX, translateY);
                pathDataArray = flattenImportedElements(workingElements);

                // Add frame if requested (add it first so it appears "below" the SVG content)
                if (addFrame) {
                    const frameWidth = resizeImport ? resizeWidth : (dimensions.width || finalGroupWidth);
                    const frameHeight = resizeImport ? resizeHeight : (dimensions.height || finalGroupHeight);
                    const frame = createFrame(frameWidth, frameHeight);
                    const translatedFrameSubPaths = frame.subPaths.map(subPath =>
                        translateCommands(subPath, translateX, translateY)
                    );
                    const translatedFrame = {
                        ...frame,
                        subPaths: translatedFrameSubPaths,
                    };

                    const frameZIndex = globalZIndexCounter.value++;
                    const frameId = addElement({
                        type: 'path',
                        data: translatedFrame,
                    }, frameZIndex);
                    selectionIds.push(frameId);
                    importedPathCount += 1;
                }

                const { createdIds, childIds } = addImportedElementsToCanvas(
                    workingElements,
                    addElement,
                    updateElement,
                    getNextGroupName,
                    null,
                    globalZIndexCounter
                );

                selectionIds.push(...childIds);
                importedPathCount += pathDataArray.length;

                // Update grid position for next SVG
                currentXOffset += finalGroupWidth + margin;
                currentRowMaxHeight = Math.max(currentRowMaxHeight, finalGroupHeight);

                logger.info('SVG file processed', {
                    fileName: file.name,
                    createdElementCount: createdIds.length,
                    pathCount: pathDataArray.length,
                    bounds: { width: finalGroupWidth, height: finalGroupHeight },
                    position: { x: currentXOffset - finalGroupWidth - margin, y: currentYOffset },
                    offset: currentXOffset,
                });
            }

            if (selectionIds.length > 0) {
                selectElements(selectionIds);
                setActivePlugin(DEFAULT_MODE);
            }

            toast({
                title: 'SVGs Imported',
                description: `Successfully imported ${importedPathCount} path${importedPathCount !== 1 ? 's' : ''} from ${files.length} file${files.length !== 1 ? 's' : ''}`,
                status: 'success',
                duration: 3000,
                isClosable: true,
            });

            logger.info('All elements added to canvas', { totalPathCount: importedPathCount, selectionCount: selectionIds.length });
        } catch (error) {
            logger.error('Failed to import SVGs', error);
            toast({
                title: 'Import Failed',
                description: error instanceof Error ? error.message : 'Failed to import SVG files',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    }, [addElement, updateElement, clearSelection, selectElements, setActivePlugin, settings, toast, createFrame]);

    return { importSvgFiles };
};
