import type { PathData, Command } from '../types';
import { formatToPrecision, PATH_DECIMAL_PRECISION } from './index';
import { extractSubpaths } from './pathParserUtils';
import { measurePath } from './measurementUtils';
import { transformCommands, calculateScaledStrokeWidth } from './sharedTransformUtils';
import { logger } from './logger';

/**
 * Translates commands by deltaX and deltaY with configurable formatting options.
 */
export function translateCommandsUnified(
  commands: Command[], 
  deltaX: number, 
  deltaY: number,
  options: { roundToIntegers?: boolean; precision?: number } = {}
): Command[] {
  const { roundToIntegers = false, precision = PATH_DECIMAL_PRECISION } = options;
  const formatter = roundToIntegers ? Math.round : (n: number) => formatToPrecision(n, precision);
  
  return commands.map(cmd => {
    if (cmd.type === 'M' || cmd.type === 'L') {
      return {
        ...cmd,
        position: {
          x: formatter(cmd.position.x + deltaX),
          y: formatter(cmd.position.y + deltaY)
        }
      };
    } else if (cmd.type === 'C') {
      return {
        ...cmd,
        controlPoint1: {
          ...cmd.controlPoint1,
          x: formatter(cmd.controlPoint1.x + deltaX),
          y: formatter(cmd.controlPoint1.y + deltaY)
        },
        controlPoint2: {
          ...cmd.controlPoint2,
          x: formatter(cmd.controlPoint2.x + deltaX),
          y: formatter(cmd.controlPoint2.y + deltaY)
        },
        position: {
          x: formatter(cmd.position.x + deltaX),
          y: formatter(cmd.position.y + deltaY)
        }
      };
    }
    // Z commands don't need transformation
    return cmd;
  });
}

/**
 * Translates commands by deltaX and deltaY (backward compatibility).
 */
export function translateCommands(commands: Command[], deltaX: number, deltaY: number): Command[] {
  return translateCommandsUnified(commands, deltaX, deltaY);
}

/**
 * Translates commands and rounds all points to integers (backward compatibility).
 */
export function translateCommandsToIntegers(commands: Command[], deltaX: number, deltaY: number): Command[] {
  return translateCommandsUnified(commands, deltaX, deltaY, { roundToIntegers: true });
}

/**
 * Translates PathData by deltaX and deltaY using the consolidated logic.
 */
export function translatePathData(pathData: PathData, deltaX: number, deltaY: number): PathData {
  const translatedSubPaths = pathData.subPaths.map((subPath: Command[]) =>
    translateCommands(subPath, deltaX, deltaY)
  );

  return {
    ...pathData,
    subPaths: translatedSubPaths
  };
}

/**
 * Translates PathData by deltaX and deltaY and rounds all points to integers.
 */
export function translatePathDataToIntegers(pathData: PathData, deltaX: number, deltaY: number): PathData {
  const translatedSubPaths = pathData.subPaths.map((subPath: Command[]) =>
    translateCommandsToIntegers(subPath, deltaX, deltaY)
  );

  return {
    ...pathData,
    subPaths: translatedSubPaths
  };
}

/**
 * Translates PathData by deltaX and deltaY with configurable formatting options.
 */
export function translatePathDataUnified(
  pathData: PathData, 
  deltaX: number, 
  deltaY: number,
  options: { roundToIntegers?: boolean; precision?: number } = {}
): PathData {
  const translatedSubPaths = pathData.subPaths.map((subPath: Command[]) =>
    translateCommandsUnified(subPath, deltaX, deltaY, options)
  );

  return {
    ...pathData,
    subPaths: translatedSubPaths
  };
}

/**
 * Helper type for alignment operations
 */
export type TargetCalculator = (bounds: { minX: number; minY: number; maxX: number; maxY: number }[]) => number;
export type Axis = 'x' | 'y';

// Removed unused performAlignment function - functionality exists in arrangeSlice alignElements helper

/**
 * Pre-defined target calculators for common alignment operations
 */
export const alignmentTargets = {
  left: (bounds: { minX: number; minY: number; maxX: number; maxY: number }[]) =>
    Math.min(...bounds.map(b => b.minX)),
  center: (bounds: { minX: number; minY: number; maxX: number; maxY: number }[]) =>
    bounds.reduce((sum, b) => sum + (b.minX + b.maxX) / 2, 0) / bounds.length,
  right: (bounds: { minX: number; minY: number; maxX: number; maxY: number }[]) =>
    Math.max(...bounds.map(b => b.maxX)),
  top: (bounds: { minX: number; minY: number; maxX: number; maxY: number }[]) =>
    Math.min(...bounds.map(b => b.minY)),
  middle: (bounds: { minX: number; minY: number; maxX: number; maxY: number }[]) =>
    bounds.reduce((sum, b) => sum + (b.minY + b.maxY) / 2, 0) / bounds.length,
  bottom: (bounds: { minX: number; minY: number; maxX: number; maxY: number }[]) =>
    Math.max(...bounds.map(b => b.maxY))
} as const;

export function transformPathData(
  pathData: PathData,
  scaleX: number,
  scaleY: number,
  originX: number,
  originY: number,
  rotation: number = 0
): PathData {
  // Transform all subpaths directly using shared utility
  try {
    const commands = pathData.subPaths.flat();

    // Transform each command using the shared utility
    const transformedCommands = transformCommands(commands, {
      scaleX,
      scaleY,
      originX,
      originY,
      rotation
    });

    // Rebuild subpaths directly from transformed commands without serialization
    const newSubPaths = extractSubpaths(transformedCommands).map(sp => sp.commands);

    return {
      ...pathData,
      subPaths: newSubPaths,
      // Scale stroke width proportionally using shared utility
      strokeWidth: calculateScaledStrokeWidth(pathData.strokeWidth, scaleX, scaleY),
      // Remove transform since we've applied it directly
      transform: undefined
    };

  } catch (error) {
    logger.warn('Path transformation failed', error);
    return pathData; // Return original if transformation fails
  }
}

