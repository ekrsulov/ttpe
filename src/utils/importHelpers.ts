import type { CanvasElement, PathData } from '../types';
import type { ImportedElement } from './svgImportUtils';
import { translateCommands } from './transformationUtils';

export type AddElementFn = (element: Omit<CanvasElement, 'id' | 'zIndex'>, explicitZIndex?: number) => string;
export type UpdateElementFn = (id: string, updates: Partial<CanvasElement>) => void;

export const mapImportedElements = (
    elements: ImportedElement[],
    mapFn: (pathData: PathData) => PathData,
): ImportedElement[] => {
    return elements.map(element => {
        if (element.type === 'path') {
            return {
                ...element,
                data: mapFn(element.data),
            };
        }

        return {
            ...element,
            children: mapImportedElements(element.children, mapFn),
        };
    });
};

export const translateImportedElements = (
    elements: ImportedElement[],
    deltaX: number,
    deltaY: number,
): ImportedElement[] => {
    if (deltaX === 0 && deltaY === 0) {
        return elements;
    }

    return mapImportedElements(elements, (pathData) => ({
        ...pathData,
        subPaths: pathData.subPaths.map(subPath => translateCommands(subPath, deltaX, deltaY)),
    }));
};

export const addImportedElementsToCanvas = (
    elements: ImportedElement[],
    addElement: AddElementFn,
    updateElement: UpdateElementFn,
    getNextGroupName: () => string,
    parentId: string | null = null,
    globalZIndexCounter: { value: number } = { value: 0 },
): { createdIds: string[]; childIds: string[] } => {
    const createdIds: string[] = [];
    const childIds: string[] = [];

    elements.forEach(element => {
        if (element.type === 'group') {
            const groupName = element.name?.trim().length ? element.name : getNextGroupName();
            const groupZIndex = globalZIndexCounter.value++;
            const groupId = addElement({
                type: 'group',
                parentId: parentId ?? undefined,
                data: {
                    childIds: [],
                    name: groupName,
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
            }, groupZIndex);

            const { createdIds: nestedCreatedIds, childIds: nestedChildIds } = addImportedElementsToCanvas(
                element.children,
                addElement,
                updateElement,
                getNextGroupName,
                groupId,
                globalZIndexCounter,
            );

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            updateElement(groupId, { data: { childIds: nestedChildIds } } as any);

            createdIds.push(groupId, ...nestedCreatedIds);
            childIds.push(groupId);
            return;
        }

        const pathZIndex = globalZIndexCounter.value++;
        const pathId = addElement({
            type: 'path',
            parentId: parentId ?? undefined,
            data: element.data,
        }, pathZIndex);

        createdIds.push(pathId);
        childIds.push(pathId);
    });

    return { createdIds, childIds };
};
