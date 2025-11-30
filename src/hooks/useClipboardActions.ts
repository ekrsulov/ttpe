import { useCallback } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import {
  Trash2,
  Copy,
  Clipboard,
} from 'lucide-react';
import { commandsToString } from '../utils/path';
import { logger } from '../utils';
import { duplicateElements } from '../utils/duplicationUtils';
import type { FloatingContextMenuAction } from '../types/plugins';
import type { SelectionContextInfo } from '../types/selection';
import type { PathData } from '../types';

/**
 * Hook that provides clipboard and deletion actions for the floating context menu.
 */
export function useClipboardActions(context: SelectionContextInfo | null): FloatingContextMenuAction[] {
  const elements = useCanvasStore(state => state.elements);
  const addElement = useCanvasStore(state => state.addElement);
  const updateElement = useCanvasStore(state => state.updateElement);
  const deleteSelectedElements = useCanvasStore(state => state.deleteSelectedElements);
  const deleteSelectedSubpaths = useCanvasStore(state => state.deleteSelectedSubpaths);

  // Duplicate action
  const handleDuplicate = useCallback(() => {
    if (!context) return;

    const elementMap = new Map(elements.map(el => [el.id, el]));

    if (context.type === 'path' && context.elementId) {
      duplicateElements([context.elementId], elementMap, addElement, updateElement);
    } else if (context.type === 'group' && context.groupId) {
      duplicateElements([context.groupId], elementMap, addElement, updateElement);
    } else if (context.type === 'multiselection' && context.elementIds) {
      duplicateElements(context.elementIds, elementMap, addElement, updateElement);
    } else if (context.type === 'subpath' && context.subpathInfo) {
      const { elementId, subpathIndex } = context.subpathInfo;
      const element = elementMap.get(elementId);

      if (element && element.type === 'path') {
        const pathData = element.data as PathData;
        const subpath = pathData.subPaths[subpathIndex];

        if (subpath) {
          addElement({
            type: 'path',
            data: {
              ...pathData,
              subPaths: [subpath],
            },
          });
        }
      }
    }
  }, [context, elements, addElement, updateElement]);

  // Copy to clipboard action
  const handleCopyToClipboard = useCallback(async () => {
    if (!context) return;

    let commands = null;

    if (context.type === 'path' && context.elementId) {
      const element = elements.find(el => el.id === context.elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as PathData;
        commands = pathData.subPaths.flat();
      }
    } else if (context.type === 'subpath' && context.subpathInfo) {
      const { elementId, subpathIndex } = context.subpathInfo;
      const element = elements.find(el => el.id === elementId);

      if (element && element.type === 'path') {
        const pathData = element.data as PathData;
        commands = pathData.subPaths[subpathIndex];
      }
    }

    if (commands) {
      const pathData = commandsToString(commands);
      try {
        await navigator.clipboard.writeText(pathData);
        logger.info('Path copied to clipboard', pathData);
      } catch (err) {
        logger.error('Failed to copy path to clipboard', err);
      }
    }
  }, [context, elements]);

  if (!context) return [];

  const actions: FloatingContextMenuAction[] = [];

  // Add clipboard actions for appropriate contexts
  if (context.type === 'path' || context.type === 'group' || 
      context.type === 'multiselection' || context.type === 'subpath') {
    actions.push(
      {
        id: 'duplicate',
        label: 'Duplicate',
        icon: Copy,
        onClick: handleDuplicate,
      }
    );

    // Only path and subpath can be copied to clipboard
    if (context.type === 'path' || context.type === 'subpath') {
      actions.push({
        id: 'copy',
        label: 'Copy to Clipboard',
        icon: Clipboard,
        onClick: handleCopyToClipboard,
      });
    }
  }

  // Add delete action for all contexts except points (handled by plugin)
  if (context.type !== 'point-anchor-m' && context.type !== 'point-anchor-l' &&
      context.type !== 'point-anchor-c' && context.type !== 'point-control') {
    
    const deleteAction: FloatingContextMenuAction = {
      id: 'delete',
      label: 'Delete',
      icon: Trash2,
      variant: 'danger',
    };

    if (context.type === 'subpath') {
      deleteAction.onClick = () => deleteSelectedSubpaths?.();
    } else {
      deleteAction.onClick = () => deleteSelectedElements();
    }

    actions.push(deleteAction);
  }

  return actions;
}
