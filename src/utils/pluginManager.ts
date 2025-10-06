import React from 'react';
import type { ToolRegistry } from './toolRegistry';
import type { Point } from '../types';
import { toolRegistry } from './toolRegistry';

export class PluginManager {
  private registry: ToolRegistry = {};

  constructor(initialRegistry: ToolRegistry) {
    this.registry = { ...initialRegistry };
  }

  /**
   * Check if tool exists
   */
  hasTool(name: string): boolean {
    return name in this.registry;
  }

  /**
   * Handle keyboard event for active tool
   */
  handleKeyboardEvent(toolName: string, e: KeyboardEvent): void {
    const tool = this.registry[toolName];
    if (tool?.keyboardShortcuts?.[e.key]) {
      tool.keyboardShortcuts[e.key](e);
    }
  }

  /**
   * Get cursor for tool
   */
  getCursor(toolName: string): string {
    return this.registry[toolName]?.feedback?.cursor || 'default';
  }

  /**
   * Get overlays for tool
   */
  getOverlays(toolName: string): React.ComponentType<Record<string, unknown>>[] {
    return this.registry[toolName]?.overlays || [];
  }

  /**
   * Execute tool handler
   */
  executeHandler(
    toolName: string,
    e: React.PointerEvent,
    point: Point,
    target: Element,
    isSmoothBrushActive: boolean,
    beginSelectionRectangle: (point: Point, shiftKey?: boolean, subpathMode?: boolean) => void,
    startShapeCreation: (point: Point) => void
  ): void {
    const tool = this.registry[toolName];
    if (tool) {
      tool.handler(e, point, target, isSmoothBrushActive, beginSelectionRectangle, startShapeCreation);
    }
  }
}

/**
 * Singleton instance of PluginManager with the default tool registry
 * Use this instead of creating new instances to ensure consistency
 */
export const pluginManager = new PluginManager(toolRegistry);