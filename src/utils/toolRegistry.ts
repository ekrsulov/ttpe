import type { Point } from '../types';
import { useCanvasStore } from '../store/canvasStore';
import React from 'react';
import { TOOL_DEFINITIONS, type ToolMode } from '../config/toolDefinitions';

export type ToolHandler = (
  e: React.PointerEvent,
  point: Point,
  target: Element,
  isSmoothBrushActive: boolean,
  beginSelectionRectangle: (point: Point, shiftKey?: boolean, subpathMode?: boolean) => void,
  startShapeCreation: (point: Point) => void
) => void;

export interface ToolConfig {
  handler: ToolHandler;
  keyboardShortcuts?: Record<string, (e: KeyboardEvent) => void>;
  feedback?: {
    cursor?: string;
    overlay?: React.ComponentType<Record<string, unknown>>;
  };
  overlays?: React.ComponentType<Record<string, unknown>>[];
}

export type ToolRegistry = Record<string, ToolConfig>;

/**
 * Get cursor style for a tool mode
 * Uses centralized tool definitions
 */
export const getToolCursor = (mode: ToolMode): string => {
  const toolDef = TOOL_DEFINITIONS.find(tool => tool.mode === mode);
  return toolDef?.cursor || 'default';
};

export const toolRegistry: ToolRegistry = {
  pencil: {
    handler: (_e, point) => {
      // Start path
      useCanvasStore.getState().startPath(point);
    },
    keyboardShortcuts: {
      'Delete': () => {
        // Delete selected elements
        useCanvasStore.getState().deleteSelectedElements();
      },
    },
    feedback: {
      cursor: getToolCursor('pencil'),
    },
  },
  text: {
    handler: (_e, point) => {
      // Add text
      const state = useCanvasStore.getState();
      state.addText(point.x, point.y, state.text.text);
    },
    keyboardShortcuts: {
      'Enter': () => {
        // Finish text editing - assuming method exists or add later
        // useCanvasStore.getState().finishTextEditing();
      },
    },
    feedback: {
      cursor: getToolCursor('text'),
    },
  },
  shape: {
    handler: (_e, point, _target, _isSmoothBrushActive, _beginSelectionRectangle, startShapeCreation) => {
      // Start creating a shape
      startShapeCreation(point);
    },
    keyboardShortcuts: {
      'Escape': () => {
        // Cancel shape creation - handle in hook
      },
    },
    feedback: {
      cursor: getToolCursor('shape'),
    },
  },
  select: {
    handler: (e, point, target, _isSmoothBrushActive, beginSelectionRectangle, _startShapeCreation) => {
      // Only start selection rectangle if clicking on SVG canvas, not on elements
      if (target.tagName === 'svg') {
        if (!e.shiftKey) {
          useCanvasStore.getState().clearSelection();
        }
        beginSelectionRectangle(point);
      }
    },
    keyboardShortcuts: {
      'Delete': () => {
        useCanvasStore.getState().deleteSelectedElements();
      },
      'a': (e) => {
        if (e.ctrlKey || e.metaKey) {
          // Select all - assuming method exists
          // useCanvasStore.getState().selectAllElements();
        }
      },
    },
    feedback: {
      cursor: getToolCursor('select'),
    },
  },
  edit: {
    handler: (e, point, target, isSmoothBrushActive, beginSelectionRectangle, _startShapeCreation) => {
      // Start command selection rectangle if clicking on SVG canvas (only when smooth brush is not active)
      if (target.tagName === 'svg' && !isSmoothBrushActive) {
        beginSelectionRectangle(point, !e.shiftKey, false);
      }
    },
    keyboardShortcuts: {
      'Delete': () => {
        // Delete selected commands - assuming method exists
        // useCanvasStore.getState().deleteSelectedCommands();
      },
    },
    feedback: {
      cursor: getToolCursor('edit'),
    },
  },
  subpath: {
    handler: (e, point, target, _isSmoothBrushActive, beginSelectionRectangle, _startShapeCreation) => {
      // Start subpath selection rectangle if clicking on SVG canvas
      if (target.tagName === 'svg') {
        beginSelectionRectangle(point, false, !e.shiftKey);
      }
    },
    keyboardShortcuts: {
      'Delete': () => {
        // Delete selected subpaths - assuming method exists
        // useCanvasStore.getState().deleteSelectedSubpaths();
      },
    },
    feedback: {
      cursor: getToolCursor('subpath'),
    },
  },
  pan: {
    handler: () => {
      // Pan tool handler - implemented elsewhere
    },
    feedback: {
      cursor: getToolCursor('pan'),
    },
  },
  transformation: {
    handler: () => {
      // Transformation tool handler - implemented elsewhere
    },
    feedback: {
      cursor: getToolCursor('transformation'),
    },
  },
};