import type { StateCreator } from 'zustand';
import { parsePathD, extractSubpaths } from '../../../utils/pathParserUtils';
import { measurePath } from '../../../utils/measurementUtils';
import { formatToPrecision, PATH_DECIMAL_PRECISION } from '../../../utils';

// Helper function to transform SVG path commands by applying a translation
const transformSvgPath = (d: string, deltaX: number, deltaY: number): string => {
  // Split the path into commands and coordinates (only M, L, C, Z)
  const commands = d.split(/([MLCZmlcz])/).filter(cmd => cmd.trim() !== '');
  let result = '';
  let i = 0;

  while (i < commands.length) {
    const command = commands[i];
    if (result) result += ' ';
    result += command;

    // Process coordinates based on command type
    if ('MLCZmlcz'.indexOf(command) !== -1) {
      i++;
      // Collect all numeric values until the next command
      while (i < commands.length && 'MLCZmlcz'.indexOf(commands[i]) === -1) {
        const coords = commands[i].trim().split(/[\s,]+/).map(coord => {
          const parsed = parseFloat(coord);
          return isNaN(parsed) ? 0 : parsed; // Default to 0 if parsing fails
        });

        // Apply translation to coordinate pairs (M, L, C all have x,y pairs)
        if (command.toUpperCase() !== 'Z') {
          for (let j = 0; j < coords.length; j += 2) {
            if (!isNaN(coords[j]) && !isNaN(deltaX)) {
              coords[j] = formatToPrecision(coords[j] + deltaX, PATH_DECIMAL_PRECISION);
            }
            if (!isNaN(coords[j + 1]) && !isNaN(deltaY)) {
              coords[j + 1] = formatToPrecision(coords[j + 1] + deltaY, PATH_DECIMAL_PRECISION);
            }
          }
        }
        result += ' ' + coords.join(' ');
        i++;
      }
    } else {
      i++;
    }
  }

  return result;
};

