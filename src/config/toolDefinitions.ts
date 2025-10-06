import {
  MousePointer,
  Pen,
  Type,
  Shapes,
  Route,
  SquareDashedMousePointer,
  MousePointerClick,
  Hand
} from 'lucide-react';
import type { ComponentType } from 'react';

/**
 * Tool mode type definition
 */
export type ToolMode = 'select' | 'pencil' | 'text' | 'shape' | 'subpath' | 'transformation' | 'edit' | 'pan';

/**
 * Unified tool definition interface
 * Contains all metadata for a tool in one place
 */
export interface ToolDefinition {
  mode: ToolMode;
  label: string;
  icon: ComponentType<{ size?: number }>;
  cursor: string;
  panelKey?: string;
}

/**
 * Centralized tool definitions
 * Single source of truth for all tool metadata
 */
export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    mode: 'select',
    label: 'Select',
    icon: MousePointer,
    cursor: 'default',
    panelKey: 'select',
  },
  {
    mode: 'pan',
    label: 'Pan',
    icon: Hand,
    cursor: 'grab',
    panelKey: 'pan',
  },
  {
    mode: 'pencil',
    label: 'Pencil',
    icon: Pen,
    cursor: 'crosshair',
    panelKey: 'pencil',
  },
  {
    mode: 'text',
    label: 'Text',
    icon: Type,
    cursor: 'text',
    panelKey: 'text',
  },
  {
    mode: 'shape',
    label: 'Shape',
    icon: Shapes,
    cursor: 'crosshair',
    panelKey: 'shape',
  },
  {
    mode: 'subpath',
    label: 'Subpath',
    icon: Route,
    cursor: 'pointer',
  },
  {
    mode: 'transformation',
    label: 'Transform',
    icon: SquareDashedMousePointer,
    cursor: 'move',
    panelKey: 'transformation',
  },
  {
    mode: 'edit',
    label: 'Edit',
    icon: MousePointerClick,
    cursor: 'pointer',
    panelKey: 'edit',
  },
];
