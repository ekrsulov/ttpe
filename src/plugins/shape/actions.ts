/**
 * Shape Plugin Actions
 * 
 * Contains the business logic for shape operations that were previously
 * coupled to the canvas store.
 */

import type { Point, Command } from '../../types';
import type { StoreApi } from 'zustand';
import type { CanvasStore } from '../../store/types';
import type { ShapePluginSlice } from './slice';
import type { PencilPluginSlice } from '../pencil/slice';
import {
  createSquareCommands,
  createRectangleCommands,
  createCircleCommands,
  createTriangleCommands,
  createLineCommands,
  createDiamondCommands,
  createHeartCommands,
  extractSubpaths
} from '../../utils/path';

/**
 * Create a shape based on start and end points
 */
export function createShape(
  startPoint: Point,
  endPoint: Point,
  getState: StoreApi<CanvasStore>['getState']
): void {
  const state = getState();
  if (!state.shape || !state.pencil) return;

  const shapeState = state.shape as ShapePluginSlice['shape'];
  const pencilState = state.pencil as PencilPluginSlice['pencil'];

  const { strokeWidth, strokeColor, strokeOpacity, fillColor, fillOpacity } = pencilState;
  const selectedShape = shapeState.selectedShape;

  // Calculate shape dimensions
  const width = Math.abs(endPoint.x - startPoint.x);
  const height = Math.abs(endPoint.y - startPoint.y);
  const centerX = (startPoint.x + endPoint.x) / 2;
  const centerY = (startPoint.y + endPoint.y) / 2;

  let commands: Command[] = [];

  switch (selectedShape) {
    case 'square': {
      // Create a square using path commands
      const halfSize = Math.min(width, height) / 2;
      commands = createSquareCommands(centerX, centerY, halfSize);
      break;
    }

    case 'rectangle': {
      // Create a rectangle using path commands
      commands = createRectangleCommands(startPoint.x, startPoint.y, endPoint.x, endPoint.y);
      break;
    }

    case 'circle': {
      // Create a circle using C commands (Bézier curves)
      const radius = Math.min(width, height) / 2;
      commands = createCircleCommands(centerX, centerY, radius);
      break;
    }

    case 'triangle': {
      // Create a triangle using path commands
      commands = createTriangleCommands(centerX, startPoint.y, endPoint.x, endPoint.y, startPoint.x);
      break;
    }

    case 'line': {
      // Create a line using path commands
      commands = createLineCommands(startPoint.x, startPoint.y, endPoint.x, endPoint.y);
      break;
    }

    case 'diamond': {
      // Create a diamond using path commands
      const halfWidth = width / 2;
      const halfHeight = height / 2;
      commands = createDiamondCommands(centerX, centerY, halfWidth, halfHeight);
      break;
    }

    case 'heart': {
      // Create a heart using Bézier curves
      commands = createHeartCommands(centerX, centerY, width, height);
      break;
    }

    default: {
      // Default to square if unknown shape
      const defaultHalfSize = Math.min(width, height) / 2;
      commands = createSquareCommands(centerX, centerY, defaultHalfSize);
      break;
    }
  }

  // Extract subpaths directly from generated commands
  const parsedSubPaths = extractSubpaths(commands);

  state.addElement({
    type: 'path',
    data: {
      subPaths: parsedSubPaths.map(sp => sp.commands),
      strokeWidth,
      strokeColor,
      strokeOpacity,
      fillColor,
      fillOpacity,
      strokeLinecap: pencilState.strokeLinecap || 'round',
      strokeLinejoin: pencilState.strokeLinejoin || 'round',
      fillRule: pencilState.fillRule || 'nonzero',
      strokeDasharray: pencilState.strokeDasharray || 'none',
    },
  });

  // Auto-switch to select mode after creating shape (unless keepShapeMode is enabled)
  if (!shapeState.keepShapeMode) {
    state.setActivePlugin('select');
  }
}
