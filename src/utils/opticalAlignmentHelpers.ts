/**
 * Optical Alignment Helper Functions
 * Centralizes container/content identification, context preparation, and alignment computation
 */

import type { CanvasElement, PathData, Command } from '../types';
import { calculateVisualCenter, pathToRGBMatrix } from './visualCenterUtils';
import { commandsToString } from './path';
import { calculateBounds, type Bounds } from './boundsUtils';
import { translateCommands } from './transformationUtils';

export type { Bounds } from './boundsUtils';
export { calculateBounds } from './boundsUtils';

// Internal interface - only used within this module
interface ContainerContentPair {
  container: CanvasElement;
  content: CanvasElement;
}

export interface AlignmentContext {
  containerElement: CanvasElement;
  contentElement: CanvasElement;
  containerBounds: Bounds;
  contentBounds: Bounds;
  containerData: PathData;
  contentData: PathData;
  containerFillColor: string;
}

export interface VisualAlignmentResult {
  visualCenter: { x: number; y: number };
  mathematicalCenter: { x: number; y: number };
  offset: { x: number; y: number };
}

/**
 * Identify which element is the container and which is the content
 * Container is the larger element (by area)
 */
export function identifyContainerAndContent(
  element1: CanvasElement,
  element2: CanvasElement,
  zoom: number = 1
): ContainerContentPair {
  const pathData1 = element1.data as PathData;
  const pathData2 = element2.data as PathData;
  
  const bounds1 = calculateBounds(pathData1.subPaths, pathData1.strokeWidth || 0, zoom);
  const bounds2 = calculateBounds(pathData2.subPaths, pathData2.strokeWidth || 0, zoom);

  const area1 = (bounds1.maxX - bounds1.minX) * (bounds1.maxY - bounds1.minY);
  const area2 = (bounds2.maxX - bounds2.minX) * (bounds2.maxY - bounds2.minY);

  return area1 > area2
    ? { container: element1, content: element2 }
    : { container: element2, content: element1 };
}

/**
 * Prepare all the context needed for alignment computation
 * Extracts and organizes bounds, data, and visual properties
 */
export function prepareAlignmentContext(
  containerElement: CanvasElement,
  contentElement: CanvasElement,
  zoom: number = 1
): AlignmentContext {
  const containerData = containerElement.data as PathData;
  const contentData = contentElement.data as PathData;

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

  // Get the container's fill color for accurate background representation
  // If container has no fill (none), use white background
  const containerFillColor = (containerData.fillColor && containerData.fillColor !== 'none') 
    ? containerData.fillColor 
    : 'white';

  return {
    containerElement,
    contentElement,
    containerBounds,
    contentBounds,
    containerData,
    contentData,
    containerFillColor
  };
}

/**
 * Compute visual alignment between container and content
 * Returns visual center, mathematical center, and offset needed for alignment
 */
export async function computeVisualAlignment(
  context: AlignmentContext
): Promise<VisualAlignmentResult> {
  const { 
    containerBounds, 
    contentBounds, 
    contentData, 
    containerFillColor 
  } = context;

  // Get paths as strings
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
    containerFillColor,
    420
  );

  // Calculate visual center (normalized 0-1)
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
  const offset = {
    x: containerMathCenter.x - visualCenterActual.x,
    y: containerMathCenter.y - visualCenterActual.y
  };

  return {
    visualCenter: visualCenterActual,
    mathematicalCenter: contentMathCenter,
    offset
  };
}

/**
 * Apply translation offset to path subpaths
 * Now delegates to shared translateCommands utility for consistency
 */
export function translateSubPaths(
  subPaths: Command[][], 
  offset: { x: number; y: number }
): Command[][] {
  // Use the shared translateCommands function for each subpath
  // This ensures future fixes to translation logic apply everywhere
  return subPaths.map(subPath =>
    translateCommands(subPath, offset.x, offset.y)
  );
}

/**
 * Calculate mathematical alignment offset between container and content
 */
export function calculateMathematicalOffset(
  containerBounds: Bounds,
  contentBounds: Bounds
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
 * Alignment strategy type - defines how to compute the offset
 */
export type AlignmentStrategy = (context: AlignmentContext) => { x: number; y: number } | Promise<{ x: number; y: number }>;

/**
 * Mathematical alignment strategy - uses geometric centers
 */
export const mathematicalAlignmentStrategy: AlignmentStrategy = (context: AlignmentContext) => {
  return calculateMathematicalOffset(context.containerBounds, context.contentBounds);
};

// Note: visualAlignmentStrategy was removed as unused - applyOpticalAlignmentToAllPairs uses computeVisualAlignment directly
