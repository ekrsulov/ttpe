import { useMemo } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { extractEditablePoints } from '../utils/pathParserUtils';
import type { SelectionContextInfo } from '../types/selection';
import type { PathData } from '../types';

/**
 * Hook that determines the current selection context based on store state.
 * Centralizes the logic for determining what type of selection is active.
 * 
 * Priority: commands > subpaths > elements
 */
export function useSelectionContext(): SelectionContextInfo | null {
  const selectedIds = useCanvasStore(state => state.selectedIds);
  const selectedCommands = useCanvasStore(state => state.selectedCommands);
  const selectedSubpaths = useCanvasStore(state => state.selectedSubpaths);
  const elements = useCanvasStore(state => state.elements);

  return useMemo(() => {
    // Priority: commands > subpaths > elements
    if (selectedCommands && selectedCommands.length > 0) {
      // Determine the exact point type
      const cmd = selectedCommands[0];
      const element = elements.find(el => el.id === cmd.elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as PathData;
        const commands = pathData.subPaths.flat();
        const points = extractEditablePoints(commands);
        const point = points.find(p => p.commandIndex === cmd.commandIndex && p.pointIndex === cmd.pointIndex);

        if (point) {
          if (point.isControl) {
            return { type: 'point-control', pointInfo: cmd };
          } else {
            const command = commands[cmd.commandIndex];
            if (command.type === 'M') {
              return { type: 'point-anchor-m', pointInfo: cmd };
            } else if (command.type === 'L') {
              return { type: 'point-anchor-l', pointInfo: cmd };
            } else if (command.type === 'C') {
              return { type: 'point-anchor-c', pointInfo: cmd };
            }
          }
        }
      }
      // Fallback
      return { type: 'point-anchor-m', pointInfo: cmd };
    }

    if (selectedSubpaths && selectedSubpaths.length > 0) {
      return {
        type: 'subpath',
        subpathInfo: selectedSubpaths[0],
      };
    }

    if (selectedIds.length === 1) {
      const element = elements.find(el => el.id === selectedIds[0]);
      if (element?.type === 'group') {
        return { type: 'group', groupId: selectedIds[0] };
      }
      return { type: 'path', elementId: selectedIds[0] };
    }

    if (selectedIds.length > 1) {
      return { type: 'multiselection', elementIds: selectedIds };
    }

    return null;
  }, [selectedCommands, selectedSubpaths, selectedIds, elements]);
}
