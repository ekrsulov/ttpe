import type { StateCreator } from 'zustand';
import { parsePathD, extractSubpaths } from '../../../utils/pathParserUtils';
import { measurePath } from '../../../utils/measurementUtils';
import { transformPathData } from '../../../utils/transformationUtils';

export interface TransformationPluginSlice {
  // State
  transformation: {
    isTransforming: boolean;
    activeHandler: string | null;
    showCoordinates: boolean;
    showRulers: boolean;
  };

  // Actions
  updateTransformationState: (state: Partial<TransformationPluginSlice['transformation']>) => void;
  getTransformationBounds: () => { minX: number; minY: number; maxX: number; maxY: number } | null;
  isWorkingWithSubpaths: () => boolean;
  applyTransformationToSubpaths: (
    elementId: string,
    scaleX: number,
    scaleY: number,
    transformOriginX: number,
    transformOriginY: number,
    rotation: number
  ) => void;
}

export const createTransformationPluginSlice: StateCreator<TransformationPluginSlice, [], [], TransformationPluginSlice> = (set, get) => ({
  // Initial state
  transformation: {
    isTransforming: false,
    activeHandler: null,
    showCoordinates: false,
    showRulers: false,
  },

  // Actions
  updateTransformationState: (state) => {
    set((current) => ({
      transformation: { ...current.transformation, ...state },
    }));
  },

  // Check if transformation should work with subpaths instead of full elements
  isWorkingWithSubpaths: () => {
    const state = get() as any;
    return state.selectedSubpaths && state.selectedSubpaths.length > 0;
  },

  // Get bounds for transformation - either from selected subpaths or selected elements
  getTransformationBounds: () => {
    const state = get() as any;
    const isSubpathMode = (get() as any).isWorkingWithSubpaths();
    
    if (isSubpathMode) {
      // Calculate bounds from selected subpaths
      const selectedSubpaths = state.selectedSubpaths;
      if (!selectedSubpaths || selectedSubpaths.length === 0) return null;

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      selectedSubpaths.forEach((selected: { elementId: string; subpathIndex: number }) => {
        const element = state.elements.find((el: any) => el.id === selected.elementId);
        if (element && element.type === 'path') {
          const pathData = element.data as any;
          const commands = parsePathD(pathData.d);
          const subpaths = extractSubpaths(commands);
          const subpathData = subpaths[selected.subpathIndex];
          
          if (subpathData) {
            const bounds = measurePath(subpathData.d, pathData.strokeWidth || 1, 1);
            minX = Math.min(minX, bounds.minX);
            minY = Math.min(minY, bounds.minY);
            maxX = Math.max(maxX, bounds.maxX);
            maxY = Math.max(maxY, bounds.maxY);
          }
        }
      });

      if (minX === Infinity) return null;
      return { minX, minY, maxX, maxY };
    } else {
      // Calculate bounds from selected elements (original behavior)
      const selectedIds = state.selectedIds;
      if (!selectedIds || selectedIds.length === 0) return null;

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      selectedIds.forEach((selectedId: string) => {
        const element = state.elements.find((el: any) => el.id === selectedId);
        if (element && element.type === 'path') {
          const pathData = element.data as any;
          const bounds = measurePath(pathData.d, pathData.strokeWidth || 1, 1);
          minX = Math.min(minX, bounds.minX);
          minY = Math.min(minY, bounds.minY);
          maxX = Math.max(maxX, bounds.maxX);
          maxY = Math.max(maxY, bounds.maxY);
        }
      });

      if (minX === Infinity) return null;
      return { minX, minY, maxX, maxY };
    }
  },

  // Apply transformation specifically to selected subpaths
  applyTransformationToSubpaths: (
    elementId: string,
    scaleX: number,
    scaleY: number,
    transformOriginX: number,
    transformOriginY: number,
    rotation: number
  ) => {
    const state = get() as any;
    const selectedSubpaths = state.selectedSubpaths;
    
    if (!selectedSubpaths || selectedSubpaths.length === 0) return;
    
    // Find subpaths for the specified element
    const elementSubpaths = selectedSubpaths.filter((selected: { elementId: string; subpathIndex: number }) => 
      selected.elementId === elementId
    );
    
    if (elementSubpaths.length === 0) return;
    
    const element = state.elements.find((el: any) => el.id === elementId);
    if (!element || element.type !== 'path') return;
    
    const pathData = element.data as any;
    const commands = parsePathD(pathData.d);
    const subpaths = extractSubpaths(commands);
    
    // Create a new path by combining original and transformed subpaths
    let newPathParts: string[] = [];
    let processedIndices = new Set();
    
    // Process each subpath
    subpaths.forEach((subpathData, index) => {
      const isSelected = elementSubpaths.some((selected: { subpathIndex: number }) => 
        selected.subpathIndex === index
      );
      
      if (isSelected) {
        // Transform this subpath
        const subpathPathData = {
          d: subpathData.d,
          strokeWidth: pathData.strokeWidth || 1,
          strokeColor: pathData.strokeColor || '#000000',
          strokeOpacity: pathData.strokeOpacity || 1,
          fillColor: pathData.fillColor || 'transparent',
          fillOpacity: pathData.fillOpacity || 0
        };
        
        const transformedSubpath = transformPathData(
          subpathPathData,
          scaleX,
          scaleY,
          transformOriginX,
          transformOriginY,
          rotation
        );
        
        newPathParts.push(transformedSubpath.d);
        processedIndices.add(index);
      } else {
        // Keep original subpath
        newPathParts.push(subpathData.d);
        processedIndices.add(index);
      }
    });
    
    // Combine all subpath parts into a single path
    const newD = newPathParts.join(' ');
    
    // Update the element with the new path data
    state.updateElement(elementId, {
      data: { ...pathData, d: newD }
    });
  },
});