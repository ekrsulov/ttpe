import {
  MousePointer,
  Pen,
  PenTool,
  Type,
  Shapes,
  Route,
  SquareDashedMousePointer,
  MousePointerClick,
  Hand,
  PaintBucket,
  Scissors
} from 'lucide-react';
import type { ComponentType } from 'react';

/**
 * Tool mode type definition
 */
export type ToolMode = 'select' | 'pencil' | 'text' | 'shape' | 'curves' | 'subpath' | 'transformation' | 'edit' | 'pan' | 'gridFill' | 'trimPath';

/**
 * Unified tool definition interface
 * Contains all metadata for a tool in one place
 * Internal interface - only the array is exported
 */
interface ToolDefinition {
  mode: ToolMode;
  label: string;
  icon: ComponentType<{ size?: number }>;
  cursor: string;
  order: number;
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
    order: 1,
  },
  {
    mode: 'subpath',
    label: 'Subpath',
    icon: Route,
    cursor: 'pointer',
    order: 2,
  },
  {
    mode: 'transformation',
    label: 'Transform',
    icon: SquareDashedMousePointer,
    cursor: 'move',
    order: 3,
  },
  {
    mode: 'edit',
    label: 'Edit',
    icon: MousePointerClick,
    cursor: 'pointer',
    order: 4,
  },
  {
    mode: 'pan',
    label: 'Pan',
    icon: Hand,
    cursor: 'grab',
    order: 5,
  },
  {
    mode: 'pencil',
    label: 'Pencil',
    icon: Pen,
    cursor: 'crosshair',
    order: 6,
  },
  {
    mode: 'curves',
    label: 'Curves',
    icon: PenTool,
    cursor: 'crosshair',
    order: 7,
  },
  {
    mode: 'text',
    label: 'Text',
    icon: Type,
    cursor: 'text',
    order: 8,
  },
  {
    mode: 'shape',
    label: 'Shape',
    icon: Shapes,
    cursor: 'crosshair',
    order: 9,
  },
  {
    mode: 'gridFill',
    label: 'Grid Fill',
    icon: PaintBucket,
    cursor: 'crosshair',
    order: 10,
  },
  {
    mode: 'trimPath',
    label: 'Trim Path',
    icon: Scissors,
    cursor: 'crosshair',
    order: 11,
  },
];
