import type { PathData, Command } from '../types';
import { formatToPrecision, PATH_DECIMAL_PRECISION } from './index';
import { extractSubpaths } from './pathParserUtils';
import { transformCommands, calculateScaledStrokeWidth } from './sharedTransformUtils';
import { logger } from './logger';

/**
 * Translates commands by deltaX and deltaY with configurable formatting options.
 * This is the main translation function - use this for all translation operations.
 * 
 * @param commands - Array of path commands to translate
 * @param deltaX - X-axis translation amount
 * @param deltaY - Y-axis translation amount
 * @param options - Optional formatting configuration
 * @param options.roundToIntegers - If true, rounds all coordinates to integers
 * @param options.precision - Number of decimal places (default: PATH_DECIMAL_PRECISION)
 * @returns Translated commands array
 */
export function translateCommands(
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
 * Translates PathData by deltaX and deltaY with configurable formatting options.
 * This is the main path translation function - use this for all path translation operations.
 * 
 * @param pathData - PathData object to translate
 * @param deltaX - X-axis translation amount
 * @param deltaY - Y-axis translation amount
 * @param options - Optional formatting configuration
 * @param options.roundToIntegers - If true, rounds all coordinates to integers
 * @param options.precision - Number of decimal places (default: PATH_DECIMAL_PRECISION)
 * @returns Translated PathData
 */
export function translatePathData(
  pathData: PathData, 
  deltaX: number, 
  deltaY: number,
  options: { roundToIntegers?: boolean; precision?: number } = {}
): PathData {
  const translatedSubPaths = pathData.subPaths.map((subPath: Command[]) =>
    translateCommands(subPath, deltaX, deltaY, options)
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