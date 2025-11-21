import type { StateCreator } from 'zustand';
import type { CanvasElement, PathData } from '../types';

/**
 * Helper type for selected subpath elements
 */
export interface SelectedSubpathElement {
  element: CanvasElement;
  subpathIndex: number;
}

/**
 * Centralized helper to get selected subpath elements from state
 * Eliminates duplication across baseSlice, performPathSimplify, and performSubPathReverse
 * 
 * @param elements - Array of canvas elements
 * @param selectedSubpaths - Array of selected subpath references
 * @returns Array of elements with their selected subpath indices
 */
export function getSelectedSubpathElements(
  elements: CanvasElement[],
  selectedSubpaths: Array<{ elementId: string; subpathIndex: number }>
): SelectedSubpathElement[] {
  return selectedSubpaths
    .map(sp => {
      const element = elements.find(el => el.id === sp.elementId);
      if (element && element.type === 'path') {
        return { element, subpathIndex: sp.subpathIndex };
      }
      return null;
    })
    .filter(Boolean) as SelectedSubpathElement[];
}

/**
 * Centralized helper to get all selected paths (full paths + individual subpaths as separate paths)
 * Used for boolean operations and other path manipulations
 * 
 * @param elements - Array of canvas elements
 * @param selectedIds - Array of selected element IDs
 * @param selectedSubpaths - Array of selected subpath references
 * @returns Array of PathData objects
 */
export function getSelectedPaths(
  elements: CanvasElement[],
  selectedIds: string[],
  selectedSubpaths: Array<{ elementId: string; subpathIndex: number }>
): PathData[] {
  const selectedPaths = elements
    .filter(el => selectedIds.includes(el.id) && el.type === 'path')
    .map(el => el.data as PathData);

  const subpathElements = getSelectedSubpathElements(elements, selectedSubpaths);

  // Handle selected subpaths by extracting them as separate paths
  const subpathPaths = subpathElements.map(({ element, subpathIndex }) => {
    const pathData = element.data as PathData;
    return {
      ...pathData,
      subPaths: [pathData.subPaths[subpathIndex]]
    };
  });

  return [...selectedPaths, ...subpathPaths];
}

/**
 * Creates a simple plugin slice with state merging logic.
 * Eliminates duplication across pencil, shape, and text plugin slices.
 * 
 * @param sliceKey - The key name for the state (e.g., 'pencil', 'shape', 'text')
 * @param initialState - The initial state object
 * @returns A state creator with update method
 */
export function createSimplePluginSlice<
  TSliceKey extends string,
  TState extends Record<string, unknown>,
  TSlice extends {
    [K in TSliceKey]: TState;
  } & {
    [K in `update${Capitalize<TSliceKey>}State`]: (state: Partial<TState>) => void;
  }
>(
  sliceKey: TSliceKey,
  initialState: TState
): StateCreator<TSlice, [], [], TSlice> {
  const updateMethodName = `update${sliceKey.charAt(0).toUpperCase()}${sliceKey.slice(1)}State` as `update${Capitalize<TSliceKey>}State`;

  return (set) => ({
    [sliceKey]: initialState,
    [updateMethodName]: (state: Partial<TState>) => {
      set((current) => ({
        [sliceKey]: { ...current[sliceKey as keyof typeof current] as TState, ...state },
      } as Partial<TSlice>));
    },
  }) as TSlice;
}
