import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../canvasStore';
import type { PathData, Command, CanvasElement } from '../../../types';
import { extractSubpaths } from '../../../utils/pathParserUtils';
import { measureSubpathBounds } from '../../../utils/measurementUtils';
import { formatToPrecision, PATH_DECIMAL_PRECISION } from '../../../utils';
import { translateCommands, translateCommandsToIntegers } from '../../../utils/transformationUtils';

// Helper interface for subpath bounds
interface SubpathWithBounds {
  elementId: string;
  subpathIndex: number;
  subpathCommands: Command[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

// Helper function to apply transformations to multiple subpaths efficiently
const applySubpathTransformations = (
  state: CanvasStore,
  subpathBounds: SubpathWithBounds[],
  getTransformation: (subpathInfo: SubpathWithBounds) => { deltaX: number; deltaY: number }
) => {
  // Group transformations by element to avoid multiple updates
  const elementUpdates = new Map<string, {
    pathData: PathData;
    transformations: Array<{ subpathIndex: number; deltaX: number; deltaY: number }>
  }>();

  // Collect all transformations first
  subpathBounds.forEach(subpathInfo => {
    const { deltaX, deltaY } = getTransformation(subpathInfo);

    if (Math.abs(deltaX) > 0.001 || Math.abs(deltaY) > 0.001) { // Only update if there's a meaningful change
      const element = state.elements.find((el) => el.id === subpathInfo.elementId);
      if (element) {
        const pathData = element.data as PathData;

        if (!elementUpdates.has(subpathInfo.elementId)) {
          elementUpdates.set(subpathInfo.elementId, {
            pathData,
            transformations: []
          });
        }

        elementUpdates.get(subpathInfo.elementId)!.transformations.push({
          subpathIndex: subpathInfo.subpathIndex,
          deltaX: formatToPrecision(deltaX, PATH_DECIMAL_PRECISION),
          deltaY: formatToPrecision(deltaY, PATH_DECIMAL_PRECISION)
        });
      }
    }
  });

  // Apply all transformations per element
  elementUpdates.forEach(({ pathData, transformations }, elementId) => {
    const allCommands = pathData.subPaths.flat();
    const subpaths = extractSubpaths(allCommands);

    // Apply all transformations to this element's subpaths
    transformations.forEach(({ subpathIndex, deltaX, deltaY }) => {
      const originalSubpath = subpaths[subpathIndex];
      if (originalSubpath) {
        const transformedCommands = translateCommands(originalSubpath.commands, deltaX, deltaY);
        subpaths[subpathIndex] = { ...originalSubpath, commands: transformedCommands };
      }
    });

    // Rebuild the subPaths with all transformations applied
    const newSubPaths = subpaths.map(sp => sp.commands);
    state.updateElement(elementId, {
      data: { ...pathData, subPaths: newSubPaths }
    });
  });
};

// Helper function for alignment operations
const performSubpathAlignment = (
  state: CanvasStore,
  selectedSubpaths: Array<{ elementId: string; subpathIndex: number }>,
  getTargetPosition: (bounds: SubpathWithBounds[]) => (subpathInfo: SubpathWithBounds) => { deltaX: number; deltaY: number }
) => {
  if (selectedSubpaths.length < 2) return;

  const subpathBounds: SubpathWithBounds[] = [];

  selectedSubpaths.forEach(selected => {
    const element = state.elements.find((el) => el.id === selected.elementId);
    if (element && element.type === 'path') {
      const pathData = element.data as PathData;
      const allCommands = pathData.subPaths.flat();
      const subpaths = extractSubpaths(allCommands);
      const subpathCommands = subpaths[selected.subpathIndex]?.commands;

      if (subpathCommands) {
        const bounds = measureSubpathBounds(subpathCommands, pathData.strokeWidth || 1);

        subpathBounds.push({
          elementId: selected.elementId,
          subpathIndex: selected.subpathIndex,
          subpathCommands,
          bounds,
          centerX: (bounds.minX + bounds.maxX) / 2,
          centerY: (bounds.minY + bounds.maxY) / 2,
          width: bounds.maxX - bounds.minX,
          height: bounds.maxY - bounds.minY
        });
      }
    }
  });

  if (subpathBounds.length < 2) return;

  // Apply transformations using helper function
  applySubpathTransformations(state, subpathBounds, getTargetPosition(subpathBounds));
};

export interface SubpathPluginSlice {
  // State
  selectedSubpaths: Array<{ elementId: string; subpathIndex: number }>;
  draggingSubpaths: {
    isDragging: boolean;
    initialPositions: Array<{
      elementId: string;
      subpathIndex: number;
      bounds: { minX: number; minY: number; maxX: number; maxY: number };
      originalCommands: Command[]; // Store the original commands to avoid cumulative transformations
    }>;
    startX: number;
    startY: number;
    currentX?: number;
    currentY?: number;
    deltaX?: number;
    deltaY?: number;
    currentDeltaX?: number;
    currentDeltaY?: number;
  } | null;

  // Actions
  selectSubpath: (elementId: string, subpathIndex: number, multiSelect?: boolean) => void;
  selectSubpaths: (subpaths: Array<{ elementId: string; subpathIndex: number }>) => void;
  clearSubpathSelection: () => void;
  getSelectedSubpathsCount: () => number;
  deleteSelectedSubpaths: () => void;
  moveSelectedSubpaths: (deltaX: number, deltaY: number) => void;

  // Drag actions
  startDraggingSubpaths: (canvasX: number, canvasY: number) => void;
  updateDraggingSubpaths: (canvasX: number, canvasY: number) => void;
  stopDraggingSubpaths: () => void;

  // Order functions
  bringSubpathToFront: () => void;
  sendSubpathForward: () => void;
  sendSubpathBackward: () => void;
  sendSubpathToBack: () => void;

  // Alignment functions
  alignLeftSubpaths: () => void;
  alignCenterSubpaths: () => void;
  alignRightSubpaths: () => void;
  alignTopSubpaths: () => void;
  alignMiddleSubpaths: () => void;
  alignBottomSubpaths: () => void;

  // Distribution functions
  distributeHorizontallySubpaths: () => void;
  distributeVerticallySubpaths: () => void;
}

export const createSubpathPluginSlice: StateCreator<CanvasStore, [], [], SubpathPluginSlice> = (set, get) => ({
  // Initial state
  selectedSubpaths: [],
  draggingSubpaths: null,

  // Actions
  selectSubpath: (elementId, subpathIndex, multiSelect = false) => {
    set((state) => {
      const fullState = state as CanvasStore; // Cast to access cross-slice properties
      // In subpath mode, only allow selection of subpaths that belong to selected paths
      if (!fullState.selectedIds.includes(elementId)) {
        return state;
      }

      const isSelected = state.selectedSubpaths.some(
        s => s.elementId === elementId && s.subpathIndex === subpathIndex
      );

      if (multiSelect) {
        return {
          selectedSubpaths: isSelected
            ? state.selectedSubpaths.filter(s => !(s.elementId === elementId && s.subpathIndex === subpathIndex))
            : [...state.selectedSubpaths, { elementId, subpathIndex }]
        };
      } else {
        return {
          selectedSubpaths: [{ elementId, subpathIndex }]
        };
      }
    });
    
    // Auto-reset optical alignment on subpath selection change
    const currentState = get() as CanvasStore;
    currentState.autoResetOnSelectionChange();
  },

  selectSubpaths: (subpaths) => {
    set({ selectedSubpaths: subpaths });
    // Auto-reset optical alignment on subpath selection change
    const currentState = get() as CanvasStore;
    currentState.autoResetOnSelectionChange();
  },

  clearSubpathSelection: () => {
    set({ selectedSubpaths: [] });
    // Auto-reset optical alignment on subpath selection change
    const currentState = get() as CanvasStore;
    currentState.autoResetOnSelectionChange();
  },

  getSelectedSubpathsCount: () => {
    return get().selectedSubpaths.length;
  },

  deleteSelectedSubpaths: () => {
    const state = get() as CanvasStore;
    const selectedSubpaths = get().selectedSubpaths;

    if (selectedSubpaths.length === 0) return;

    // Group subpaths by element ID
    const subpathsByElement = selectedSubpaths.reduce((acc, subpath) => {
      if (!acc[subpath.elementId]) {
        acc[subpath.elementId] = [];
      }
      acc[subpath.elementId].push(subpath.subpathIndex);
      return acc;
    }, {} as Record<string, number[]>);

    // Process each element
    Object.entries(subpathsByElement).forEach(([elementId, subpathIndices]) => {
      const element = state.elements.find((el) => el.id === elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as PathData;

        // Sort indices in descending order to avoid index shifting issues
        const sortedIndices = [...subpathIndices].sort((a, b) => b - a);

        // Remove subpaths from highest index to lowest
        const newSubPaths = [...pathData.subPaths];
        sortedIndices.forEach(index => {
          if (index < newSubPaths.length) {
            newSubPaths.splice(index, 1);
          }
        });

        // If no subpaths left, delete the entire element
        if (newSubPaths.length === 0) {
          state.deleteElement(elementId);
        } else {
          // Update the element with remaining subpaths
          state.updateElement(elementId, {
            data: { ...pathData, subPaths: newSubPaths }
          });
        }
      }
    });

    // Clear selection after deletion
    set({ selectedSubpaths: [] });
  },

  moveSelectedSubpaths: (deltaX: number, deltaY: number) => {
    const state = get() as CanvasStore;
    const selectedSubpaths = get().selectedSubpaths;

    if (selectedSubpaths.length === 0) return;

    // Group subpaths by element ID
    const subpathsByElement = selectedSubpaths.reduce((acc, subpath) => {
      if (!acc[subpath.elementId]) {
        acc[subpath.elementId] = [];
      }
      acc[subpath.elementId].push(subpath.subpathIndex);
      return acc;
    }, {} as Record<string, number[]>);

    // Process each element
    Object.entries(subpathsByElement).forEach(([elementId, subpathIndices]) => {
      const element = state.elements.find((el) => el.id === elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as PathData;
        const newSubPaths = [...pathData.subPaths];

        subpathIndices.forEach(subpathIndex => {
          if (subpathIndex < newSubPaths.length) {
            newSubPaths[subpathIndex] = translateCommandsToIntegers(newSubPaths[subpathIndex], deltaX, deltaY);
          }
        });

        state.updateElement(elementId, {
          data: { ...pathData, subPaths: newSubPaths }
        });
      }
    });

    // Auto-reset optical alignment on subpath movement
    const currentState = get() as CanvasStore;
    currentState.autoResetOnSelectionChange();
  },

  // Order functions
  bringSubpathToFront: () => {
    const state = get() as CanvasStore;
    const selectedSubpaths = get().selectedSubpaths;

    if (selectedSubpaths.length === 0) return;

    // Group subpaths by element ID
    const subpathsByElement = selectedSubpaths.reduce((acc, subpath) => {
      if (!acc[subpath.elementId]) {
        acc[subpath.elementId] = [];
      }
      acc[subpath.elementId].push(subpath.subpathIndex);
      return acc;
    }, {} as Record<string, number[]>);

    const newSelection: Array<{ elementId: string; subpathIndex: number }> = [];

    // Process each element
    Object.entries(subpathsByElement).forEach(([elementId, subpathIndices]) => {
      const element = state.elements.find((el) => el.id === elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as PathData;
        const newSubPaths = [...pathData.subPaths];

        // Sort indices in descending order to handle correctly
        const sortedIndices = [...subpathIndices].sort((a, b) => b - a);
        const subpathsToMove: Command[][] = [];

        // Extract subpaths to move (from back to front to preserve indices)
        sortedIndices.forEach(index => {
          if (index < newSubPaths.length) {
            subpathsToMove.unshift(newSubPaths.splice(index, 1)[0]);
          }
        });

        // Add them at the end (front in rendering order)
        const startIndex = newSubPaths.length;
        newSubPaths.push(...subpathsToMove);

        // Update selection with new indices
        subpathsToMove.forEach((_, i) => {
          newSelection.push({ elementId, subpathIndex: startIndex + i });
        });

        // Update the element
        state.updateElement(elementId, {
          data: { ...pathData, subPaths: newSubPaths }
        });
      }
    });

    // Update selection with new indices
    set({ selectedSubpaths: newSelection });
  },

  sendSubpathForward: () => {
    const state = get() as CanvasStore;
    const selectedSubpaths = get().selectedSubpaths;

    if (selectedSubpaths.length === 0) return;

    // Group subpaths by element ID
    const subpathsByElement = selectedSubpaths.reduce((acc, subpath) => {
      if (!acc[subpath.elementId]) {
        acc[subpath.elementId] = [];
      }
      acc[subpath.elementId].push(subpath.subpathIndex);
      return acc;
    }, {} as Record<string, number[]>);

    const newSelection: Array<{ elementId: string; subpathIndex: number }> = [];

    // Process each element
    Object.entries(subpathsByElement).forEach(([elementId, subpathIndices]) => {
      const element = state.elements.find((el) => el.id === elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as PathData;
        const newSubPaths = [...pathData.subPaths];

        // Sort indices in descending order to avoid index shifting
        const sortedIndices = [...subpathIndices].sort((a, b) => b - a);

        sortedIndices.forEach(index => {
          if (index < newSubPaths.length - 1) {
            // Swap with the next subpath (move forward one position)
            [newSubPaths[index], newSubPaths[index + 1]] = [newSubPaths[index + 1], newSubPaths[index]];
            newSelection.push({ elementId, subpathIndex: index + 1 });
          } else {
            // Can't move forward, keep current position
            newSelection.push({ elementId, subpathIndex: index });
          }
        });

        // Update the element
        state.updateElement(elementId, {
          data: { ...pathData, subPaths: newSubPaths }
        });
      }
    });

    // Update selection with new indices
    set({ selectedSubpaths: newSelection });
  },

  sendSubpathBackward: () => {
    const state = get() as CanvasStore;
    const selectedSubpaths = get().selectedSubpaths;

    if (selectedSubpaths.length === 0) return;

    // Group subpaths by element ID
    const subpathsByElement = selectedSubpaths.reduce((acc, subpath) => {
      if (!acc[subpath.elementId]) {
        acc[subpath.elementId] = [];
      }
      acc[subpath.elementId].push(subpath.subpathIndex);
      return acc;
    }, {} as Record<string, number[]>);

    const newSelection: Array<{ elementId: string; subpathIndex: number }> = [];

    // Process each element
    Object.entries(subpathsByElement).forEach(([elementId, subpathIndices]) => {
      const element = state.elements.find((el) => el.id === elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as PathData;
        const newSubPaths = [...pathData.subPaths];

        // Sort indices in ascending order to avoid index shifting
        const sortedIndices = [...subpathIndices].sort((a, b) => a - b);

        sortedIndices.forEach(index => {
          if (index > 0) {
            // Swap with the previous subpath (move backward one position)
            [newSubPaths[index], newSubPaths[index - 1]] = [newSubPaths[index - 1], newSubPaths[index]];
            newSelection.push({ elementId, subpathIndex: index - 1 });
          } else {
            // Can't move backward, keep current position
            newSelection.push({ elementId, subpathIndex: index });
          }
        });

        // Update the element
        state.updateElement(elementId, {
          data: { ...pathData, subPaths: newSubPaths }
        });
      }
    });

    // Update selection with new indices
    set({ selectedSubpaths: newSelection });
  },

  sendSubpathToBack: () => {
    const state = get() as CanvasStore;
    const selectedSubpaths = get().selectedSubpaths;

    if (selectedSubpaths.length === 0) return;

    // Group subpaths by element ID
    const subpathsByElement = selectedSubpaths.reduce((acc, subpath) => {
      if (!acc[subpath.elementId]) {
        acc[subpath.elementId] = [];
      }
      acc[subpath.elementId].push(subpath.subpathIndex);
      return acc;
    }, {} as Record<string, number[]>);

    const newSelection: Array<{ elementId: string; subpathIndex: number }> = [];

    // Process each element
    Object.entries(subpathsByElement).forEach(([elementId, subpathIndices]) => {
      const element = state.elements.find((el) => el.id === elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as PathData;
        const newSubPaths = [...pathData.subPaths];

        // Sort indices in ascending order to handle correctly
        const sortedIndices = [...subpathIndices].sort((a, b) => a - b);
        const subpathsToMove: Command[][] = [];

        // Extract subpaths to move (from front to back to preserve indices)
        sortedIndices.forEach(index => {
          if (index < newSubPaths.length) {
            subpathsToMove.push(newSubPaths.splice(index, 1)[0]);
          }
        });

        // Add them at the beginning (back in rendering order)
        newSubPaths.unshift(...subpathsToMove);

        // Update selection with new indices (they're now at the beginning)
        subpathsToMove.forEach((_, i) => {
          newSelection.push({ elementId, subpathIndex: i });
        });

        // Update the element
        state.updateElement(elementId, {
          data: { ...pathData, subPaths: newSubPaths }
        });
      }
    });

    // Update selection with new indices
    set({ selectedSubpaths: newSelection });
  },

  // Alignment functions
  alignLeftSubpaths: () => {
    const state = get() as CanvasStore;
    const selectedSubpaths = get().selectedSubpaths;

    performSubpathAlignment(state, selectedSubpaths, (subpathBounds) => {
      const minX = Math.min(...subpathBounds.map(sb => sb.bounds.minX));
      return (subpathInfo) => ({
        deltaX: minX - subpathInfo.bounds.minX,
        deltaY: 0
      });
    });
  },

  alignCenterSubpaths: () => {
    const state = get() as CanvasStore;
    const selectedSubpaths = get().selectedSubpaths;

    performSubpathAlignment(state, selectedSubpaths, (subpathBounds) => {
      const targetCenterX = subpathBounds.reduce((sum, sb) => sum + sb.centerX, 0) / subpathBounds.length;
      return (subpathInfo) => ({
        deltaX: targetCenterX - subpathInfo.centerX,
        deltaY: 0
      });
    });
  },

  alignRightSubpaths: () => {
    const state = get() as CanvasStore;
    const selectedSubpaths = get().selectedSubpaths;

    performSubpathAlignment(state, selectedSubpaths, (subpathBounds) => {
      const maxX = Math.max(...subpathBounds.map(sb => sb.bounds.maxX));
      return (subpathInfo) => ({
        deltaX: maxX - subpathInfo.bounds.maxX,
        deltaY: 0
      });
    });
  },

  alignTopSubpaths: () => {
    const state = get() as CanvasStore;
    const selectedSubpaths = get().selectedSubpaths;

    performSubpathAlignment(state, selectedSubpaths, (subpathBounds) => {
      const minY = Math.min(...subpathBounds.map(sb => sb.bounds.minY));
      return (subpathInfo) => ({
        deltaX: 0,
        deltaY: minY - subpathInfo.bounds.minY
      });
    });
  },

  alignMiddleSubpaths: () => {
    const state = get() as CanvasStore;
    const selectedSubpaths = get().selectedSubpaths;

    performSubpathAlignment(state, selectedSubpaths, (subpathBounds) => {
      const targetCenterY = subpathBounds.reduce((sum, sb) => sum + sb.centerY, 0) / subpathBounds.length;
      return (subpathInfo) => ({
        deltaX: 0,
        deltaY: targetCenterY - subpathInfo.centerY
      });
    });
  },

  alignBottomSubpaths: () => {
    const state = get() as CanvasStore;
    const selectedSubpaths = get().selectedSubpaths;

    performSubpathAlignment(state, selectedSubpaths, (subpathBounds) => {
      const maxY = Math.max(...subpathBounds.map(sb => sb.bounds.maxY));
      return (subpathInfo) => ({
        deltaX: 0,
        deltaY: maxY - subpathInfo.bounds.maxY
      });
    });
  },

  distributeHorizontallySubpaths: () => {
    const state = get() as CanvasStore;
    const selectedSubpaths = get().selectedSubpaths;

    if (selectedSubpaths.length < 3) return;

    const subpathBounds: SubpathWithBounds[] = [];

    selectedSubpaths.forEach(selected => {
      const element = state.elements.find((el) => el.id === selected.elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as PathData;
        const allCommands = pathData.subPaths.flat();
        const subpaths = extractSubpaths(allCommands);
        const subpathCommands = subpaths[selected.subpathIndex]?.commands;

        if (subpathCommands) {

          const bounds = measureSubpathBounds(subpathCommands, pathData.strokeWidth || 1);

          subpathBounds.push({
            elementId: selected.elementId,
            subpathIndex: selected.subpathIndex,
            subpathCommands,
            bounds,
            centerX: (bounds.minX + bounds.maxX) / 2,
            centerY: (bounds.minY + bounds.maxY) / 2,
            width: bounds.maxX - bounds.minX,
            height: bounds.maxY - bounds.minY
          });
        }
      }
    });

    if (subpathBounds.length < 3) return;

    // Sort by current center X position
    subpathBounds.sort((a, b) => a.centerX - b.centerX);

    // Calculate distribution
    const leftmost = subpathBounds[0].bounds.minX;
    const rightmost = subpathBounds[subpathBounds.length - 1].bounds.maxX;
    const totalWidth = rightmost - leftmost;
    const totalElementsWidth = subpathBounds.reduce((sum, sb) => sum + sb.width, 0);
    const availableSpace = totalWidth - totalElementsWidth;
    const spaceBetween = availableSpace / (subpathBounds.length - 1);

    // Calculate transformations for all subpaths
    const transformations = new Map<string, { deltaX: number; deltaY: number }>();
    let currentX = leftmost;

    subpathBounds.forEach((subpathInfo, index) => {
      if (index === 0) {
        // First element stays in place
        currentX += subpathInfo.width;
      } else if (index === subpathBounds.length - 1) {
        // Last element stays in place
        return;
      } else {
        // Distribute middle elements
        currentX += spaceBetween;
        const targetX = currentX;
        const deltaX = targetX - subpathInfo.bounds.minX;

        transformations.set(`${subpathInfo.elementId}-${subpathInfo.subpathIndex}`, {
          deltaX,
          deltaY: 0
        });
        currentX += subpathInfo.width;
      }
    });

    // Apply transformations using helper function
    const subpathsToTransform = subpathBounds.filter((_, index) =>
      index !== 0 && index !== subpathBounds.length - 1
    );

    applySubpathTransformations(state, subpathsToTransform, (subpathInfo) => {
      const key = `${subpathInfo.elementId}-${subpathInfo.subpathIndex}`;
      return transformations.get(key) || { deltaX: 0, deltaY: 0 };
    });
  },

  distributeVerticallySubpaths: () => {
    const state = get() as CanvasStore;
    const selectedSubpaths = get().selectedSubpaths;

    if (selectedSubpaths.length < 3) return;

    const subpathBounds: SubpathWithBounds[] = [];

    selectedSubpaths.forEach(selected => {
      const element = state.elements.find((el) => el.id === selected.elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as PathData;
        const allCommands = pathData.subPaths.flat();
        const subpaths = extractSubpaths(allCommands);
        const subpathCommands = subpaths[selected.subpathIndex]?.commands;

        if (subpathCommands) {

          const bounds = measureSubpathBounds(subpathCommands, pathData.strokeWidth || 1);

          subpathBounds.push({
            elementId: selected.elementId,
            subpathIndex: selected.subpathIndex,
            subpathCommands,
            bounds,
            centerX: (bounds.minX + bounds.maxX) / 2,
            centerY: (bounds.minY + bounds.maxY) / 2,
            width: bounds.maxX - bounds.minX,
            height: bounds.maxY - bounds.minY
          });
        }
      }
    });

    if (subpathBounds.length < 3) return;

    // Sort by current center Y position
    subpathBounds.sort((a, b) => a.centerY - b.centerY);

    // Calculate distribution
    const topmost = subpathBounds[0].bounds.minY;
    const bottommost = subpathBounds[subpathBounds.length - 1].bounds.maxY;
    const totalHeight = bottommost - topmost;
    const totalElementsHeight = subpathBounds.reduce((sum, sb) => sum + sb.height, 0);
    const availableSpace = totalHeight - totalElementsHeight;
    const spaceBetween = availableSpace / (subpathBounds.length - 1);

    // Calculate transformations for all subpaths
    const transformations = new Map<string, { deltaX: number; deltaY: number }>();
    let currentY = topmost;

    subpathBounds.forEach((subpathInfo, index) => {
      if (index === 0) {
        // First element stays in place
        currentY += subpathInfo.height;
      } else if (index === subpathBounds.length - 1) {
        // Last element stays in place
        return;
      } else {
        // Distribute middle elements
        currentY += spaceBetween;
        const targetY = currentY;
        const deltaY = targetY - subpathInfo.bounds.minY;

        transformations.set(`${subpathInfo.elementId}-${subpathInfo.subpathIndex}`, {
          deltaX: 0,
          deltaY
        });
        currentY += subpathInfo.height;
      }
    });

    // Apply transformations using helper function
    const subpathsToTransform = subpathBounds.filter((_, index) =>
      index !== 0 && index !== subpathBounds.length - 1
    );

    applySubpathTransformations(state, subpathsToTransform, (subpathInfo) => {
      const key = `${subpathInfo.elementId}-${subpathInfo.subpathIndex}`;
      return transformations.get(key) || { deltaX: 0, deltaY: 0 };
    });
  },

  // Drag actions
  startDraggingSubpaths: (canvasX: number, canvasY: number) => {
    const state = get() as CanvasStore;
    const selectedSubpaths = get().selectedSubpaths;

    if (selectedSubpaths.length === 0) return;

    // Get initial positions and bounds of all selected subpaths
    const initialPositions: Array<{
      elementId: string;
      subpathIndex: number;
      bounds: { minX: number; minY: number; maxX: number; maxY: number };
      originalCommands: Command[];
    }> = [];

    selectedSubpaths.forEach(({ elementId, subpathIndex }) => {
      const element = state.elements.find((el) => el.id === elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as PathData;
        const allCommands = pathData.subPaths.flat();
        const subpaths = extractSubpaths(allCommands);

        if (subpaths[subpathIndex]) {
          const bounds = measureSubpathBounds(subpaths[subpathIndex].commands, pathData.strokeWidth || 1);
          initialPositions.push({
            elementId,
            subpathIndex,
            bounds,
            originalCommands: JSON.parse(JSON.stringify(subpaths[subpathIndex].commands)) // Deep copy of original commands
          });
        }
      }
    });

    set({
      draggingSubpaths: {
        isDragging: true,
        initialPositions,
        startX: canvasX,
        startY: canvasY,
        currentDeltaX: 0,
        currentDeltaY: 0
      }
    });
  },

  updateDraggingSubpaths: (canvasX: number, canvasY: number) => {
    const state = get() as CanvasStore;
    const draggingSubpaths = get().draggingSubpaths;

    if (!draggingSubpaths?.isDragging) return;

    const deltaX = canvasX - draggingSubpaths.startX;
    const deltaY = canvasY - draggingSubpaths.startY;

    const incrementalDeltaX = deltaX - (draggingSubpaths.currentDeltaX || 0);
    const incrementalDeltaY = deltaY - (draggingSubpaths.currentDeltaY || 0);

    // Update dragging state for tracking
    set((currentState) => {
      if (currentState.draggingSubpaths) {
        return {
          draggingSubpaths: {
            ...currentState.draggingSubpaths,
            currentX: canvasX,
            currentY: canvasY,
            deltaX,
            deltaY,
            currentDeltaX: deltaX,
            currentDeltaY: deltaY
          }
        };
      }
      return currentState;
    });

    // Apply transformations to all dragged subpaths
    // Group by elementId to avoid multiple updates to the same element
    const elementUpdates = new Map<string, {
      element: CanvasElement;
      pathData: PathData;
      subpathUpdates: Array<{ subpathIndex: number; originalCommands: Command[] }>
    }>();

    // Collect all transformations by element
    draggingSubpaths.initialPositions.forEach(({ elementId, subpathIndex, originalCommands }) => {
      const element = state.elements.find((el) => el.id === elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as PathData;

        if (!elementUpdates.has(elementId)) {
          elementUpdates.set(elementId, {
            element,
            pathData,
            subpathUpdates: []
          });
        }

        elementUpdates.get(elementId)!.subpathUpdates.push({
          subpathIndex,
          originalCommands
        });
      }
    });

    // Apply all transformations per element in one update
    elementUpdates.forEach(({ pathData, subpathUpdates }, elementId) => {
      const allCommands = pathData.subPaths.flat();
      const subpaths = extractSubpaths(allCommands);

      // Apply transformations to all subpaths of this element
      subpathUpdates.forEach(({ subpathIndex, originalCommands }) => {
        if (subpaths[subpathIndex]) {
          // Apply transformation to the ORIGINAL commands, not the current ones
          const transformedCommands = translateCommands(originalCommands, incrementalDeltaX, incrementalDeltaY);
          subpaths[subpathIndex] = { ...subpaths[subpathIndex], commands: transformedCommands };
        }
      });

      // Single update per element
      const newSubPaths = subpaths.map(sp => sp.commands);
      state.updateElement(elementId, {
        data: { ...pathData, subPaths: newSubPaths }
      });
    });
  },

  stopDraggingSubpaths: () => {
    set({ draggingSubpaths: null });
    // Auto-reset optical alignment on subpath movement completion
    const currentState = get() as CanvasStore;
    currentState.autoResetOnSelectionChange();
  },
});