// Helper interface for subpath bounds
interface SubpathWithBounds {
  elementId: string;
  subpathIndex: number;
  subpathData: { d: string; startIndex: number; endIndex: number };
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

// Helper function to apply transformations to multiple subpaths efficiently
const applySubpathTransformations = (
  state: any,
  subpathBounds: SubpathWithBounds[], 
  getTransformation: (subpathInfo: SubpathWithBounds) => { deltaX: number; deltaY: number }
) => {
  // Group transformations by element to avoid multiple updates
  const elementUpdates = new Map<string, { pathData: any; transformations: Array<{ subpathIndex: number; deltaX: number; deltaY: number }> }>();

  // Collect all transformations first
  subpathBounds.forEach(subpathInfo => {
    const { deltaX, deltaY } = getTransformation(subpathInfo);
    
    if (Math.abs(deltaX) > 0.001 || Math.abs(deltaY) > 0.001) { // Only update if there's a meaningful change
      const element = state.elements.find((el: any) => el.id === subpathInfo.elementId);
      if (element) {
        const pathData = element.data as any;
        
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
    const commands = parsePathD(pathData.d);
    const subpaths = extractSubpaths(commands);
    
    // Apply all transformations to this element's subpaths
    transformations.forEach(({ subpathIndex, deltaX, deltaY }) => {
      const originalSubpath = subpaths[subpathIndex];
      if (originalSubpath) {
        const transformedSubpathD = transformSvgPath(originalSubpath.d, deltaX, deltaY);
        subpaths[subpathIndex] = { ...originalSubpath, d: transformedSubpathD };
      }
    });
    
    // Rebuild the path with all transformations applied
    const newPathD = subpaths.map(sp => sp.d).join(' ');
    state.updateElement(elementId, {
      data: { ...pathData, d: newPathD }
    });
  });
};

export interface SubpathPluginSlice {
  // State
  subpath: {
    isDragging: boolean;
    draggedSubpath: { elementId: string; subpathIndex: number } | null;
    initialPositions: Array<{
      elementId: string;
      subpathIndex: number;
      x: number;
      y: number;
    }>;
    originalPathData: string | null; // Store original path data for real-time updates
    startX: number;
    startY: number;
  };
  selectedSubpaths: Array<{ elementId: string; subpathIndex: number }>;

  // Actions
  startDraggingSubpath: (elementId: string, subpathIndex: number, startX: number, startY: number) => void;
  updateDraggingSubpath: (x: number, y: number) => void;
  stopDraggingSubpath: () => void;
  selectSubpath: (elementId: string, subpathIndex: number, multiSelect?: boolean) => void;
  selectSubpaths: (subpaths: Array<{ elementId: string; subpathIndex: number }>) => void;
  clearSubpathSelection: () => void;
  getSelectedSubpathsCount: () => number;
  deleteSelectedSubpaths: () => void;
  bringSubpathToFront: () => void;
  sendSubpathForward: () => void;
  sendSubpathBackward: () => void;
  sendSubpathToBack: () => void;
  alignLeftSubpaths: () => void;
  alignCenterSubpaths: () => void;
  alignRightSubpaths: () => void;
  alignTopSubpaths: () => void;
  alignMiddleSubpaths: () => void;
  alignBottomSubpaths: () => void;
  distributeHorizontallySubpaths: () => void;
  distributeVerticallySubpaths: () => void;
}

export const createSubpathPluginSlice: StateCreator<SubpathPluginSlice, [], [], SubpathPluginSlice> = (set, get) => ({
  // Initial state
  subpath: {
    isDragging: false,
    draggedSubpath: null,
    initialPositions: [],
    originalPathData: null,
    startX: 0,
    startY: 0,
  },
  selectedSubpaths: [],

  // Actions
  startDraggingSubpath: (elementId: string, subpathIndex: number, startX: number, startY: number) => {
    const state = get() as any;
    const selectedSubpaths = get().selectedSubpaths;
    
    // Check if the dragged subpath is in the selection
    const isDraggedInSelection = selectedSubpaths.some(
      s => s.elementId === elementId && s.subpathIndex === subpathIndex
    );
    
    // If dragged subpath is not selected, select only it
    if (!isDraggedInSelection) {
      set({ selectedSubpaths: [{ elementId, subpathIndex }] });
    }
    
    // Get the current selection (either updated or existing)
    const currentSelection = isDraggedInSelection ? selectedSubpaths : [{ elementId, subpathIndex }];
    
    // Collect original path data for all elements that contain selected subpaths
    const originalPathDataMap: Record<string, string> = {};
    const initialPositions: Array<{
      elementId: string;
      subpathIndex: number;
      x: number;
      y: number;
    }> = [];
    
    // Group selected subpaths by element
    const subpathsByElement = currentSelection.reduce((acc, subpath) => {
      if (!acc[subpath.elementId]) {
        acc[subpath.elementId] = [];
      }
      acc[subpath.elementId].push(subpath.subpathIndex);
      return acc;
    }, {} as Record<string, number[]>);
    
    // Store original path data for each element
    Object.keys(subpathsByElement).forEach(elId => {
      const element = state.elements.find((el: any) => el.id === elId);
      if (element && element.type === 'path') {
        originalPathDataMap[elId] = (element.data as any).d;
      }
    });
    
    // Create initial positions for all selected subpaths
    currentSelection.forEach(subpath => {
      initialPositions.push({
        elementId: subpath.elementId,
        subpathIndex: subpath.subpathIndex,
        x: startX,
        y: startY
      });
    });

    set({
      subpath: {
        isDragging: true,
        draggedSubpath: { elementId, subpathIndex },
        initialPositions,
        originalPathData: JSON.stringify(originalPathDataMap), // Store as JSON string
        startX,
        startY,
      },
    });
  },

  updateDraggingSubpath: (_x, _y) => {
    // Don't update the start position - we need to keep the initial start position
    // for calculating deltas. The current position is passed as parameters.
  },

  stopDraggingSubpath: () => {
    set({
      subpath: {
        isDragging: false,
        draggedSubpath: null,
        initialPositions: [],
        originalPathData: null,
        startX: 0,
        startY: 0,
      },
    });
  },

  selectSubpath: (elementId, subpathIndex, multiSelect = false) => {
    set((state) => {
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
  },

  selectSubpaths: (subpaths) => {
    set({ selectedSubpaths: subpaths });
  },

  clearSubpathSelection: () => {
    set({ selectedSubpaths: [] });
  },

  getSelectedSubpathsCount: () => {
    return get().selectedSubpaths.length;
  },

  deleteSelectedSubpaths: () => {
    const state = get() as any;
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

    // Update each element by removing selected subpaths
    Object.entries(subpathsByElement).forEach(([elementId, subpathIndices]) => {
      const element = state.elements.find((el: any) => el.id === elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as any;
        
        const commands = parsePathD(pathData.d);
        const subpaths = extractSubpaths(commands);
        
        // Remove subpaths in reverse order to maintain correct indices
        const sortedIndices = [...subpathIndices].sort((a, b) => b - a);
        sortedIndices.forEach(index => {
          if (index >= 0 && index < subpaths.length) {
            subpaths.splice(index, 1);
          }
        });

        // Rebuild the path data from remaining subpaths
        const newPathD = subpaths.map(subpath => subpath.d).join(' ');
        
        // Update the element
        state.updateElement(elementId, {
          data: {
            ...pathData,
            d: newPathD
          }
        });
      }
    });

    // Clear the selection
    set({ selectedSubpaths: [] });
  },

  bringSubpathToFront: () => {
    const state = get() as any;
    const selectedSubpaths = get().selectedSubpaths;
    
    if (selectedSubpaths.length === 0) return;

    // Group by element and reorder subpaths within each element
    const subpathsByElement = selectedSubpaths.reduce((acc, subpath) => {
      if (!acc[subpath.elementId]) {
        acc[subpath.elementId] = [];
      }
      acc[subpath.elementId].push(subpath.subpathIndex);
      return acc;
    }, {} as Record<string, number[]>);

    Object.entries(subpathsByElement).forEach(([elementId, subpathIndices]) => {
      const element = state.elements.find((el: any) => el.id === elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as any;
        const commands = parsePathD(pathData.d);
        const subpaths = extractSubpaths(commands);
        
        // Move selected subpaths to the end (front)
        const sortedIndices = [...subpathIndices].sort((a, b) => a - b);
        const movedSubpaths = sortedIndices.map(index => subpaths[index]);
        
        // Remove moved subpaths from original positions (in reverse order)
        sortedIndices.reverse().forEach(index => {
          subpaths.splice(index, 1);
        });
        
        // Add them to the end
        subpaths.push(...movedSubpaths);
        
        // Rebuild path
        const newPathD = subpaths.map(subpath => subpath.d).join(' ');
        state.updateElement(elementId, {
          data: { ...pathData, d: newPathD }
        });
      }
    });
  },

  sendSubpathForward: () => {
    const state = get() as any;
    const selectedSubpaths = get().selectedSubpaths;
    
    if (selectedSubpaths.length === 0) return;

    const subpathsByElement = selectedSubpaths.reduce((acc, subpath) => {
      if (!acc[subpath.elementId]) {
        acc[subpath.elementId] = [];
      }
      acc[subpath.elementId].push(subpath.subpathIndex);
      return acc;
    }, {} as Record<string, number[]>);

    Object.entries(subpathsByElement).forEach(([elementId, subpathIndices]) => {
      const element = state.elements.find((el: any) => el.id === elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as any;
        const commands = parsePathD(pathData.d);
        const subpaths = extractSubpaths(commands);
        
        // Sort indices in descending order to avoid index shifting issues
        const sortedIndices = [...subpathIndices].sort((a, b) => b - a);
        
        sortedIndices.forEach(index => {
          if (index < subpaths.length - 1) {
            // Swap with next subpath
            const temp = subpaths[index];
            subpaths[index] = subpaths[index + 1];
            subpaths[index + 1] = temp;
          }
        });
        
        const newPathD = subpaths.map(subpath => subpath.d).join(' ');
        state.updateElement(elementId, {
          data: { ...pathData, d: newPathD }
        });
      }
    });
  },

  sendSubpathBackward: () => {
    const state = get() as any;
    const selectedSubpaths = get().selectedSubpaths;
    
    if (selectedSubpaths.length === 0) return;

    const subpathsByElement = selectedSubpaths.reduce((acc, subpath) => {
      if (!acc[subpath.elementId]) {
        acc[subpath.elementId] = [];
      }
      acc[subpath.elementId].push(subpath.subpathIndex);
      return acc;
    }, {} as Record<string, number[]>);

    Object.entries(subpathsByElement).forEach(([elementId, subpathIndices]) => {
      const element = state.elements.find((el: any) => el.id === elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as any;
        const commands = parsePathD(pathData.d);
        const subpaths = extractSubpaths(commands);
        
        // Sort indices in ascending order
        const sortedIndices = [...subpathIndices].sort((a, b) => a - b);
        
        sortedIndices.forEach(index => {
          if (index > 0) {
            // Swap with previous subpath
            const temp = subpaths[index];
            subpaths[index] = subpaths[index - 1];
            subpaths[index - 1] = temp;
          }
        });
        
        const newPathD = subpaths.map(subpath => subpath.d).join(' ');
        state.updateElement(elementId, {
          data: { ...pathData, d: newPathD }
        });
      }
    });
  },

  sendSubpathToBack: () => {
    const state = get() as any;
    const selectedSubpaths = get().selectedSubpaths;
    
    if (selectedSubpaths.length === 0) return;

    const subpathsByElement = selectedSubpaths.reduce((acc, subpath) => {
      if (!acc[subpath.elementId]) {
        acc[subpath.elementId] = [];
      }
      acc[subpath.elementId].push(subpath.subpathIndex);
      return acc;
    }, {} as Record<string, number[]>);

    Object.entries(subpathsByElement).forEach(([elementId, subpathIndices]) => {
      const element = state.elements.find((el: any) => el.id === elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as any;
        const commands = parsePathD(pathData.d);
        const subpaths = extractSubpaths(commands);
        
        // Move selected subpaths to the beginning (back)
        const sortedIndices = [...subpathIndices].sort((a, b) => b - a);
        const movedSubpaths = sortedIndices.map(index => subpaths[index]);
        
        // Remove moved subpaths from original positions
        sortedIndices.forEach(index => {
          subpaths.splice(index, 1);
        });
        
        // Add them to the beginning
        subpaths.unshift(...movedSubpaths.reverse());
        
        const newPathD = subpaths.map(subpath => subpath.d).join(' ');
        state.updateElement(elementId, {
          data: { ...pathData, d: newPathD }
        });
      }
    });
  },

  alignLeftSubpaths: () => {
    const state = get() as any;
    const selectedSubpaths = get().selectedSubpaths;
    
    if (selectedSubpaths.length < 2) {
      return;
    }

    // Collect bounds for all selected subpaths
    const subpathBounds: SubpathWithBounds[] = [];
    
    selectedSubpaths.forEach(selected => {
      const element = state.elements.find((el: any) => el.id === selected.elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as any;
        const commands = parsePathD(pathData.d);
        const subpaths = extractSubpaths(commands);
        const subpathData = subpaths[selected.subpathIndex];
        
        if (subpathData) {
          const bounds = measurePath(subpathData.d, pathData.strokeWidth || 1, 1);
          subpathBounds.push({
            elementId: selected.elementId,
            subpathIndex: selected.subpathIndex,
            subpathData,
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

    // Find the leftmost position
    const minX = Math.min(...subpathBounds.map(sb => sb.bounds.minX));

    // Apply transformations using helper function
    applySubpathTransformations(state, subpathBounds, (subpathInfo) => ({
      deltaX: minX - subpathInfo.bounds.minX,
      deltaY: 0
    }));
  },

  alignCenterSubpaths: () => {
    const state = get() as any;
    const selectedSubpaths = get().selectedSubpaths;
    
    if (selectedSubpaths.length < 2) return;

    const subpathBounds: SubpathWithBounds[] = [];
    
    selectedSubpaths.forEach(selected => {
      const element = state.elements.find((el: any) => el.id === selected.elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as any;
        const commands = parsePathD(pathData.d);
        const subpaths = extractSubpaths(commands);
        const subpathData = subpaths[selected.subpathIndex];
        
        if (subpathData) {
          const bounds = measurePath(subpathData.d, pathData.strokeWidth || 1, 1);
          subpathBounds.push({
            elementId: selected.elementId,
            subpathIndex: selected.subpathIndex,
            subpathData,
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

    // Calculate average center position
    const targetCenterX = subpathBounds.reduce((sum, sb) => sum + sb.centerX, 0) / subpathBounds.length;

    // Apply transformations using helper function
    applySubpathTransformations(state, subpathBounds, (subpathInfo) => ({
      deltaX: targetCenterX - subpathInfo.centerX,
      deltaY: 0
    }));
  },

  alignRightSubpaths: () => {
    const state = get() as any;
    const selectedSubpaths = get().selectedSubpaths;
    
    if (selectedSubpaths.length < 2) return;

    const subpathBounds: SubpathWithBounds[] = [];
    
    selectedSubpaths.forEach(selected => {
      const element = state.elements.find((el: any) => el.id === selected.elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as any;
        const commands = parsePathD(pathData.d);
        const subpaths = extractSubpaths(commands);
        const subpathData = subpaths[selected.subpathIndex];
        
        if (subpathData) {
          const bounds = measurePath(subpathData.d, pathData.strokeWidth || 1, 1);
          subpathBounds.push({
            elementId: selected.elementId,
            subpathIndex: selected.subpathIndex,
            subpathData,
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

    // Find the rightmost position
    const maxX = Math.max(...subpathBounds.map(sb => sb.bounds.maxX));

    // Apply transformations using helper function
    applySubpathTransformations(state, subpathBounds, (subpathInfo) => ({
      deltaX: maxX - subpathInfo.bounds.maxX,
      deltaY: 0
    }));
  },

  alignTopSubpaths: () => {
    const state = get() as any;
    const selectedSubpaths = get().selectedSubpaths;
    
    if (selectedSubpaths.length < 2) return;

    const subpathBounds: SubpathWithBounds[] = [];
    
    selectedSubpaths.forEach(selected => {
      const element = state.elements.find((el: any) => el.id === selected.elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as any;
        const commands = parsePathD(pathData.d);
        const subpaths = extractSubpaths(commands);
        const subpathData = subpaths[selected.subpathIndex];
        
        if (subpathData) {
          const bounds = measurePath(subpathData.d, pathData.strokeWidth || 1, 1);
          subpathBounds.push({
            elementId: selected.elementId,
            subpathIndex: selected.subpathIndex,
            subpathData,
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

    // Find the topmost position
    const minY = Math.min(...subpathBounds.map(sb => sb.bounds.minY));

    // Apply transformations using helper function
    applySubpathTransformations(state, subpathBounds, (subpathInfo) => ({
      deltaX: 0,
      deltaY: minY - subpathInfo.bounds.minY
    }));
  },

  alignMiddleSubpaths: () => {
    const state = get() as any;
    const selectedSubpaths = get().selectedSubpaths;
    
    if (selectedSubpaths.length < 2) return;

    const subpathBounds: SubpathWithBounds[] = [];
    
    selectedSubpaths.forEach(selected => {
      const element = state.elements.find((el: any) => el.id === selected.elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as any;
        const commands = parsePathD(pathData.d);
        const subpaths = extractSubpaths(commands);
        const subpathData = subpaths[selected.subpathIndex];
        
        if (subpathData) {
          const bounds = measurePath(subpathData.d, pathData.strokeWidth || 1, 1);
          subpathBounds.push({
            elementId: selected.elementId,
            subpathIndex: selected.subpathIndex,
            subpathData,
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

    // Calculate average center position
    const targetCenterY = subpathBounds.reduce((sum, sb) => sum + sb.centerY, 0) / subpathBounds.length;

    // Apply transformations using helper function
    applySubpathTransformations(state, subpathBounds, (subpathInfo) => ({
      deltaX: 0,
      deltaY: targetCenterY - subpathInfo.centerY
    }));
  },

  alignBottomSubpaths: () => {
    const state = get() as any;
    const selectedSubpaths = get().selectedSubpaths;
    
    if (selectedSubpaths.length < 2) return;

    const subpathBounds: SubpathWithBounds[] = [];
    
    selectedSubpaths.forEach(selected => {
      const element = state.elements.find((el: any) => el.id === selected.elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as any;
        const commands = parsePathD(pathData.d);
        const subpaths = extractSubpaths(commands);
        const subpathData = subpaths[selected.subpathIndex];
        
        if (subpathData) {
          const bounds = measurePath(subpathData.d, pathData.strokeWidth || 1, 1);
          subpathBounds.push({
            elementId: selected.elementId,
            subpathIndex: selected.subpathIndex,
            subpathData,
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

    // Find the bottommost position
    const maxY = Math.max(...subpathBounds.map(sb => sb.bounds.maxY));

    // Apply transformations using helper function
    applySubpathTransformations(state, subpathBounds, (subpathInfo) => ({
      deltaX: 0,
      deltaY: maxY - subpathInfo.bounds.maxY
    }));
  },

  distributeHorizontallySubpaths: () => {
    const state = get() as any;
    const selectedSubpaths = get().selectedSubpaths;
    
    if (selectedSubpaths.length < 3) {
      return;
    }

    const subpathBounds: SubpathWithBounds[] = [];
    
    selectedSubpaths.forEach(selected => {
      const element = state.elements.find((el: any) => el.id === selected.elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as any;
        const commands = parsePathD(pathData.d);
        const subpaths = extractSubpaths(commands);
        const subpathData = subpaths[selected.subpathIndex];
        
        if (subpathData) {
          const bounds = measurePath(subpathData.d, pathData.strokeWidth || 1, 1);
          subpathBounds.push({
            elementId: selected.elementId,
            subpathIndex: selected.subpathIndex,
            subpathData,
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
    const state = get() as any;
    const selectedSubpaths = get().selectedSubpaths;
    
    if (selectedSubpaths.length < 3) return;

    const subpathBounds: SubpathWithBounds[] = [];
    
    selectedSubpaths.forEach(selected => {
      const element = state.elements.find((el: any) => el.id === selected.elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as any;
        const commands = parsePathD(pathData.d);
        const subpaths = extractSubpaths(commands);
        const subpathData = subpaths[selected.subpathIndex];
        
        if (subpathData) {
          const bounds = measurePath(subpathData.d, pathData.strokeWidth || 1, 1);
          subpathBounds.push({
            elementId: selected.elementId,
            subpathIndex: selected.subpathIndex,
            subpathData,
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
});