import type { PathData, SubPath } from '../types';

/**
 * Perform union operation on multiple paths
 */
export function performPathUnion(paths: PathData[]): PathData | null {
  if (paths.length === 0) return null;
  if (paths.length === 1) return paths[0];

  try {
    // Simple union: combine all subpaths from all paths
    const allSubPaths: SubPath[] = [];
    for (const pathData of paths) {
      allSubPaths.push(...pathData.subPaths);
    }

    // Use properties from first path
    return {
      ...paths[0],
      subPaths: allSubPaths
    };
  } catch (error) {
    console.error('Error performing path union:', error);
    return null;
  }
}