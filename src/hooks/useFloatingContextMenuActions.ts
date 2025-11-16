import { useMemo, useCallback } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import {
  Trash2,
  Copy,
  Clipboard,
  Group as GroupIcon,
  Ungroup as UngroupIcon,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Move,
  Grid3x3,
  SplitSquareVertical,
  AlignLeft,
  AlignRight,
  AlignCenter,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  UnfoldHorizontal,
  UnfoldVertical,
  FoldHorizontal,
  FoldVertical,
  ArrowLeftRight,
  ArrowUpDown,
  Triangle,
  ChevronUp,
  ChevronDown,
  Layers,
  Combine,
  Scissors,
  Minimize,
  Undo,
  Target
} from 'lucide-react';
import { commandsToString } from '../utils/path';
import { logger } from '../utils';
import { pluginManager } from '../utils/pluginManager';
import { useArrangeHandlers } from './useArrangeHandlers';
import type { FloatingContextMenuAction } from '../ui/FloatingContextMenu';
import type { SelectedCommand } from '../types/selection';
import { duplicateElements } from '../utils/duplicationUtils';
import { extractEditablePoints, getControlPointAlignmentInfo } from '../utils/pathParserUtils';
import type { ControlPoint, Command, Point } from '../types';

export type SelectionContextType = 
  | 'multiselection' 
  | 'group' 
  | 'path' 
  | 'subpath' 
  | 'point-anchor-m'
  | 'point-anchor-l'
  | 'point-anchor-c'
  | 'point-control';

export interface SelectionContextInfo {
  type: SelectionContextType;
  elementId?: string;
  elementIds?: string[];
  groupId?: string;
  subpathInfo?: { elementId: string; subpathIndex: number };
  pointInfo?: SelectedCommand;
}

/**
 * Hook to determine the selection context and provide appropriate actions
 * for the floating context menu.
 */
