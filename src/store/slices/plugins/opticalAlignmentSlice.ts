import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../canvasStore';
import type { CanvasElement, PathData, Command } from '../../../types';
import { calculateVisualCenter, pathToRGBMatrix } from '../../../utils/visualCenterUtils';
import { commandsToString } from '../../../utils/path';

interface OpticalAlignmentResult {
  containerElement: CanvasElement;
  contentElement: CanvasElement;
  visualCenter: { x: number; y: number };
  mathematicalCenter: { x: number; y: number };
  offset: { x: number; y: number };
}

export interface OpticalAlignmentSlice {
  // State
  opticalAlignmentResult: OpticalAlignmentResult | null;
  isCalculatingAlignment: boolean;

  // Actions
  calculateOpticalAlignment: () => Promise<void>;
  applyOpticalAlignment: () => void;
  clearOpticalAlignment: () => void;
  canPerformOpticalAlignment: () => boolean;
  applyOpticalAlignmentToAllPairs: () => Promise<void>;
  applyMathematicalAlignment: () => void;
  applyMathematicalAlignmentToAllPairs: () => void;
  selectAllContainers: () => void;
  selectAllContents: () => void;
}

/**
 * Helper to calculate bounds from subpaths
 */
function calculateBounds(subPaths: Command[][]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  subPaths.forEach(subPath => {
    subPath.forEach(cmd => {
      if (cmd.type === 'M' || cmd.type === 'L') {
        minX = Math.min(minX, cmd.position.x);
        minY = Math.min(minY, cmd.position.y);
        maxX = Math.max(maxX, cmd.position.x);
        maxY = Math.max(maxY, cmd.position.y);
      } else if (cmd.type === 'C') {
        minX = Math.min(minX, cmd.controlPoint1.x, cmd.controlPoint2.x, cmd.position.x);
        minY = Math.min(minY, cmd.controlPoint1.y, cmd.controlPoint2.y, cmd.position.y);
        maxX = Math.max(maxX, cmd.controlPoint1.x, cmd.controlPoint2.x, cmd.position.x);
        maxY = Math.max(maxY, cmd.controlPoint1.y, cmd.controlPoint2.y, cmd.position.y);
      }
    });
  });

  return { minX, minY, maxX, maxY };
}

/**
 * Helper to apply translation offset to path subpaths
 */
function translateSubPaths(subPaths: Command[][], offset: { x: number; y: number }): Command[][] {
  return subPaths.map(subPath =>
    subPath.map(cmd => {
      if (cmd.type === 'M' || cmd.type === 'L') {
        return {
          ...cmd,
          position: {
            x: cmd.position.x + offset.x,
            y: cmd.position.y + offset.y
          }
        };
      } else if (cmd.type === 'C') {
        return {
          ...cmd,
          controlPoint1: {
            ...cmd.controlPoint1,
            x: cmd.controlPoint1.x + offset.x,
            y: cmd.controlPoint1.y + offset.y
          },
          controlPoint2: {
            ...cmd.controlPoint2,
            x: cmd.controlPoint2.x + offset.x,
            y: cmd.controlPoint2.y + offset.y
          },
          position: {
            x: cmd.position.x + offset.x,
            y: cmd.position.y + offset.y
          }
        };
      }
      return cmd;
    })
  );
}

interface PathElementInfo {
  element: CanvasElement;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  area: number;
  center: { x: number; y: number };
}

/**
 * Find feasible container-content pairs from a list of path elements
 */
