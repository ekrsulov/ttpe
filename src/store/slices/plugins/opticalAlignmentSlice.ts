import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../canvasStore';
import type { AlignmentResult } from '../../../utils/opticalAlignmentUtils';
import { detectContainer, prepareContentInfo, calculateOpticalAlignment } from '../../../utils/opticalAlignmentUtils';
import { translateCommands } from '../../../utils/transformationUtils';
import type { PathData, CanvasElement, SubPath } from '../../../types';

// Type for alignment offset
interface AlignmentOffset {
  elementId: string;
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

// Helper to validate and get container/content info
interface ValidatedAlignment {
  containerInfo: NonNullable<ReturnType<typeof detectContainer>>;
  contentInfo: NonNullable<ReturnType<typeof prepareContentInfo>>;
}

function getValidatedAlignmentData(state: CanvasStore): ValidatedAlignment | null {
  const containerInfo = detectContainer(state.elements, state.selectedIds);
  if (!containerInfo) return null;

  const contentInfo = prepareContentInfo(state.elements, state.selectedIds, containerInfo);
  if (contentInfo.length === 0) return null;

  return { containerInfo, contentInfo };
}

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

    const validated = getValidatedAlignmentData(state);
    if (!validated) {
      set(() => ({ currentAlignment: null }));
      return;
    }

    // Calculate optimal alignment automatically
    const alignmentResult = calculateOpticalAlignment(
      validated.containerInfo,
      validated.contentInfo
    );

    set(() => ({ currentAlignment: alignmentResult }));
  },

  applyAlignment: () => {
    const currentAlignment = get().currentAlignment;
    if (!currentAlignment) return;

    const state = get() as CanvasStore;

    // Apply offsets to elements (simplified - only full elements, no subpaths)
    currentAlignment.offsets.forEach((offset: AlignmentOffset) => {
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
    });

    set(() => ({ currentAlignment: null }));
  },

  previewAlignment: () => {
    // For preview, we just calculate without applying
    get().calculateAlignment();
  },

  resetAlignment: () => {
    // Only reset if there's an active alignment (avoid unnecessary set() calls)
    const state = get() as CanvasStore;
    if (state.currentAlignment !== null) {
      set(() => ({
        currentAlignment: null
      }));
    }
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
    // Need exactly 2 selected elements (no subpaths)
    return state.selectedIds.length === 2 && state.selectedSubpaths.length === 0 && state.activePlugin === 'select';
  },

  getAlignmentValidationMessage: () => {
    const state = get() as CanvasStore;
    
    if (state.activePlugin !== 'select') {
      return 'Optical alignment is only available in select mode';
    }
    
    if (state.selectedSubpaths.length > 0) {
      return 'Optical alignment does not support subpath selection. Select complete paths only.';
    }
    
    if (state.selectedIds.length !== 2) {
      return 'Select exactly two paths (one container and one content path)';
    }
    
    const validated = getValidatedAlignmentData(state);
    
    if (!validated) {
      return 'Could not determine container. Ensure both paths are valid.';
    }
    
    // Check if the content is actually contained within the container
    const containerBounds = validated.containerInfo.bounds;
    const isContained = validated.contentInfo.every(content => {
      const contentBounds = content.geometry.bounds;
      return contentBounds.minX >= containerBounds.minX &&
             contentBounds.minY >= containerBounds.minY &&
             contentBounds.maxX <= containerBounds.maxX &&
             contentBounds.maxY <= containerBounds.maxY;
    });
    
    if (!isContained) {
      return 'The content path must be completely contained within the container path';
    }
    
    return null; // All validation passed
  }
});