/**
 * Applies scale transformation to ONLY selected subpaths - using shared transformation logic
 */
export function transformSubpathsData(
  pathData: PathData,
  scaleX: number,
  scaleY: number,
  originX: number,
  originY: number,
  rotation: number = 0,
  selectedSubpaths: Array<{ elementId: string; subpathIndex: number }> = []
): PathData {
  // If no selected subpaths, transform all subpaths
  const shouldTransformAll = selectedSubpaths.length === 0;

  if (shouldTransformAll) {
    // Get all subpaths to transform
    const commands = pathData.subPaths.flat();
    const allSubpaths = extractSubpaths(commands);
    selectedSubpaths = allSubpaths.map((_, index) => ({ elementId: '', subpathIndex: index }));
  }

  try {
    // Parse the path into commands
    const commands = pathData.subPaths.flat();

    // Extract subpaths with their command ranges
    const subpaths = extractSubpaths(commands);

    // Create a copy of the original commands to modify
    const modifiedCommands = [...commands];

    // Transform only the selected subpaths
    selectedSubpaths.forEach(({ subpathIndex }) => {
      if (subpathIndex < subpaths.length) {
        const subpath = subpaths[subpathIndex];

        // Calculate the center of THIS specific subpath for rotation
        let subpathCenterX = originX;
        let subpathCenterY = originY;

        if (rotation !== 0) {
          // Get bounds of this specific subpath for rotation center
          const subpathBounds = measurePath([subpath.commands], 1, 1);
          subpathCenterX = (subpathBounds.minX + subpathBounds.maxX) / 2;
          subpathCenterY = (subpathBounds.minY + subpathBounds.maxY) / 2;
        }

        // Extract the commands for this subpath
        const subpathCommands = commands.slice(subpath.startIndex, subpath.endIndex + 1);

        // Transform each command in this subpath using shared logic
        const transformedSubpathCommands = transformCommands(subpathCommands, {
          scaleX,
          scaleY,
          originX,
          originY,
          rotation,
          rotationCenterX: subpathCenterX,
          rotationCenterY: subpathCenterY
        });

        // Replace the original subpath commands with transformed ones
        modifiedCommands.splice(subpath.startIndex, subpath.endIndex - subpath.startIndex + 1, ...transformedSubpathCommands);
      }
    });

    // Rebuild subpaths directly from modified commands without serialization
    const newSubPaths = extractSubpaths(modifiedCommands).map(sp => sp.commands);

    return {
      ...pathData,
      subPaths: newSubPaths,
      // Scale stroke width proportionally using shared utility
      strokeWidth: calculateScaledStrokeWidth(pathData.strokeWidth, scaleX, scaleY),
      // Remove transform since we've applied it directly
      transform: undefined
    };

  } catch (error) {
    logger.warn('Subpath transformation failed, falling back to full path transformation', error);
    return transformPathData(pathData, scaleX, scaleY, originX, originY, rotation);
  }
}

/**
 * Applies transformation to a single subpath with correct origin calculation - using shared logic
 */
export function transformSingleSubpath(
  pathData: PathData,
  subpathIndex: number,
  scaleX: number,
  scaleY: number,
  originX: number,
  originY: number,
  rotation: number = 0
): PathData {
  try {
    // Use the subPaths directly
    const commands = pathData.subPaths.flat();

    // Extract subpaths with their command ranges
    const subpaths = extractSubpaths(commands);

    if (subpathIndex >= subpaths.length) {
      logger.warn('Subpath index out of bounds, falling back to full path transformation');
      return transformPathData(pathData, scaleX, scaleY, originX, originY, rotation);
    }

    // Create a copy of the original commands to modify
    const modifiedCommands = [...commands];

    const subpath = subpaths[subpathIndex];

    // Calculate the center of THIS specific subpath for rotation (if needed)
    let subpathCenterX = originX;
    let subpathCenterY = originY;

    if (rotation !== 0) {
      // Get bounds of this specific subpath for rotation center
      const subpathBounds = measurePath([subpath.commands], 1, 1);
      subpathCenterX = (subpathBounds.minX + subpathBounds.maxX) / 2;
      subpathCenterY = (subpathBounds.minY + subpathBounds.maxY) / 2;
    }

    // Extract the commands for this subpath
    const subpathCommands = commands.slice(subpath.startIndex, subpath.endIndex + 1);

    // Transform each command in this subpath using shared logic
    const transformedSubpathCommands = transformCommands(subpathCommands, {
      scaleX,
      scaleY,
      originX,
      originY,
      rotation,
      rotationCenterX: subpathCenterX,
      rotationCenterY: subpathCenterY
    });

    // Replace the original subpath commands with transformed ones
    modifiedCommands.splice(subpath.startIndex, subpath.endIndex - subpath.startIndex + 1, ...transformedSubpathCommands);

    // Rebuild subPaths from modified commands
    const newSubPaths = extractSubpaths(modifiedCommands).map(sp => sp.commands);

    return {
      ...pathData,
      subPaths: newSubPaths,
      // Scale stroke width proportionally using shared utility
      strokeWidth: calculateScaledStrokeWidth(pathData.strokeWidth, scaleX, scaleY),
      // Remove transform since we've applied it directly
      transform: undefined
    };

  } catch (error) {
    logger.warn('Single subpath transformation failed, falling back to full path transformation', error);
    return transformPathData(pathData, scaleX, scaleY, originX, originY, rotation);
  }
}