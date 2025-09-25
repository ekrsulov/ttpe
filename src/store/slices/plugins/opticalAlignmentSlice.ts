import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../canvasStore';
import type {
  AlignmentResult
} from '../../../utils/opticalAlignmentUtils';
import {
  detectContainer,
  prepareContentInfo,
  calculateOpticalAlignment
} from '../../../utils/opticalAlignmentUtils';
import { translateCommands } from '../../../utils/transformationUtils';
import type { PathData, CanvasElement, SubPath } from '../../../types';

// Type for alignment offset
interface AlignmentOffset {
  elementId: string;
  subpathIndex?: number;
  deltaX: number;
  deltaY: number;
}

export interface OpticalAlignmentState {
  // Current alignment result
  currentAlignment: AlignmentResult | null;
  
  // Visualization options
  showMathematicalCenter: boolean;
  showOpticalCenter: boolean;
  showMetrics: boolean;
  showDistanceRules: boolean;
}

export interface OpticalAlignmentActions {
  // Alignment operations
  calculateAlignment: () => void;
  applyAlignment: () => void;
  previewAlignment: () => void;
  resetAlignment: () => void;
  
  // Auto-reset functionality
  autoResetOnSelectionChange: () => void;
  
  // Visualization
  toggleMathematicalCenter: () => void;
  toggleOpticalCenter: () => void;
  toggleMetrics: () => void;
  toggleDistanceRules: () => void;
  
  // Validation
  canPerformOpticalAlignment: () => boolean;
  getAlignmentValidationMessage: () => string | null;
}

export type OpticalAlignmentSlice = OpticalAlignmentState & OpticalAlignmentActions;

export const createOpticalAlignmentSlice: StateCreator<
  CanvasStore,
  [],
  [],
  OpticalAlignmentSlice
> = (set, get) => ({
  // Initial state
  currentAlignment: null,
  showMathematicalCenter: true,
  showOpticalCenter: true,
  showMetrics: false,
  showDistanceRules: false,

  // Alignment operations
  calculateAlignment: () => {
    const state = get() as CanvasStore;
    
    if (!get().canPerformOpticalAlignment()) {
      set(() => ({ currentAlignment: null }));
      return;
    }

    // Detect container
    const containerInfo = detectContainer(
      state.elements,
      state.selectedIds,
      state.selectedSubpaths
    );

    if (!containerInfo) {
      set(() => ({ currentAlignment: null }));
      return;
    }

    // Prepare content info
    const contentInfo = prepareContentInfo(
      state.elements,
      state.selectedIds,
      state.selectedSubpaths,
      containerInfo
    );

    if (contentInfo.length === 0) {
      set(() => ({ currentAlignment: null }));
      return;
    }

    // Calculate optimal alignment automatically
    const alignmentResult = calculateOpticalAlignment(
      containerInfo,
      contentInfo
    );

    set(() => ({ currentAlignment: alignmentResult }));
  },

  applyAlignment: () => {
    const currentAlignment = get().currentAlignment;
    if (!currentAlignment) return;

    const state = get() as CanvasStore;

    // Apply offsets to elements
    currentAlignment.offsets.forEach((offset: AlignmentOffset) => {
      if (offset.subpathIndex !== undefined) {
        // Apply to subpath
        const elementIndex = state.elements.findIndex((el: CanvasElement) => el.id === offset.elementId);
        if (elementIndex !== -1) {
          const element = state.elements[elementIndex];
          if (element.type === 'path') {
            const pathData = element.data as PathData;
            
            if (offset.subpathIndex < pathData.subPaths.length) {
              const translatedSubpath = translateCommands(
                pathData.subPaths[offset.subpathIndex],
                offset.deltaX,
                offset.deltaY
              );
              
              const updatedSubPaths = [...pathData.subPaths];
              updatedSubPaths[offset.subpathIndex] = translatedSubpath;
              
              state.updateElement(offset.elementId, {
                data: {
                  ...pathData,
                  subPaths: updatedSubPaths
                }
              });
            }
          }
        }
      } else {
        // Apply to entire element
        const elementIndex = state.elements.findIndex((el: CanvasElement) => el.id === offset.elementId);
        if (elementIndex !== -1) {
          const element = state.elements[elementIndex];
          if (element.type === 'path') {
            const pathData = element.data as PathData;
            
            const translatedSubPaths = pathData.subPaths.map((subpath: SubPath) =>
              translateCommands(subpath, offset.deltaX, offset.deltaY)
            );
            
            state.updateElement(offset.elementId, {
              data: {
                ...pathData,
                subPaths: translatedSubPaths
              }
            });
          }
        }
      }
    });

    set(() => ({ currentAlignment: null }));
  },

  previewAlignment: () => {
    // For preview, we just calculate without applying
    get().calculateAlignment();
  },

  resetAlignment: () => {
    set(() => ({
      currentAlignment: null
    }));
  },

  // Auto-reset functionality
  autoResetOnSelectionChange: () => {
    // Clear any existing alignment calculations and preview when selection changes
    set(() => ({
      currentAlignment: null
    }));
  },

  // Visualization actions
  toggleMathematicalCenter: () => {
    set((state) => ({
      showMathematicalCenter: !state.showMathematicalCenter
    }));
  },

  toggleOpticalCenter: () => {
    set((state) => ({
      showOpticalCenter: !state.showOpticalCenter
    }));
  },

  toggleMetrics: () => {
    set((state) => ({
      showMetrics: !state.showMetrics
    }));
  },

  toggleDistanceRules: () => {
    set((state) => ({
      showDistanceRules: !state.showDistanceRules
    }));
  },

  // Validation
  canPerformOpticalAlignment: () => {
    const state = get() as CanvasStore;
    const totalSelected = state.selectedIds.length + state.selectedSubpaths.length;
    
    // Need at least 2 paths selected (one container + at least one content)
    return totalSelected >= 2 && state.activePlugin === 'select';
  },

  getAlignmentValidationMessage: () => {
    const state = get() as CanvasStore;
    
    if (state.activePlugin !== 'select') {
      return 'Optical alignment is only available in select mode';
    }
    
    const totalSelected = state.selectedIds.length + state.selectedSubpaths.length;
    
    if (totalSelected < 2) {
      return 'Select at least two paths (one container and one or more content paths)';
    }
    
    const containerInfo = detectContainer(
      state.elements,
      state.selectedIds,
      state.selectedSubpaths
    );
    
    if (!containerInfo) {
      return 'No valid container found. Ensure one of the selected paths contains the others';
    }
    
    const contentInfo = prepareContentInfo(
      state.elements,
      state.selectedIds,
      state.selectedSubpaths,
      containerInfo
    );
    
    if (contentInfo.length === 0) {
      return 'No content paths found for alignment';
    }
    
    return null; // All validation passed
  }
});