function findFeasiblePairs(pathElements: PathElementInfo[]): Array<{ container: CanvasElement; content: CanvasElement }> {
  const processedContent = new Set<string>();
  const feasiblePairs: Array<{ container: CanvasElement; content: CanvasElement }> = [];

  // Sort by area descending to process larger elements first
  const sortedElements = [...pathElements].sort((a, b) => b.area - a.area);

  for (const contentCandidate of sortedElements) {
    if (processedContent.has(contentCandidate.element.id)) continue;

    // Find the closest container that:
    // 1. Is at least 1.5x larger
    // 2. Contains or is nearest to this content
    let bestContainer: PathElementInfo | null = null;
    let bestDistance = Infinity;

    for (const containerCandidate of sortedElements) {
      if (containerCandidate.element.id === contentCandidate.element.id) continue;
      if (processedContent.has(containerCandidate.element.id)) continue;

      const ratio = containerCandidate.area / contentCandidate.area;
      
      // Only consider as container if significantly larger
      if (ratio >= 1.5) {
        // Calculate distance between centers
        const dx = containerCandidate.center.x - contentCandidate.center.x;
        const dy = containerCandidate.center.y - contentCandidate.center.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Check if content is within or very close to container bounds
        const isNear = 
          contentCandidate.center.x >= containerCandidate.bounds.minX - 50 &&
          contentCandidate.center.x <= containerCandidate.bounds.maxX + 50 &&
          contentCandidate.center.y >= containerCandidate.bounds.minY - 50 &&
          contentCandidate.center.y <= containerCandidate.bounds.maxY + 50;

        if (isNear && distance < bestDistance) {
          bestDistance = distance;
          bestContainer = containerCandidate;
        }
      }
    }

    if (bestContainer) {
      feasiblePairs.push({
        container: bestContainer.element,
        content: contentCandidate.element
      });
      processedContent.add(contentCandidate.element.id);
      processedContent.add(bestContainer.element.id);
    }
  }

  return feasiblePairs;
}

/**
 * Calculate mathematical alignment offset between container and content
 */
function calculateMathematicalOffset(
  containerBounds: { minX: number; minY: number; maxX: number; maxY: number },
  contentBounds: { minX: number; minY: number; maxX: number; maxY: number }
): { x: number; y: number } {
  const containerMathCenter = {
    x: (containerBounds.minX + containerBounds.maxX) / 2,
    y: (containerBounds.minY + containerBounds.maxY) / 2
  };

  const contentMathCenter = {
    x: (contentBounds.minX + contentBounds.maxX) / 2,
    y: (contentBounds.minY + contentBounds.maxY) / 2
  };

  return {
    x: containerMathCenter.x - contentMathCenter.x,
    y: containerMathCenter.y - contentMathCenter.y
  };
}

/**
 * Get all path elements with their bounds, area and center
 * Helper function to avoid code duplication
 */
function getPathElementsInfo(elements: CanvasElement[]): PathElementInfo[] {
  return elements
    .filter(el => el.type === 'path')
    .map(el => {
      const bounds = calculateBounds((el.data as PathData).subPaths);
      const area = (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY);
      const center = {
        x: (bounds.minX + bounds.maxX) / 2,
        y: (bounds.minY + bounds.maxY) / 2
      };
      return { element: el, bounds, area, center };
    });
}

export const createOpticalAlignmentSlice: StateCreator<
  CanvasStore,
  [],
  [],
  OpticalAlignmentSlice
