import type { StateCreator } from 'zustand';

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