export function useFloatingContextMenuActions(
  context: SelectionContextInfo | null
): FloatingContextMenuAction[] {
  // Get store actions
  const deleteSelectedElements = useCanvasStore(state => state.deleteSelectedElements);
  const deleteSelectedSubpaths = useCanvasStore(state => state.deleteSelectedSubpaths);
  const deleteSelectedCommands = useCanvasStore(state => state.deleteSelectedCommands);
  const createGroupFromSelection = useCanvasStore(state => state.createGroupFromSelection);
  const ungroupSelectedGroups = useCanvasStore(state => state.ungroupSelectedGroups);
  const ungroupGroupById = useCanvasStore(state => state.ungroupGroupById);
  const toggleGroupVisibility = useCanvasStore(state => state.toggleGroupVisibility);
  const toggleGroupLock = useCanvasStore(state => state.toggleGroupLock);
  const toggleElementVisibility = useCanvasStore(state => state.toggleElementVisibility);
  const toggleElementLock = useCanvasStore(state => state.toggleElementLock);
  const convertCommandType = useCanvasStore(state => state.convertCommandType);
  const cutSubpathAtPoint = useCanvasStore(state => state.cutSubpathAtPoint);
  const moveToM = useCanvasStore(state => state.moveToM);
  const setControlPointAlignmentType = useCanvasStore(state => state.setControlPointAlignmentType);
  const addZCommandToSubpath = useCanvasStore(state => state.addZCommandToSubpath);
  const deleteZCommandForMPoint = useCanvasStore(state => state.deleteZCommandForMPoint);
  const convertZToLineForMPoint = useCanvasStore(state => state.convertZToLineForMPoint);
  
  // Get path operations
  const performPathUnion = useCanvasStore(state => state.performPathUnion);
  const performPathUnionPaperJS = useCanvasStore(state => state.performPathUnionPaperJS);
  const performPathSubtraction = useCanvasStore(state => state.performPathSubtraction);
  const performPathIntersect = useCanvasStore(state => state.performPathIntersect);
  const performPathExclude = useCanvasStore(state => state.performPathExclude);
  const performPathDivide = useCanvasStore(state => state.performPathDivide);
  
  // Get optical alignment operations
  const canPerformOpticalAlignment = useCanvasStore(state => state.canPerformOpticalAlignment);
  const applyOpticalAlignment = useCanvasStore(state => state.applyOpticalAlignment);
  const calculateOpticalAlignment = useCanvasStore(state => state.calculateOpticalAlignment);
  
  // Get arrange handlers (context-aware)
  const arrangeHandlers = useArrangeHandlers();
  
  // Get element states for conditional logic
  const elements = useCanvasStore(state => state.elements);
  const selectedIds = useCanvasStore(state => state.selectedIds);
  const hiddenElementIds = useCanvasStore(state => state.hiddenElementIds);
  const lockedElementIds = useCanvasStore(state => state.lockedElementIds);
  const selectedSubpaths = useCanvasStore(state => state.selectedSubpaths);
  const selectedCommands = useCanvasStore(state => state.selectedCommands);

  // Helper to check if element is hidden/locked
  const isElementHidden = useCallback((id: string) => {
    return (hiddenElementIds ?? []).includes(id);
  }, [hiddenElementIds]);

  const isElementLocked = useCallback((id: string) => {
    return (lockedElementIds ?? []).includes(id);
  }, [lockedElementIds]);

  // Helper to check if group is hidden/locked
  const isGroupHidden = useCallback((groupId: string) => {
    const group = elements.find(el => el.id === groupId && el.type === 'group');
    return group?.type === 'group' ? group.data.isHidden : false;
  }, [elements]);

  const isGroupLocked = useCallback((groupId: string) => {
    const group = elements.find(el => el.id === groupId && el.type === 'group');
    return group?.type === 'group' ? group.data.isLocked : false;
  }, [elements]);

  // Helper to check if selection contains any groups
  const hasGroupsInSelection = useCallback((ids: string[]) => {
    return ids.some(id => {
      const element = elements.find(el => el.id === id);
      return element?.type === 'group';
    });
  }, [elements]);

  const addElement = useCanvasStore(state => state.addElement);
  const updateElement = useCanvasStore(state => state.updateElement);

  // Duplicate action - uses shared duplication utility for consistent behavior
  const handleDuplicate = useCallback(() => {
    if (!context) return;
    
    const elementMap = new Map(elements.map(el => [el.id, el]));
    
    if (context.type === 'path' && context.elementId) {
      // Use smart offset calculation for single path
      duplicateElements([context.elementId], elementMap, addElement, updateElement);
    } else if (context.type === 'group' && context.groupId) {
      // Use smart offset calculation for single group
      duplicateElements([context.groupId], elementMap, addElement, updateElement);
    } else if (context.type === 'multiselection' && context.elementIds) {
      // Use smart offset calculation for multiselection
      duplicateElements(context.elementIds, elementMap, addElement, updateElement);
    } else if (context.type === 'subpath' && context.subpathInfo) {
      const { elementId, subpathIndex } = context.subpathInfo;
      const element = elementMap.get(elementId);
      
      if (element && element.type === 'path') {
        const pathData = element.data as import('../types').PathData;
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
        const pathData = element.data as import('../types').PathData;
        commands = pathData.subPaths.flat();
      }
    } else if (context.type === 'subpath' && context.subpathInfo) {
      const { elementId, subpathIndex } = context.subpathInfo;
      const element = elements.find(el => el.id === elementId);
      
      if (element && element.type === 'path') {
        const pathData = element.data as import('../types').PathData;
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

  /**
   * Helper to find the topmost parent group for an element.
   * If element belongs to nested groups, returns the root group.
   * If element has no parent, returns the element itself.
   */
  const findTopMostGroupForElement = useCallback((elementId: string): string => {
    const elementMap = new Map(elements.map(el => [el.id, el]));
    const element = elementMap.get(elementId);
    
    if (!element) return elementId;
    
    // If element has no parent, it's already at top level
    if (!element.parentId) {
      return elementId;
    }
    
    // Walk up the hierarchy to find the topmost group
    let topMostId = elementId;
    let currentParentId: string | null | undefined = element.parentId;
    
    while (currentParentId) {
      const parent = elementMap.get(currentParentId);
      if (!parent) break;
      
      topMostId = parent.id;
      currentParentId = parent.parentId;
    }
    
    return topMostId;
  }, [elements]);

  // Hide selected elements action
  // For elements that belong to groups, applies hide to the topmost parent group
  const handleHideSelected = useCallback(() => {
    if (!context || context.type !== 'multiselection' || !context.elementIds) return;
    
    // Track which IDs we've already processed to avoid duplicates
    const processedIds = new Set<string>();
    
    context.elementIds.forEach(id => {
      // Find the topmost group for this element
      const topMostId = findTopMostGroupForElement(id);
      
      // Skip if we've already processed this top-level element/group
      if (processedIds.has(topMostId)) return;
      processedIds.add(topMostId);
      
      const element = elements.find(el => el.id === topMostId);
      if (element) {
        if (element.type === 'group') {
          toggleGroupVisibility(topMostId);
        } else if (element.type === 'path') {
          toggleElementVisibility(topMostId);
        }
      }
    });
  }, [context, elements, toggleElementVisibility, toggleGroupVisibility, findTopMostGroupForElement]);

  // Lock selected elements action
  // For elements that belong to groups, applies lock to the topmost parent group
  const handleLockSelected = useCallback(() => {
    if (!context || context.type !== 'multiselection' || !context.elementIds) return;
    
    // Track which IDs we've already processed to avoid duplicates
    const processedIds = new Set<string>();
    
    context.elementIds.forEach(id => {
      // Find the topmost group for this element
      const topMostId = findTopMostGroupForElement(id);
      
      // Skip if we've already processed this top-level element/group
      if (processedIds.has(topMostId)) return;
      processedIds.add(topMostId);
      
      const element = elements.find(el => el.id === topMostId);
      if (element) {
        if (element.type === 'group') {
          toggleGroupLock(topMostId);
        } else if (element.type === 'path') {
          toggleElementLock(topMostId);
        }
      }
    });
  }, [context, elements, toggleElementLock, toggleGroupLock, findTopMostGroupForElement]);

  // Helper to generate arrange actions based on selection count
  const getArrangeActions = useCallback((): FloatingContextMenuAction[] => {
    // Determine count based on context type
    let count = 0;
    if (context?.type === 'subpath') {
      count = selectedSubpaths?.length ?? 0;
    } else if (context?.type === 'point-anchor-m' || context?.type === 'point-anchor-l' || 
               context?.type === 'point-anchor-c' || context?.type === 'point-control') {
      count = selectedCommands?.length ?? 0;
    } else {
      count = selectedIds.length;
    }
    
    const canAlign = count >= 2;
    const canDistribute = count >= 3;
    
    const actions: FloatingContextMenuAction[] = [];
    
    if (canAlign) {
      // Alignment submenu
      const alignActions: FloatingContextMenuAction[] = [
        { id: 'align-left', label: 'Align Left', icon: AlignLeft, onClick: arrangeHandlers.alignLeft },
        { id: 'align-center', label: 'Align Center', icon: AlignCenter, onClick: arrangeHandlers.alignCenter },
        { id: 'align-right', label: 'Align Right', icon: AlignRight, onClick: arrangeHandlers.alignRight },
        { id: 'align-top', label: 'Align Top', icon: AlignVerticalJustifyStart, onClick: arrangeHandlers.alignTop },
        { id: 'align-middle', label: 'Align Middle', icon: AlignVerticalJustifyCenter, onClick: arrangeHandlers.alignMiddle },
        { id: 'align-bottom', label: 'Align Bottom', icon: AlignVerticalJustifyEnd, onClick: arrangeHandlers.alignBottom }
      ];
      
      actions.push({
        id: 'align-menu',
        label: 'Align',
        icon: AlignCenter,
        submenu: alignActions
      });
      
      // Match size submenu (only for elements and subpaths, not for commands/points)
      if (context?.type !== 'point-anchor-m' && context?.type !== 'point-anchor-l' && 
          context?.type !== 'point-anchor-c' && context?.type !== 'point-control') {
        const matchActions: FloatingContextMenuAction[] = [
          { id: 'match-width-largest', label: 'Width (Largest)', icon: UnfoldHorizontal, onClick: arrangeHandlers.matchWidthToLargest },
          { id: 'match-height-largest', label: 'Height (Largest)', icon: UnfoldVertical, onClick: arrangeHandlers.matchHeightToLargest },
          { id: 'match-width-smallest', label: 'Width (Smallest)', icon: FoldHorizontal, onClick: arrangeHandlers.matchWidthToSmallest },
          { id: 'match-height-smallest', label: 'Height (Smallest)', icon: FoldVertical, onClick: arrangeHandlers.matchHeightToSmallest }
        ];
        
        actions.push({
          id: 'match-menu',
          label: 'Match',
          icon: UnfoldHorizontal,
          submenu: matchActions
        });
      }
    }
    
    if (canDistribute) {
      // Distribution submenu
      const distributeActions: FloatingContextMenuAction[] = [
        { id: 'distribute-h', label: 'Horizontally', icon: ArrowLeftRight, onClick: arrangeHandlers.distributeHorizontally },
        { id: 'distribute-v', label: 'Vertically', icon: ArrowUpDown, onClick: arrangeHandlers.distributeVertically }
      ];
      
      actions.push({
        id: 'distribute-menu',
        label: 'Distribute',
        icon: ArrowLeftRight,
        submenu: distributeActions
      });
    }
    
    // Order submenu (only for elements and subpaths, not for commands)
    if (count > 0 && context?.type !== 'point-anchor-m' && context?.type !== 'point-anchor-l' && 
        context?.type !== 'point-anchor-c' && context?.type !== 'point-control') {
      const orderActions: FloatingContextMenuAction[] = [
        { id: 'bring-front', label: 'Bring to Front', icon: Triangle, onClick: arrangeHandlers.bringToFront },
        { id: 'send-forward', label: 'Send Forward', icon: ChevronUp, onClick: arrangeHandlers.sendForward },
        { id: 'send-backward', label: 'Send Backward', icon: ChevronDown, onClick: arrangeHandlers.sendBackward },
        { id: 'send-back', label: 'Send to Back', icon: Triangle, onClick: arrangeHandlers.sendToBack }
      ];
      
      actions.push({
        id: 'order-menu',
        label: 'Order',
        icon: Triangle,
        submenu: orderActions
      });
    }
    
    return actions;
  }, [selectedIds, selectedSubpaths, selectedCommands, arrangeHandlers, context]);

  // Helper to generate path operation actions (grouped in submenu)
  const getPathOperationActions = useCallback((): FloatingContextMenuAction[] => {
    const pathCount = selectedIds.filter(id => {
      const el = elements.find(e => e.id === id);
      return el && el.type === 'path';
    }).length;
    
    if (pathCount < 2) return [];
    
    const pathOps: FloatingContextMenuAction[] = [];
    
    // Boolean operations for 2+ paths
    pathOps.push(
      { id: 'union', label: 'Union', icon: Combine, onClick: performPathUnion },
      { id: 'union-paperjs', label: 'Union (PaperJS)', icon: Layers, onClick: performPathUnionPaperJS }
    );
    
    // Binary operations for exactly 2 paths
    if (pathCount === 2) {
      pathOps.push(
        { id: 'subtract', label: 'Subtract', icon: Minimize, onClick: performPathSubtraction },
        { id: 'intersect', label: 'Intersect', icon: Grid3x3, onClick: performPathIntersect },
        { id: 'exclude', label: 'Exclude', icon: SplitSquareVertical, onClick: performPathExclude },
        { id: 'divide', label: 'Divide', icon: Scissors, onClick: performPathDivide }
      );
    }
    
    return [{
      id: 'path-operations-menu',
      label: 'Path Operations',
      icon: Combine,
      submenu: pathOps
    }];
  }, [selectedIds, elements, performPathUnion, performPathUnionPaperJS, performPathSubtraction, performPathIntersect, performPathExclude, performPathDivide]);

  // Helper to generate subpath operation actions
  const getSubpathOperationActions = useCallback((): FloatingContextMenuAction[] => {
    if ((selectedSubpaths?.length ?? 0) !== 1) return [];
    
    return [
      { id: 'reverse-subpath', label: 'Reverse Direction', icon: Undo, onClick: () => {
        // Call subpath plugin API for reverse
        pluginManager.callPluginApi('subpath', 'performSubPathReverse');
      }}
    ];
  }, [selectedSubpaths]);

  // Helper to check if selected path has multiple subpaths
  const hasPathWithMultipleSubpaths = useCallback((): boolean => {
    if (selectedIds.length !== 1) return false;
    
    const element = elements.find(el => el.id === selectedIds[0]);
    if (!element || element.type !== 'path') return false;
    
    const pathData = element.data as import('../types').PathData;
    return pathData.subPaths.length > 1;
  }, [selectedIds, elements]);

  // Helper to get Subpath Split action
  const getSubpathSplitAction = useCallback((): FloatingContextMenuAction | null => {
    if (!hasPathWithMultipleSubpaths()) return null;
    
    return {
      id: 'subpath-split',
      label: 'Subpath Split',
      icon: SplitSquareVertical,
      onClick: () => {
        pluginManager.callPluginApi('subpath', 'performPathSimplify');
      }
    };
  }, [hasPathWithMultipleSubpaths]);

  const getSubpathJoinAction = useCallback((): FloatingContextMenuAction | null => {
    if (!hasPathWithMultipleSubpaths()) return null;
    
    return {
      id: 'subpath-join',
      label: 'Subpath Join',
      icon: Combine,
      onClick: () => {
        pluginManager.callPluginApi('subpath', 'performSubPathJoin');
      }
    };
  }, [hasPathWithMultipleSubpaths]);

  // Helper to get Apply Visual Center action
  const getApplyVisualCenterAction = useCallback((): FloatingContextMenuAction | null => {
    const canAlign = canPerformOpticalAlignment?.() ?? false;
    if (!canAlign) return null;
    
    return {
      id: 'apply-visual-center',
      label: 'Apply Visual Center',
      icon: Target,
      onClick: async () => {
        await calculateOpticalAlignment?.();
        applyOpticalAlignment?.();
      }
    };
  }, [canPerformOpticalAlignment, calculateOpticalAlignment, applyOpticalAlignment]);

  // Helper function to retrieve path commands with validation
  const withPathCommands = useCallback(<T,>(
    elementId: string,
    commandIndex: number,
    callback: (commands: Command[], command: Command) => T,
    fallbackValue: T
  ): T => {
    const element = elements.find(el => el.id === elementId);
    if (!element || element.type !== 'path') return fallbackValue;

    const pathData = element.data as import('../types').PathData;
    const commands = pathData.subPaths.flat();

    const command = commands[commandIndex];
    if (!command) return fallbackValue;

    return callback(commands, command);
  }, [elements]);

  // Helper to check if a point is the last in its subpath
  const isLastPointInSubpath = useCallback((elementId: string, commandIndex: number, pointIndex: number): boolean => {
    return withPathCommands(elementId, commandIndex, (commands, command) => {
      // Check if this is the last point of the command
      const pointsLength = command.type === 'M' || command.type === 'L' ? 1 : command.type === 'C' ? 3 : 0;
      const isLastPoint = pointIndex === pointsLength - 1;
      if (!isLastPoint) return false;

      // Check if this is the last command in the path or before a Z/M
      const isLastCommandInSubpath = commandIndex === commands.length - 1 ||
        commands[commandIndex + 1].type === 'M' ||
        commands[commandIndex + 1].type === 'Z';

      return isLastCommandInSubpath;
    }, false);
  }, [withPathCommands]);

  // Check if selected M point has a closing Z command
  const hasClosingZCommand = useCallback((elementId: string, commandIndex: number): boolean => {
    return withPathCommands(elementId, commandIndex, (commands, command) => {
      // Check if the command at commandIndex is an M command
      if (command.type !== 'M') return false;

      // Look for Z commands after this M command
      for (let i = commandIndex + 1; i < commands.length; i++) {
        if (commands[i].type === 'Z') {
          // Check if this Z closes to our M point
          // A Z closes to the last M before it
          let lastMIndex = -1;
          for (let j = i - 1; j >= 0; j--) {
            if (commands[j].type === 'M') {
              lastMIndex = j;
              break;
            }
          }

          if (lastMIndex === commandIndex) {
            return true;
          }
        } else if (commands[i].type === 'M') {
          // If we hit another M, stop looking
          break;
        }
      }

      return false;
    }, false);
  }, [withPathCommands]);

  // Check if selected point is already at the same position as the M of its subpath
  const isAtMPosition = useCallback((elementId: string, commandIndex: number, pointIndex: number): boolean => {
    return withPathCommands(elementId, commandIndex, (commands, command) => {
      // Find the M command for this subpath (the last M before this command)
      let subpathMIndex = -1;
      for (let i = commandIndex - 1; i >= 0; i--) {
        if (commands[i].type === 'M') {
          subpathMIndex = i;
          break;
        }
      }

      if (subpathMIndex === -1) return false;

      // Get the point to check
      let pointToCheck: Point | null = null;
      if (command.type === 'M' || command.type === 'L') {
        if (pointIndex === 0) pointToCheck = command.position;
      } else if (command.type === 'C') {
        if (pointIndex === 0) pointToCheck = command.controlPoint1;
        else if (pointIndex === 1) pointToCheck = command.controlPoint2;
        else if (pointIndex === 2) pointToCheck = command.position;
      }
      const mPosition = (commands[subpathMIndex] as Command & { type: 'M' }).position;

      if (!pointToCheck || !mPosition) return false;

      // Check if they are at the same position (with small tolerance for floating point)
      const tolerance = 0.1;
      return Math.abs(pointToCheck.x - mPosition.x) < tolerance &&
        Math.abs(pointToCheck.y - mPosition.y) < tolerance;
    }, false);
  }, [withPathCommands]);

  // Helper to check if the subpath has a Z command
  const subpathHasZCommand = useCallback((elementId: string, commandIndex: number): boolean => {
    const element = elements.find(el => el.id === elementId);
    if (!element || element.type !== 'path') return false;

    const pathData = element.data as import('../types').PathData;
    const commands = pathData.subPaths.flat();
    
    // Find the end of the current subpath
    let subpathEndIndex = commandIndex;
    for (let i = commandIndex + 1; i < commands.length; i++) {
      if (commands[i].type === 'M') {
        break;
      }
      subpathEndIndex = i;
    }

    // Check if there's a Z command after the last command
    if (subpathEndIndex < commands.length - 1 && commands[subpathEndIndex + 1].type === 'Z') {
      return true;
    }

    // Also check if there's a Z within the subpath
    for (let i = commandIndex; i <= subpathEndIndex; i++) {
      if (commands[i].type === 'Z') {
        return true;
      }
    }

    return false;
  }, [elements]);

  // Helper to check if control point has a paired point
  const hasPairedControlPoint = useCallback((elementId: string, commandIndex: number, pointIndex: number): boolean => {
    const element = elements.find(el => el.id === elementId);
    if (!element || element.type !== 'path') return false;

    const pathData = element.data as import('../types').PathData;
    const commands = pathData.subPaths.flat();
    const points = extractEditablePoints(commands);
    const point = points.find(p => p.commandIndex === commandIndex && p.pointIndex === pointIndex);
    
    if (!point || !point.isControl) return false;
    
    const alignmentInfo = getControlPointAlignmentInfo(commands, points, commandIndex, pointIndex);
    if (!alignmentInfo || alignmentInfo.pairedCommandIndex === undefined || alignmentInfo.pairedPointIndex === undefined) {
      return false;
    }
    
    // Find the paired control point to ensure it exists
    const pairedPoint = points.find((p: ControlPoint) =>
      p.commandIndex === alignmentInfo.pairedCommandIndex && p.pointIndex === alignmentInfo.pairedPointIndex
    );
    
    return !!pairedPoint;
  }, [elements]);

  const actions = useMemo<FloatingContextMenuAction[]>(() => {
    if (!context) return [];

    switch (context.type) {
      case 'multiselection': {
        const arrangeActions = getArrangeActions();
        const pathOpsActions = getPathOperationActions();
        const visualCenterAction = getApplyVisualCenterAction();
        
        return [
          // Arrange actions (alignment, distribution, match, order)
          ...arrangeActions,
          // Path operations (boolean ops if applicable)
          ...pathOpsActions,
          // Optical alignment (if 2 paths selected)
          ...(visualCenterAction ? [visualCenterAction] : []),
          // Standard actions
          {
            id: 'group',
            label: 'Group',
            icon: GroupIcon,
            onClick: () => createGroupFromSelection(),
            isDisabled: selectedIds.length < 2,
          },
          // Only show Ungroup if there are groups in selection
          ...(hasGroupsInSelection(selectedIds) ? [{
            id: 'ungroup',
            label: 'Ungroup',
            icon: UngroupIcon,
            onClick: () => ungroupSelectedGroups(),
          }] : []),
          {
            id: 'lock',
            label: 'Lock',
            icon: Lock,
            onClick: handleLockSelected,
          },
          {
            id: 'hide',
            label: 'Hide',
            icon: EyeOff,
            onClick: handleHideSelected,
          },
          {
            id: 'duplicate',
            label: 'Duplicate',
            icon: Copy,
            onClick: handleDuplicate,
          },
          {
            id: 'copy',
            label: 'Copy to Clipboard',
            icon: Clipboard,
            onClick: handleCopyToClipboard,
          },
          {
            id: 'delete',
            label: 'Delete',
            icon: Trash2,
            onClick: () => deleteSelectedElements(),
            variant: 'danger',
          },
        ];
      }

      case 'group': {
        const groupId = context.groupId!;
        const isHidden = isGroupHidden(groupId);
        const isLocked = isGroupLocked(groupId);
        const arrangeActions = getArrangeActions();
        
        return [
          // Arrange actions
          ...arrangeActions,
          // Standard actions
          {
            id: 'ungroup',
            label: 'Ungroup',
            icon: UngroupIcon,
            onClick: () => ungroupGroupById(groupId),
            isDisabled: isLocked,
          },
          {
            id: 'lock',
            label: isLocked ? 'Unlock' : 'Lock',
            icon: isLocked ? Unlock : Lock,
            onClick: () => toggleGroupLock(groupId),
          },
          {
            id: 'visibility',
            label: isHidden ? 'Show' : 'Hide',
            icon: isHidden ? Eye : EyeOff,
            onClick: () => toggleGroupVisibility(groupId),
          },
          {
            id: 'duplicate',
            label: 'Duplicate',
            icon: Copy,
            onClick: handleDuplicate,
          },
          {
            id: 'copy',
            label: 'Copy to Clipboard',
            icon: Clipboard,
            onClick: handleCopyToClipboard,
          },
          {
            id: 'delete',
            label: 'Delete',
            icon: Trash2,
            onClick: () => deleteSelectedElements(),
            variant: 'danger',
          },
        ];
      }

      case 'path': {
        const elementId = context.elementId!;
        const isHidden = isElementHidden(elementId);
        const isLocked = isElementLocked(elementId);
        const arrangeActions = getArrangeActions();
        const pathOpsActions = getPathOperationActions();
        const subpathSplitAction = getSubpathSplitAction();
        const subpathJoinAction = getSubpathJoinAction();
        
        return [
          // Arrange actions
          ...arrangeActions,
          // Path operations
          ...pathOpsActions,
          // Subpath split (if path has multiple subpaths)
          ...(subpathSplitAction ? [subpathSplitAction] : []),
          ...(subpathJoinAction ? [subpathJoinAction] : []),
          // Standard actions
          {
            id: 'group',
            label: 'Group',
            icon: GroupIcon,
            onClick: () => createGroupFromSelection(),
            isDisabled: selectedIds.length < 2,
          },
          {
            id: 'lock',
            label: isLocked ? 'Unlock' : 'Lock',
            icon: isLocked ? Unlock : Lock,
            onClick: () => toggleElementLock(elementId),
          },
          {
            id: 'visibility',
            label: isHidden ? 'Show' : 'Hide',
            icon: isHidden ? Eye : EyeOff,
            onClick: () => toggleElementVisibility(elementId),
          },
          {
            id: 'duplicate',
            label: 'Duplicate',
            icon: Copy,
            onClick: handleDuplicate,
          },
          {
            id: 'copy',
            label: 'Copy to Clipboard',
            icon: Clipboard,
            onClick: handleCopyToClipboard,
          },
          {
            id: 'delete',
            label: 'Delete',
            icon: Trash2,
            onClick: () => deleteSelectedElements(),
            variant: 'danger',
          },
        ];
      }

      case 'subpath': {
        const arrangeActions = getArrangeActions();
        const subpathOpsActions = getSubpathOperationActions();
        
        return [
          // Arrange actions
          ...arrangeActions,
          // Subpath operations
          ...subpathOpsActions,
          // Standard actions
          {
            id: 'duplicate',
            label: 'Duplicate',
            icon: Copy,
            onClick: handleDuplicate,
          },
          {
            id: 'copy',
            label: 'Copy to Clipboard',
            icon: Clipboard,
            onClick: handleCopyToClipboard,
          },
          {
            id: 'delete',
            label: 'Delete',
            icon: Trash2,
            onClick: () => deleteSelectedSubpaths?.(),
            variant: 'danger',
          },
        ];
      }

      case 'point-anchor-m': {
        const pointInfo = context.pointInfo!;
        const arrangeActions = getArrangeActions();
        const hasZ = hasClosingZCommand(pointInfo.elementId, pointInfo.commandIndex);
        
        const actions: FloatingContextMenuAction[] = [
          // Arrange actions (align and distribute for multiple points)
          ...arrangeActions,
        ];
        
        // Add Z command options if the M point has a closing Z command
        if (hasZ) {
          actions.push(
            {
              id: 'delete-z-command',
              label: 'Delete Z Command',
              icon: Trash2,
              onClick: () => deleteZCommandForMPoint?.(pointInfo.elementId, pointInfo.commandIndex),
            },
            {
              id: 'convert-z-to-line',
              label: 'Convert Z to Line',
              icon: Grid3x3,
              onClick: () => convertZToLineForMPoint?.(pointInfo.elementId, pointInfo.commandIndex),
            }
          );
        }
        
        // Standard actions
        actions.push({
          id: 'delete',
          label: 'Delete',
          icon: Trash2,
          onClick: () => deleteSelectedCommands?.(),
          variant: 'danger',
        });
        
        return actions;
      }

      case 'point-anchor-l': {
        const pointInfo = context.pointInfo!;
        const isLast = isLastPointInSubpath(pointInfo.elementId, pointInfo.commandIndex, pointInfo.pointIndex);
        const atMPosition = isAtMPosition(pointInfo.elementId, pointInfo.commandIndex, pointInfo.pointIndex);
        const hasZ = subpathHasZCommand(pointInfo.elementId, pointInfo.commandIndex);
        
        const actions: FloatingContextMenuAction[] = [
          {
            id: 'change-to-curve',
            label: 'Change to Curve',
            icon: Grid3x3,
            onClick: () => convertCommandType?.(pointInfo.elementId, pointInfo.commandIndex),
          },
        ];
        
        if (isLast) {
          if (!atMPosition) {
            actions.push({
              id: 'move-to-m',
              label: 'Move to M',
              icon: Move,
              onClick: () => moveToM?.(pointInfo.elementId, pointInfo.commandIndex, pointInfo.pointIndex),
            });
          } else if (!hasZ) {
            actions.push({
              id: 'add-z-command',
              label: 'Add Z Command',
              icon: Combine,
              onClick: () => addZCommandToSubpath?.(pointInfo.elementId, pointInfo.commandIndex),
            });
          }
        } else {
          actions.push({
            id: 'cut-subpath',
            label: 'Cut Subpath',
            icon: SplitSquareVertical,
            onClick: () => cutSubpathAtPoint?.(pointInfo.elementId, pointInfo.commandIndex, pointInfo.pointIndex),
          });
        }
        
        actions.push({
          id: 'delete',
          label: 'Delete',
          icon: Trash2,
          onClick: () => deleteSelectedCommands?.(),
          variant: 'danger',
        });
        
        return actions;
      }

      case 'point-anchor-c': {
        const pointInfo = context.pointInfo!;
        const isLast = isLastPointInSubpath(pointInfo.elementId, pointInfo.commandIndex, pointInfo.pointIndex);
        const atMPosition = isAtMPosition(pointInfo.elementId, pointInfo.commandIndex, pointInfo.pointIndex);
        const hasZ = subpathHasZCommand(pointInfo.elementId, pointInfo.commandIndex);
        
        const actions: FloatingContextMenuAction[] = [
          {
            id: 'change-to-line',
            label: 'Change to Line',
            icon: Grid3x3,
            onClick: () => convertCommandType?.(pointInfo.elementId, pointInfo.commandIndex),
          },
        ];
        
        if (isLast) {
          if (!atMPosition) {
            actions.push({
              id: 'move-to-m',
              label: 'Move to M',
              icon: Move,
              onClick: () => moveToM?.(pointInfo.elementId, pointInfo.commandIndex, pointInfo.pointIndex),
            });
          } else if (!hasZ) {
            actions.push({
              id: 'add-z-command',
              label: 'Add Z Command',
              icon: Combine,
              onClick: () => addZCommandToSubpath?.(pointInfo.elementId, pointInfo.commandIndex),
            });
          }
        } else {
          actions.push({
            id: 'cut-subpath',
            label: 'Cut Subpath',
            icon: SplitSquareVertical,
            onClick: () => cutSubpathAtPoint?.(pointInfo.elementId, pointInfo.commandIndex, pointInfo.pointIndex),
          });
        }
        
        actions.push({
          id: 'delete',
          label: 'Delete',
          icon: Trash2,
          onClick: () => deleteSelectedCommands?.(),
          variant: 'danger',
        });
        
        return actions;
      }

      case 'point-control': {
        const pointInfo = context.pointInfo!;
        const hasPair = hasPairedControlPoint(pointInfo.elementId, pointInfo.commandIndex, pointInfo.pointIndex);
        
        const actions: FloatingContextMenuAction[] = [];
        
        if (hasPair) {
          actions.push({
            id: 'control-point-alignment',
            label: 'Control Point Alignment',
            icon: Grid3x3,
            submenu: [
              {
                id: 'independent',
                label: 'Independent',
                icon: Grid3x3,
                onClick: () => {
                  const element = elements.find(el => el.id === pointInfo.elementId);
                  if (element && element.type === 'path') {
                    const pathData = element.data as import('../types').PathData;
                    const commands = pathData.subPaths.flat();
                    const points = extractEditablePoints(commands);
                    const alignmentInfo = getControlPointAlignmentInfo(commands, points, pointInfo.commandIndex, pointInfo.pointIndex);
                    if (alignmentInfo && setControlPointAlignmentType) {
                      setControlPointAlignmentType(
                        pointInfo.elementId,
                        pointInfo.commandIndex,
                        pointInfo.pointIndex,
                        alignmentInfo.pairedCommandIndex ?? 0,
                        alignmentInfo.pairedPointIndex ?? 0,
                        'independent'
                      );
                    }
                  }
                },
              },
              {
                id: 'aligned',
                label: 'Aligned',
                icon: Grid3x3,
                onClick: () => {
                  const element = elements.find(el => el.id === pointInfo.elementId);
                  if (element && element.type === 'path') {
                    const pathData = element.data as import('../types').PathData;
                    const commands = pathData.subPaths.flat();
                    const points = extractEditablePoints(commands);
                    const alignmentInfo = getControlPointAlignmentInfo(commands, points, pointInfo.commandIndex, pointInfo.pointIndex);
                    if (alignmentInfo && setControlPointAlignmentType) {
                      setControlPointAlignmentType(
                        pointInfo.elementId,
                        pointInfo.commandIndex,
                        pointInfo.pointIndex,
                        alignmentInfo.pairedCommandIndex ?? 0,
                        alignmentInfo.pairedPointIndex ?? 0,
                        'aligned'
                      );
                    }
                  }
                },
              },
              {
                id: 'mirrored',
                label: 'Mirrored',
                icon: Grid3x3,
                onClick: () => {
                  const element = elements.find(el => el.id === pointInfo.elementId);
                  if (element && element.type === 'path') {
                    const pathData = element.data as import('../types').PathData;
                    const commands = pathData.subPaths.flat();
                    const points = extractEditablePoints(commands);
                    const alignmentInfo = getControlPointAlignmentInfo(commands, points, pointInfo.commandIndex, pointInfo.pointIndex);
                    if (alignmentInfo && setControlPointAlignmentType) {
                      setControlPointAlignmentType(
                        pointInfo.elementId,
                        pointInfo.commandIndex,
                        pointInfo.pointIndex,
                        alignmentInfo.pairedCommandIndex ?? 0,
                        alignmentInfo.pairedPointIndex ?? 0,
                        'mirrored'
                      );
                    }
                  }
                },
              },
            ],
          });
        }
        
        actions.push({
          id: 'delete',
          label: 'Delete',
          icon: Trash2,
          onClick: () => deleteSelectedCommands?.(),
          variant: 'danger',
        });
        
        return actions;
      }

      default:
        return [];
    }
  }, [
    context,
    selectedIds,
    elements,
    createGroupFromSelection,
    ungroupSelectedGroups,
    ungroupGroupById,
    toggleGroupVisibility,
    toggleGroupLock,
    toggleElementVisibility,
    toggleElementLock,
    deleteSelectedElements,
    deleteSelectedSubpaths,
    deleteSelectedCommands,
    convertCommandType,
    cutSubpathAtPoint,
    moveToM,
    setControlPointAlignmentType,
    addZCommandToSubpath,
    deleteZCommandForMPoint,
    convertZToLineForMPoint,
    handleDuplicate,
    handleCopyToClipboard,
    isGroupHidden,
    isGroupLocked,
    isElementHidden,
    isElementLocked,
    getArrangeActions,
    getPathOperationActions,
    getSubpathOperationActions,
    getSubpathSplitAction,
    getSubpathJoinAction,
    getApplyVisualCenterAction,
    hasGroupsInSelection,
    handleHideSelected,
    handleLockSelected,
    isLastPointInSubpath,
    subpathHasZCommand,
    hasPairedControlPoint,
    hasClosingZCommand,
    isAtMPosition,
  ]);

  return actions;
}
