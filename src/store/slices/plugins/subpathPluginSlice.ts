import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../canvasStore';
import type { PathData } from '../../../types';
import { extractSubpaths } from '../../../utils/pathParserUtils';
import { measurePath } from '../../../utils/measurementUtils';
import { formatToPrecision, PATH_DECIMAL_PRECISION } from '../../../utils';

// Helper function to measure a single subpath
const measureSubpath = (subpathCommands: any[], strokeWidth: number = 1): { minX: number; minY: number; maxX: number; maxY: number } => {
  return measurePath([subpathCommands], strokeWidth, 1);
};

// Helper function to transform SVG path commands by applying a translation
const transformSvgCommands = (commands: any[], deltaX: number, deltaY: number): any[] => {
  return commands.map(cmd => {
    let transformedCmd = { ...cmd };
    
    if (cmd.type === 'M' || cmd.type === 'L') {
      transformedCmd.position = {
        x: formatToPrecision(cmd.position.x + deltaX, PATH_DECIMAL_PRECISION),
        y: formatToPrecision(cmd.position.y + deltaY, PATH_DECIMAL_PRECISION)
      };
    } else if (cmd.type === 'C') {
      transformedCmd.controlPoint1 = {
        x: formatToPrecision(cmd.controlPoint1.x + deltaX, PATH_DECIMAL_PRECISION),
        y: formatToPrecision(cmd.controlPoint1.y + deltaY, PATH_DECIMAL_PRECISION)
      };
      transformedCmd.controlPoint2 = {
        x: formatToPrecision(cmd.controlPoint2.x + deltaX, PATH_DECIMAL_PRECISION),
        y: formatToPrecision(cmd.controlPoint2.y + deltaY, PATH_DECIMAL_PRECISION)
      };
      transformedCmd.position = {
        x: formatToPrecision(cmd.position.x + deltaX, PATH_DECIMAL_PRECISION),
        y: formatToPrecision(cmd.position.y + deltaY, PATH_DECIMAL_PRECISION)
      };
    }
    // Z commands don't need transformation
    
    return transformedCmd;
  });
};

// Helper interface for subpath bounds
interface SubpathWithBounds {
  elementId: string;
  subpathIndex: number;
  subpathCommands: any[];
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
        const transformedCommands = transformSvgCommands(originalSubpath.commands, deltaX, deltaY);
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

export interface SubpathPluginSlice {
  // State
  selectedSubpaths: Array<{ elementId: string; subpathIndex: number }>;

  // Actions
  selectSubpath: (elementId: string, subpathIndex: number, multiSelect?: boolean) => void;
  selectSubpaths: (subpaths: Array<{ elementId: string; subpathIndex: number }>) => void;
  clearSubpathSelection: () => void;
  getSelectedSubpathsCount: () => number;
  deleteSelectedSubpaths: () => void;
  
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

export const createSubpathPluginSlice: StateCreator<SubpathPluginSlice, [], [], SubpathPluginSlice> = (set, get) => ({
  // Initial state
  selectedSubpaths: [],

  // Actions
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
    // Implementation can be added later if needed
    console.log('Delete subpaths not implemented yet');
  },

  // Order functions
  bringSubpathToFront: () => {
    console.log('Bring subpath to front not implemented yet');
  },

  sendSubpathForward: () => {
    console.log('Send subpath forward not implemented yet');
  },

  sendSubpathBackward: () => {
    console.log('Send subpath backward not implemented yet');
  },

  sendSubpathToBack: () => {
    console.log('Send subpath to back not implemented yet');
  },

  // Alignment functions
  alignLeftSubpaths: () => {
    const state = get() as CanvasStore;
    const selectedSubpaths = get().selectedSubpaths;
    
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
          const bounds = measureSubpath(subpathCommands, pathData.strokeWidth || 1);
          
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
    
    // Find the leftmost position
    const minX = Math.min(...subpathBounds.map(sb => sb.bounds.minX));
    
    // Apply transformations using helper function
    applySubpathTransformations(state, subpathBounds, (subpathInfo) => ({
      deltaX: minX - subpathInfo.bounds.minX,
      deltaY: 0
    }));
  },

  alignCenterSubpaths: () => {
    const state = get() as CanvasStore;
    const selectedSubpaths = get().selectedSubpaths;
    
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
          
          const bounds = measureSubpath(subpathCommands, pathData.strokeWidth || 1);
          
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
    
    // Calculate average center position
    const targetCenterX = subpathBounds.reduce((sum, sb) => sum + sb.centerX, 0) / subpathBounds.length;
    
    // Apply transformations using helper function
    applySubpathTransformations(state, subpathBounds, (subpathInfo) => ({
      deltaX: targetCenterX - subpathInfo.centerX,
      deltaY: 0
    }));
  },

  alignRightSubpaths: () => {
    const state = get() as CanvasStore;
    const selectedSubpaths = get().selectedSubpaths;
    
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
          
          const bounds = measureSubpath(subpathCommands, pathData.strokeWidth || 1);
          
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
    
    // Find the rightmost position
    const maxX = Math.max(...subpathBounds.map(sb => sb.bounds.maxX));
    
    // Apply transformations using helper function
    applySubpathTransformations(state, subpathBounds, (subpathInfo) => ({
      deltaX: maxX - subpathInfo.bounds.maxX,
      deltaY: 0
    }));
  },

  alignTopSubpaths: () => {
    const state = get() as CanvasStore;
    const selectedSubpaths = get().selectedSubpaths;
    
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
          
          const bounds = measureSubpath(subpathCommands, pathData.strokeWidth || 1);
          
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
    
    // Find the topmost position
    const minY = Math.min(...subpathBounds.map(sb => sb.bounds.minY));
    
    // Apply transformations using helper function
    applySubpathTransformations(state, subpathBounds, (subpathInfo) => ({
      deltaX: 0,
      deltaY: minY - subpathInfo.bounds.minY
    }));
  },

  alignMiddleSubpaths: () => {
    const state = get() as CanvasStore;
    const selectedSubpaths = get().selectedSubpaths;
    
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
          
          const bounds = measureSubpath(subpathCommands, pathData.strokeWidth || 1);
          
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
    
    // Calculate average center position
    const targetCenterY = subpathBounds.reduce((sum, sb) => sum + sb.centerY, 0) / subpathBounds.length;
    
    // Apply transformations using helper function
    applySubpathTransformations(state, subpathBounds, (subpathInfo) => ({
      deltaX: 0,
      deltaY: targetCenterY - subpathInfo.centerY
    }));
  },

  alignBottomSubpaths: () => {
    const state = get() as CanvasStore;
    const selectedSubpaths = get().selectedSubpaths;
    
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
          
          const bounds = measureSubpath(subpathCommands, pathData.strokeWidth || 1);
          
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
    
    // Find the bottommost position
    const maxY = Math.max(...subpathBounds.map(sb => sb.bounds.maxY));
    
    // Apply transformations using helper function
    applySubpathTransformations(state, subpathBounds, (subpathInfo) => ({
      deltaX: 0,
      deltaY: maxY - subpathInfo.bounds.maxY
    }));
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
          
          const bounds = measureSubpath(subpathCommands, pathData.strokeWidth || 1);
          
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
          
          const bounds = measureSubpath(subpathCommands, pathData.strokeWidth || 1);
          
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
});