> = (set, get) => ({
  // Initial state
  opticalAlignmentResult: null,
  isCalculatingAlignment: false,

  canPerformOpticalAlignment: () => {
    const state = get();
    const selectedElements = state.elements.filter(el => 
      state.selectedIds.includes(el.id) && el.type === 'path'
    );

    if (selectedElements.length !== 2) return false;

    // Check if one element is clearly larger (container) than the other
    const bounds1 = calculateBounds((selectedElements[0].data as PathData).subPaths);
    const bounds2 = calculateBounds((selectedElements[1].data as PathData).subPaths);

    const area1 = (bounds1.maxX - bounds1.minX) * (bounds1.maxY - bounds1.minY);
    const area2 = (bounds2.maxX - bounds2.minX) * (bounds2.maxY - bounds2.minY);

    // One should be at least 1.5x larger than the other
    return Math.max(area1, area2) / Math.min(area1, area2) >= 1.5;
  },

  calculateOpticalAlignment: async () => {
    const state = get();
    
    if (!get().canPerformOpticalAlignment()) {
      return;
    }

    set({ isCalculatingAlignment: true } as Partial<CanvasStore>);

    try {
      const selectedElements = state.elements.filter(el => 
        state.selectedIds.includes(el.id) && el.type === 'path'
      );

      // Determine which is container and which is content
      const bounds1 = calculateBounds((selectedElements[0].data as PathData).subPaths);
      const bounds2 = calculateBounds((selectedElements[1].data as PathData).subPaths);

      const area1 = (bounds1.maxX - bounds1.minX) * (bounds1.maxY - bounds1.minY);
      const area2 = (bounds2.maxX - bounds2.minX) * (bounds2.maxY - bounds2.minY);

      const containerElement = area1 > area2 ? selectedElements[0] : selectedElements[1];
      const contentElement = area1 > area2 ? selectedElements[1] : selectedElements[0];

      const containerData = containerElement.data as PathData;
      const contentData = contentElement.data as PathData;

      // Calculate bounds for both elements
      const containerBounds = calculateBounds(containerData.subPaths);
      const contentBounds = calculateBounds(contentData.subPaths);

      // Get paths as strings using commandsToString
      const contentPath = commandsToString(contentData.subPaths.flat());

      // Calculate container dimensions for proper scaling
      const containerWidth = containerBounds.maxX - containerBounds.minX;
      const containerHeight = containerBounds.maxY - containerBounds.minY;

      // Get the visual properties from the content element's data
      const fillColor = contentData.fillColor || 'black';
      const fillOpacity = contentData.fillOpacity ?? 1;
      const strokeColor = contentData.strokeColor || 'none';
      const strokeWidth = contentData.strokeWidth || 0;
      const strokeOpacity = contentData.strokeOpacity ?? 1;
      const strokeLinecap = contentData.strokeLinecap || 'butt';
      const strokeLinejoin = contentData.strokeLinejoin || 'miter';
      const strokeDasharray = contentData.strokeDasharray || '';

      // Convert content to RGB matrix and calculate visual center
      // Pass container dimensions and all visual properties for accurate representation
      // scaleStrokeWidth = false to prevent thick strokes in the analysis image
      const rgbMatrix = await pathToRGBMatrix(
        contentPath, 
        containerWidth, 
        containerHeight, 
        fillColor,
        fillOpacity,
        strokeColor,
        strokeWidth,
        strokeOpacity,
        strokeLinecap,
        strokeLinejoin,
        strokeDasharray,
        false, // Don't scale stroke width with path scale
        420
      );
      const visualCenter = calculateVisualCenter(rgbMatrix);

      // Calculate mathematical centers
      const containerMathCenter = {
        x: (containerBounds.minX + containerBounds.maxX) / 2,
        y: (containerBounds.minY + containerBounds.maxY) / 2
      };

      const contentMathCenter = {
        x: (contentBounds.minX + contentBounds.maxX) / 2,
        y: (contentBounds.minY + contentBounds.maxY) / 2
      };

      // Convert visual center from normalized (0-1) to actual coordinates
      const contentWidth = contentBounds.maxX - contentBounds.minX;
      const contentHeight = contentBounds.maxY - contentBounds.minY;

      const visualCenterActual = {
        x: contentBounds.minX + visualCenter.x * contentWidth,
        y: contentBounds.minY + visualCenter.y * contentHeight
      };

      // Calculate offset needed to align visual center to container's mathematical center
      const offset = {
        x: containerMathCenter.x - visualCenterActual.x,
        y: containerMathCenter.y - visualCenterActual.y
      };

      set({
        opticalAlignmentResult: {
          containerElement,
          contentElement,
          visualCenter: visualCenterActual,
          mathematicalCenter: contentMathCenter,
          offset
        },
        isCalculatingAlignment: false
      } as Partial<CanvasStore>);
    } catch (error) {
      console.error('Error calculating optical alignment:', error);
      set({ 
        isCalculatingAlignment: false,
        opticalAlignmentResult: null
      } as Partial<CanvasStore>);
    }
  },

  applyOpticalAlignment: () => {
    const state = get();
    const result = state.opticalAlignmentResult;

    if (!result) return;

    const contentData = result.contentElement.data as PathData;
    
    // Apply the offset to all subpaths
    const translatedSubPaths = translateSubPaths(contentData.subPaths, result.offset);

    // Update the element
    state.updateElement(result.contentElement.id, {
      data: {
        ...contentData,
        subPaths: translatedSubPaths
      }
    });

    // Clear the result
    set({ opticalAlignmentResult: null } as Partial<CanvasStore>);
  },

  clearOpticalAlignment: () => {
    set({ opticalAlignmentResult: null });
  },

  applyOpticalAlignmentToAllPairs: async () => {
    const state = get();
    set({ isCalculatingAlignment: true } as Partial<CanvasStore>);

    try {
      // Get all path elements with their bounds and areas using helper
      const pathElements = getPathElementsInfo(state.elements);

      // Find all feasible pairs using the helper function
      const feasiblePairs = findFeasiblePairs(pathElements);

      // Apply alignment to each pair
      for (const pair of feasiblePairs) {
        const containerData = pair.container.data as PathData;
        const contentData = pair.content.data as PathData;

        // Calculate bounds for both elements
        const containerBounds = calculateBounds(containerData.subPaths);
        const contentBounds = calculateBounds(contentData.subPaths);

        // Get paths as strings using commandsToString
        const contentPath = commandsToString(contentData.subPaths.flat());

        // Calculate container dimensions for proper scaling
        const containerWidth = containerBounds.maxX - containerBounds.minX;
        const containerHeight = containerBounds.maxY - containerBounds.minY;

        // Get the visual properties from the content element's data
        const fillColor = contentData.fillColor || 'black';
        const fillOpacity = contentData.fillOpacity ?? 1;
        const strokeColor = contentData.strokeColor || 'none';
        const strokeWidth = contentData.strokeWidth || 0;
        const strokeOpacity = contentData.strokeOpacity ?? 1;
        const strokeLinecap = contentData.strokeLinecap || 'butt';
        const strokeLinejoin = contentData.strokeLinejoin || 'miter';
        const strokeDasharray = contentData.strokeDasharray || '';

        // Convert content to RGB matrix and calculate visual center
        // Pass container dimensions and all visual properties for accurate representation
        // scaleStrokeWidth = false to prevent thick strokes in the analysis image
        const rgbMatrix = await pathToRGBMatrix(
          contentPath, 
          containerWidth, 
          containerHeight, 
          fillColor,
          fillOpacity,
          strokeColor,
          strokeWidth,
          strokeOpacity,
          strokeLinecap,
          strokeLinejoin,
          strokeDasharray,
          false, // Don't scale stroke width with path scale
          420
        );
        const visualCenter = calculateVisualCenter(rgbMatrix);

        // Calculate mathematical centers
        const containerMathCenter = {
          x: (containerBounds.minX + containerBounds.maxX) / 2,
          y: (containerBounds.minY + containerBounds.maxY) / 2
        };

        // Convert visual center from normalized (0-1) to actual coordinates
        const contentWidth = contentBounds.maxX - contentBounds.minX;
        const contentHeight = contentBounds.maxY - contentBounds.minY;

        const visualCenterActual = {
          x: contentBounds.minX + visualCenter.x * contentWidth,
          y: contentBounds.minY + visualCenter.y * contentHeight
        };

        // Calculate offset needed to align visual center to container's mathematical center
        const offset = {
          x: containerMathCenter.x - visualCenterActual.x,
          y: containerMathCenter.y - visualCenterActual.y
        };

        // Apply the offset to all subpaths
        const translatedSubPaths = translateSubPaths(contentData.subPaths, offset);

        // Update the element
        state.updateElement(pair.content.id, {
          data: {
            ...contentData,
            subPaths: translatedSubPaths
          }
        });
      }

      set({ 
        isCalculatingAlignment: false,
        opticalAlignmentResult: null
      } as Partial<CanvasStore>);
    } catch (error) {
      console.error('Error applying optical alignment to all pairs:', error);
      set({ 
        isCalculatingAlignment: false,
        opticalAlignmentResult: null
      } as Partial<CanvasStore>);
    }
  },

  applyMathematicalAlignment: () => {
    const state = get();
    
    if (!get().canPerformOpticalAlignment()) {
      return;
    }

    const selectedElements = state.elements.filter(el => 
      state.selectedIds.includes(el.id) && el.type === 'path'
    );

    // Determine which is container and which is content
    const bounds1 = calculateBounds((selectedElements[0].data as PathData).subPaths);
    const bounds2 = calculateBounds((selectedElements[1].data as PathData).subPaths);

    const area1 = (bounds1.maxX - bounds1.minX) * (bounds1.maxY - bounds1.minY);
    const area2 = (bounds2.maxX - bounds2.minX) * (bounds2.maxY - bounds2.minY);

    const containerElement = area1 > area2 ? selectedElements[0] : selectedElements[1];
    const contentElement = area1 > area2 ? selectedElements[1] : selectedElements[0];

    const containerData = containerElement.data as PathData;
    const contentData = contentElement.data as PathData;

    // Calculate bounds for both elements
    const containerBounds = calculateBounds(containerData.subPaths);
    const contentBounds = calculateBounds(contentData.subPaths);

    // Calculate offset using helper function
    const offset = calculateMathematicalOffset(containerBounds, contentBounds);

    // Apply the offset to all subpaths
    const translatedSubPaths = translateSubPaths(contentData.subPaths, offset);

    // Update the element
    state.updateElement(contentElement.id, {
      data: {
        ...contentData,
        subPaths: translatedSubPaths
      }
    });
  },

  applyMathematicalAlignmentToAllPairs: () => {
    const state = get();

    // Get all path elements with their bounds and areas using helper
    const pathElements = getPathElementsInfo(state.elements);

    // Find all feasible pairs using the helper function
    const feasiblePairs = findFeasiblePairs(pathElements);

    // Apply mathematical alignment to each pair
    for (const pair of feasiblePairs) {
      const containerData = pair.container.data as PathData;
      const contentData = pair.content.data as PathData;

      // Calculate bounds for both elements
      const containerBounds = calculateBounds(containerData.subPaths);
      const contentBounds = calculateBounds(contentData.subPaths);

      // Calculate offset using helper function
      const offset = calculateMathematicalOffset(containerBounds, contentBounds);

      // Apply the offset to all subpaths
      const translatedSubPaths = translateSubPaths(contentData.subPaths, offset);

      // Update the element
      state.updateElement(pair.content.id, {
        data: {
          ...contentData,
          subPaths: translatedSubPaths
        }
      });
    }
  },

  selectAllContainers: () => {
    const state = get();

    // Get all path elements info using helper
    const pathElements = getPathElementsInfo(state.elements);

    // Find all feasible pairs
    const feasiblePairs = findFeasiblePairs(pathElements);

    // Extract container IDs
    const containerIds = feasiblePairs.map(pair => pair.container.id);

    // Select all containers
    state.selectElements(containerIds);
  },

  selectAllContents: () => {
    const state = get();

    // Get all path elements info using helper
    const pathElements = getPathElementsInfo(state.elements);

    // Find all feasible pairs
    const feasiblePairs = findFeasiblePairs(pathElements);

    // Extract content IDs
    const contentIds = feasiblePairs.map(pair => pair.content.id);

    // Select all contents
    state.selectElements(contentIds);
  }
});
