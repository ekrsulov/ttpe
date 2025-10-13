import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../canvasStore';
import type { CanvasElement, PathData, Command } from '../../../types';
import { 
  calculateVisualCenter, 
  pathToRGBMatrix,
  PROTECTION_PADDING_TOP_PERCENT,
  PROTECTION_PADDING_BOTTOM_PERCENT,
  PROTECTION_PADDING_LEFT_PERCENT,
  PROTECTION_PADDING_RIGHT_PERCENT
} from '../../../utils/visualCenterUtils';
import { commandsToString } from '../../../utils/path';
import { measurePath } from '../../../utils/measurementUtils';

// Minimum area ratio required for container/content pair recognition
// Container must be at least this many times larger than content
const MIN_CONTAINER_CONTENT_AREA_RATIO = 1.05;

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
 * Helper to calculate bounds from subpaths including stroke width
 * Uses measurePath which creates a ghost SVG to get accurate visual bounds
 */
function calculateBounds(
  subPaths: Command[][], 
  strokeWidth: number = 0,
  zoom: number = 1
): { minX: number; minY: number; maxX: number; maxY: number } {
  return measurePath(subPaths, strokeWidth, zoom);
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

/**
 * Apply protection padding to offset
 * This ensures the content doesn't get too close to the container edges
 * by limiting the displacement based on protection padding percentages
 * Note: contentBounds already includes stroke width (calculated via measurePath with ghost SVG)
 */
function applyProtectionPadding(
  offset: { x: number; y: number },
  contentBounds: { minX: number; minY: number; maxX: number; maxY: number },
  containerBounds: { minX: number; minY: number; maxX: number; maxY: number },
  strokeWidth: number = 0
): { x: number; y: number } {
  // Calculate container dimensions
  const containerWidth = containerBounds.maxX - containerBounds.minX;
  const containerHeight = containerBounds.maxY - containerBounds.minY;

  // Calculate protection padding in actual units
  const paddingLeft = (PROTECTION_PADDING_LEFT_PERCENT / 100) * containerWidth;
  const paddingRight = (PROTECTION_PADDING_RIGHT_PERCENT / 100) * containerWidth;
  const paddingTop = (PROTECTION_PADDING_TOP_PERCENT / 100) * containerHeight;
  const paddingBottom = (PROTECTION_PADDING_BOTTOM_PERCENT / 100) * containerHeight;

  // Calculate the new position after applying the proposed offset
  // contentBounds already includes stroke, so no need to add strokeExtension
  const newContentMinX = contentBounds.minX + offset.x;
  const newContentMaxX = contentBounds.maxX + offset.x;
  const newContentMinY = contentBounds.minY + offset.y;
  const newContentMaxY = contentBounds.maxY + offset.y;

  // Calculate the limits (container bounds with protection padding)
  const minAllowedX = containerBounds.minX + paddingLeft;
  const maxAllowedX = containerBounds.maxX - paddingRight;
  const minAllowedY = containerBounds.minY + paddingTop;
  const maxAllowedY = containerBounds.maxY - paddingBottom;

  // Clamp the offset to respect protection padding
  let adjustedOffsetX = offset.x;
  let adjustedOffsetY = offset.y;

  // Adjust X if content would go beyond left or right padding
  if (newContentMinX < minAllowedX) {
    adjustedOffsetX = minAllowedX - contentBounds.minX;
  } else if (newContentMaxX > maxAllowedX) {
    adjustedOffsetX = maxAllowedX - contentBounds.maxX;
  }

  // Adjust Y if content would go beyond top or bottom padding
  if (newContentMinY < minAllowedY) {
    adjustedOffsetY = minAllowedY - contentBounds.minY;
  } else if (newContentMaxY > maxAllowedY) {
    adjustedOffsetY = maxAllowedY - contentBounds.maxY;
  }

  // Debug: Log when protection padding is applied
  if (adjustedOffsetX !== offset.x || adjustedOffsetY !== offset.y) {
    console.log('[Protection Padding] Offset adjusted to respect padding limits');
    console.log('[Protection Padding] Original offset:', offset);
    console.log('[Protection Padding] Adjusted offset:', { x: adjustedOffsetX, y: adjustedOffsetY });
    console.log('[Protection Padding] Content stroke width:', strokeWidth, 'px (already included in bounds)');
    console.log('[Protection Padding] Padding (%):', {
      top: PROTECTION_PADDING_TOP_PERCENT,
      bottom: PROTECTION_PADDING_BOTTOM_PERCENT,
      left: PROTECTION_PADDING_LEFT_PERCENT,
      right: PROTECTION_PADDING_RIGHT_PERCENT
    });
    console.log('[Protection Padding] Padding (px):', {
      top: paddingTop.toFixed(2),
      bottom: paddingBottom.toFixed(2),
      left: paddingLeft.toFixed(2),
      right: paddingRight.toFixed(2)
    });
  }

  return {
    x: adjustedOffsetX,
    y: adjustedOffsetY
  };
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
    // 1. Is at least MIN_CONTAINER_CONTENT_AREA_RATIO times larger
    // 2. Contains or is nearest to this content
    let bestContainer: PathElementInfo | null = null;
    let bestDistance = Infinity;

    for (const containerCandidate of sortedElements) {
      if (containerCandidate.element.id === contentCandidate.element.id) continue;
      if (processedContent.has(containerCandidate.element.id)) continue;

      const ratio = containerCandidate.area / contentCandidate.area;
      
      // Only consider as container if significantly larger
      if (ratio >= MIN_CONTAINER_CONTENT_AREA_RATIO) {
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
function getPathElementsInfo(elements: CanvasElement[], zoom: number = 1): PathElementInfo[] {
  return elements
    .filter(el => el.type === 'path')
    .map(el => {
      const pathData = el.data as PathData;
      const bounds = calculateBounds(pathData.subPaths, pathData.strokeWidth || 0, zoom);
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
    const pathData1 = selectedElements[0].data as PathData;
    const pathData2 = selectedElements[1].data as PathData;
    const zoom = get().viewport.zoom;
    
    const bounds1 = calculateBounds(pathData1.subPaths, pathData1.strokeWidth || 0, zoom);
    const bounds2 = calculateBounds(pathData2.subPaths, pathData2.strokeWidth || 0, zoom);

    const area1 = (bounds1.maxX - bounds1.minX) * (bounds1.maxY - bounds1.minY);
    const area2 = (bounds2.maxX - bounds2.minX) * (bounds2.maxY - bounds2.minY);

    // One should be at least MIN_CONTAINER_CONTENT_AREA_RATIO times larger than the other
    return Math.max(area1, area2) / Math.min(area1, area2) >= MIN_CONTAINER_CONTENT_AREA_RATIO;
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
      const pathData1 = selectedElements[0].data as PathData;
      const pathData2 = selectedElements[1].data as PathData;
      const zoom = state.viewport.zoom;
      
      const bounds1 = calculateBounds(pathData1.subPaths, pathData1.strokeWidth || 0, zoom);
      const bounds2 = calculateBounds(pathData2.subPaths, pathData2.strokeWidth || 0, zoom);

      const area1 = (bounds1.maxX - bounds1.minX) * (bounds1.maxY - bounds1.minY);
      const area2 = (bounds2.maxX - bounds2.minX) * (bounds2.maxY - bounds2.minY);

      const containerElement = area1 > area2 ? selectedElements[0] : selectedElements[1];
      const contentElement = area1 > area2 ? selectedElements[1] : selectedElements[0];

      const containerData = containerElement.data as PathData;
      const contentData = contentElement.data as PathData;

      // Calculate bounds for both elements (including stroke width)
      const containerBounds = calculateBounds(
        containerData.subPaths, 
        containerData.strokeWidth || 0,
        get().viewport.zoom
      );
      const contentBounds = calculateBounds(
        contentData.subPaths,
        contentData.strokeWidth || 0,
        get().viewport.zoom
      );

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
      
      // Get the container's fill color for accurate background representation
      // If container has no fill (none), use white background
      const containerFillColor = (containerData.fillColor && containerData.fillColor !== 'none') 
        ? containerData.fillColor 
        : 'white';

      // Convert content to RGB matrix and calculate visual center
      // Pass container dimensions and all visual properties for accurate representation
      // scaleStrokeWidth = false to prevent thick strokes in the analysis image
      const { rgbMatrix, bgColor } = await pathToRGBMatrix(
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
        containerFillColor, // Use container's fill color as background
        420
      );
      // Pass the known background color to the algorithm instead of auto-detecting
      const visualCenter = calculateVisualCenter(rgbMatrix, bgColor);

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
      const rawOffset = {
        x: containerMathCenter.x - visualCenterActual.x,
        y: containerMathCenter.y - visualCenterActual.y
      };

      // Apply protection padding to prevent content from getting too close to edges
      // Consider strokeWidth to ensure stroke doesn't go beyond padding limits
      const offset = applyProtectionPadding(rawOffset, contentBounds, containerBounds, strokeWidth);

      const result: OpticalAlignmentResult = {
        containerElement,
        contentElement,
        visualCenter: visualCenterActual,
        mathematicalCenter: contentMathCenter,
        offset
      };

      // Log the result in both formats
      console.log('\n=== Optical Alignment Result ===');
      console.log('OpticalAlignmentResult:', {
        container: containerElement.id,
        content: contentElement.id,
        visualCenter: visualCenterActual,
        mathematicalCenter: contentMathCenter,
        offset
      });
      
      // Human-readable format (similar to visual-center library)
      const contentName = contentElement.id;
      const visualCenterPercent = {
        x: (visualCenter.x * 100).toFixed(1),
        y: (visualCenter.y * 100).toFixed(1)
      };
      const movePercent = {
        x: ((offset.x / contentWidth) * 100).toFixed(1),
        y: ((offset.y / contentHeight) * 100).toFixed(1)
      };
      const horizontalDirection = offset.x > 0 ? 'right' : 'left';
      const verticalDirection = offset.y > 0 ? 'down' : 'up';
      
      console.log(`\n${contentName}`);
      console.log(`The visual center is at ${visualCenterPercent.x}%, ${visualCenterPercent.y}%`);
      console.log(`You can visual center your element if you move it ${horizontalDirection} ${Math.abs(parseFloat(movePercent.x))}% and move it ${verticalDirection} ${Math.abs(parseFloat(movePercent.y))}%`);
      console.log('================================\n');

      set({
        opticalAlignmentResult: result,
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
      const pathElements = getPathElementsInfo(state.elements, state.viewport.zoom);

      // Find all feasible pairs using the helper function
      const feasiblePairs = findFeasiblePairs(pathElements);

      console.log(`\n=== Applying Optical Alignment to ${feasiblePairs.length} Pairs ===\n`);

      // Apply alignment to each pair
      for (const pair of feasiblePairs) {
        const containerData = pair.container.data as PathData;
        const contentData = pair.content.data as PathData;
        const zoom = state.viewport.zoom;

        // Calculate bounds for both elements (including stroke width)
        const containerBounds = calculateBounds(
          containerData.subPaths,
          containerData.strokeWidth || 0,
          zoom
        );
        const contentBounds = calculateBounds(
          contentData.subPaths,
          contentData.strokeWidth || 0,
          zoom
        );

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
        
        // Get the container's fill color for accurate background representation
        // If container has no fill (none), use white background
        const containerFillColor = (containerData.fillColor && containerData.fillColor !== 'none') 
          ? containerData.fillColor 
          : 'white';

        // Convert content to RGB matrix and calculate visual center
        // Pass container dimensions and all visual properties for accurate representation
        // scaleStrokeWidth = false to prevent thick strokes in the analysis image
        const { rgbMatrix, bgColor } = await pathToRGBMatrix(
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
          containerFillColor, // Use container's fill color as background
          420
        );
        // Pass the known background color to the algorithm instead of auto-detecting
        const visualCenter = calculateVisualCenter(rgbMatrix, bgColor);

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
        const rawOffset = {
          x: containerMathCenter.x - visualCenterActual.x,
          y: containerMathCenter.y - visualCenterActual.y
        };

        // Apply protection padding to prevent content from getting too close to edges
        // Consider strokeWidth to ensure stroke doesn't go beyond padding limits
        const offset = applyProtectionPadding(rawOffset, contentBounds, containerBounds, strokeWidth);

        // Log the result for this pair
        console.log('OpticalAlignmentResult:', {
          container: pair.container.id,
          content: pair.content.id,
          visualCenter: visualCenterActual,
          mathematicalCenter: {
            x: (contentBounds.minX + contentBounds.maxX) / 2,
            y: (contentBounds.minY + contentBounds.maxY) / 2
          },
          offset
        });
        
        // Human-readable format
        const contentName = pair.content.id;
        const visualCenterPercent = {
          x: (visualCenter.x * 100).toFixed(1),
          y: (visualCenter.y * 100).toFixed(1)
        };
        const movePercent = {
          x: ((offset.x / contentWidth) * 100).toFixed(1),
          y: ((offset.y / contentHeight) * 100).toFixed(1)
        };
        const horizontalDirection = offset.x > 0 ? 'right' : 'left';
        const verticalDirection = offset.y > 0 ? 'down' : 'up';
        
        console.log(`${contentName}`);
        console.log(`The visual center is at ${visualCenterPercent.x}%, ${visualCenterPercent.y}%`);
        console.log(`You can visual center your element if you move it ${horizontalDirection} ${Math.abs(parseFloat(movePercent.x))}% and move it ${verticalDirection} ${Math.abs(parseFloat(movePercent.y))}%\n`);

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
    const pathData1 = selectedElements[0].data as PathData;
    const pathData2 = selectedElements[1].data as PathData;
    const zoom = state.viewport.zoom;
    
    const bounds1 = calculateBounds(pathData1.subPaths, pathData1.strokeWidth || 0, zoom);
    const bounds2 = calculateBounds(pathData2.subPaths, pathData2.strokeWidth || 0, zoom);

    const area1 = (bounds1.maxX - bounds1.minX) * (bounds1.maxY - bounds1.minY);
    const area2 = (bounds2.maxX - bounds2.minX) * (bounds2.maxY - bounds2.minY);

    const containerElement = area1 > area2 ? selectedElements[0] : selectedElements[1];
    const contentElement = area1 > area2 ? selectedElements[1] : selectedElements[0];

    const containerData = containerElement.data as PathData;
    const contentData = contentElement.data as PathData;

    // Calculate bounds for both elements (including stroke width)
    const containerBounds = calculateBounds(
      containerData.subPaths,
      containerData.strokeWidth || 0,
      zoom
    );
    const contentBounds = calculateBounds(
      contentData.subPaths,
      contentData.strokeWidth || 0,
      zoom
    );

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
    const pathElements = getPathElementsInfo(state.elements, state.viewport.zoom);

    // Find all feasible pairs using the helper function
    const feasiblePairs = findFeasiblePairs(pathElements);

    // Apply mathematical alignment to each pair
    for (const pair of feasiblePairs) {
      const containerData = pair.container.data as PathData;
      const contentData = pair.content.data as PathData;
      const zoom = state.viewport.zoom;

      // Calculate bounds for both elements (including stroke width)
      const containerBounds = calculateBounds(
        containerData.subPaths,
        containerData.strokeWidth || 0,
        zoom
      );
      const contentBounds = calculateBounds(
        contentData.subPaths,
        contentData.strokeWidth || 0,
        zoom
      );

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
    const pathElements = getPathElementsInfo(state.elements, state.viewport.zoom);

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
    const pathElements = getPathElementsInfo(state.elements, state.viewport.zoom);

    // Find all feasible pairs
    const feasiblePairs = findFeasiblePairs(pathElements);

    // Extract content IDs
    const contentIds = feasiblePairs.map(pair => pair.content.id);

    // Select all contents
    state.selectElements(contentIds);
  }
});
