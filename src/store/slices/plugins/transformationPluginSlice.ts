import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../canvasStore';
import { commandsToString } from '../../../utils/pathParserUtils';
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

export const createTransformationPluginSlice: StateCreator<TransformationPluginSlice, [], [], TransformationPluginSlice> = (set, get) => {
  // Helper function to accumulate bounds from a collection of commands
  const accumulateBounds = (commandsList: import('../../../types').Command[][], strokeWidth: number, zoom: number) => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    commandsList.forEach((commands) => {
      const bounds = measurePath([commands], strokeWidth, zoom);
      minX = Math.min(minX, bounds.minX);
      minY = Math.min(minY, bounds.minY);
      maxX = Math.max(maxX, bounds.maxX);
      maxY = Math.max(maxY, bounds.maxY);
    });

    return minX === Infinity ? null : { minX, minY, maxX, maxY };
  };

  return {
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
    const state = get() as CanvasStore;
    return state.selectedSubpaths && state.selectedSubpaths.length > 0;
  },

  // Get bounds for transformation - either from selected subpaths or selected elements
  getTransformationBounds: () => {
    const state = get() as CanvasStore;
    const isSubpathMode = (get() as CanvasStore).isWorkingWithSubpaths();
    
    if (isSubpathMode) {
      // Calculate bounds from selected subpaths
      const selectedSubpaths = state.selectedSubpaths;
      if (!selectedSubpaths || selectedSubpaths.length === 0) return null;

      const subpathCommandsToMeasure: import('../../../types').Command[][] = [];

      selectedSubpaths.forEach((selected: { elementId: string; subpathIndex: number }) => {
        const element = state.elements.find((el) => el.id === selected.elementId);
        if (element && element.type === 'path') {
          const pathData = element.data as import('../../../types').PathData;
          const subpaths = pathData.subPaths;
          const subpathData = subpaths[selected.subpathIndex];
          
          if (subpathData) {
            subpathCommandsToMeasure.push(subpathData);
          }
        }
      });

      if (subpathCommandsToMeasure.length === 0) return null;
      
      // Use the first element's stroke width and zoom for measurement
      const firstElement = state.elements.find((el) => 
        el.id === selectedSubpaths[0].elementId && el.type === 'path'
      );
      const strokeWidth = firstElement ? (firstElement.data as import('../../../types').PathData).strokeWidth : 1;
      
      return accumulateBounds(subpathCommandsToMeasure, strokeWidth, state.viewport.zoom);
    } else {
      // Calculate bounds from selected elements (original behavior)
      const selectedIds = state.selectedIds;
      if (!selectedIds || selectedIds.length === 0) return null;

      const elementCommandsToMeasure: import('../../../types').Command[][] = [];
      let commonStrokeWidth = 1;

      selectedIds.forEach((selectedId: string) => {
        const element = state.elements.find((el) => el.id === selectedId);
        if (element && element.type === 'path') {
          const pathData = element.data as import('../../../types').PathData;
          elementCommandsToMeasure.push(...pathData.subPaths);
          commonStrokeWidth = pathData.strokeWidth;
        }
      });

      if (elementCommandsToMeasure.length === 0) return null;
      
      return accumulateBounds(elementCommandsToMeasure, commonStrokeWidth, state.viewport.zoom);
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
    const state = get() as CanvasStore;
    const selectedSubpaths = state.selectedSubpaths;
    
    if (!selectedSubpaths || selectedSubpaths.length === 0) return;
    
    // Find subpaths for the specified element
    const elementSubpaths = selectedSubpaths.filter((selected: { elementId: string; subpathIndex: number }) => 
      selected.elementId === elementId
    );
    
    if (elementSubpaths.length === 0) return;
    
    const element = state.elements.find((el) => el.id === elementId);
    if (!element || element.type !== 'path') return;
    
    const pathData = element.data as import('../../../types').PathData;
    const subpaths = pathData.subPaths.map((commands) => ({
      commands,
      d: commandsToString(commands),
      startIndex: 0, // Not needed for this logic
      endIndex: commands.length - 1
    }));
    
    // Create new subPaths by transforming selected ones
    const newSubPaths = subpaths.map((subpathData, index) => {
      const isSelected = elementSubpaths.some((selected: { subpathIndex: number }) => 
        selected.subpathIndex === index
      );
      
      if (isSelected) {
        // Transform this subpath
        const subpathPathData = {
          subPaths: [subpathData.commands],
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
        
        return transformedSubpath.subPaths[0]; // Return the transformed commands
      } else {
        // Keep original subpath
        return subpathData.commands;
      }
    });
    
    // Update the element with the new subPaths
    state.updateElement(elementId, {
      data: { ...pathData, subPaths: newSubPaths }
    });
  }
}};