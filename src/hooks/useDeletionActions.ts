/**
 * Deletion Actions Hook
 * 
 * Centralized hook for handling deletion operations across the application.
 * Provides consistent deletion scope calculation and execution for both
 * toolbar buttons and keyboard shortcuts.
 */

import { useMemo } from 'react';
import { getDeletionScope, executeDeletion, type DeletionScope, type DeletionHandlers } from '../utils/deletionScopeUtils';

export interface UseDeletionActionsOptions {
  selectedCommandsCount: number;
  selectedSubpathsCount: number;
  selectedElementsCount: number;
  activePlugin?: string | null;
  usePluginStrategy?: boolean;
  deleteSelectedCommands?: () => void;
  deleteSelectedSubpaths?: () => void;
  deleteSelectedElements: () => void;
}

export interface DeletionActions {
  scope: DeletionScope;
  canDelete: boolean;
  executeDeletion: () => boolean;
}

/**
 * Hook that provides deletion actions based on current selection state.
 * 
 * @param options - Configuration for deletion actions
 * @returns Object containing scope, canDelete flag, and executeDeletion function
 * 
 * @example
 * // In BottomActionBar (plugin-aware):
 * const { scope, canDelete, executeDeletion } = useDeletionActions({
 *   selectedCommandsCount,
 *   selectedSubpathsCount,
 *   selectedElementsCount: selectedIds.length,
 *   activePlugin,
 *   usePluginStrategy: true,
 *   deleteSelectedCommands,
 *   deleteSelectedSubpaths,
 *   deleteSelectedElements,
 * });
 * 
 * @example
 * // In keyboard controls (priority-based):
 * const { executeDeletion } = useDeletionActions({
 *   selectedCommandsCount: selectedCommands?.length ?? 0,
 *   selectedSubpathsCount: selectedSubpaths?.length ?? 0,
 *   selectedElementsCount: selectedIds.length,
 *   usePluginStrategy: false,
 *   deleteSelectedCommands,
 *   deleteSelectedSubpaths,
 *   deleteSelectedElements,
 * });
 */
export function useDeletionActions(options: UseDeletionActionsOptions): DeletionActions {
  const {
    selectedCommandsCount,
    selectedSubpathsCount,
    selectedElementsCount,
    activePlugin,
    usePluginStrategy = false,
    deleteSelectedCommands,
    deleteSelectedSubpaths,
    deleteSelectedElements,
  } = options;

  // Calculate deletion scope based on strategy
  const scope = useMemo(() => getDeletionScope({
    selectedCommandsCount,
    selectedSubpathsCount,
    selectedElementsCount,
    activePlugin,
  }, usePluginStrategy), [
    selectedCommandsCount,
    selectedSubpathsCount,
    selectedElementsCount,
    activePlugin,
    usePluginStrategy,
  ]);

  const canDelete = scope.count > 0;

  // Create deletion handler
  const handlers: DeletionHandlers = useMemo(() => ({
    deleteSelectedCommands,
    deleteSelectedSubpaths,
    deleteSelectedElements,
  }), [deleteSelectedCommands, deleteSelectedSubpaths, deleteSelectedElements]);

  const execute = () => executeDeletion(scope, handlers);

  return {
    scope,
    canDelete,
    executeDeletion: execute,
  };
}
