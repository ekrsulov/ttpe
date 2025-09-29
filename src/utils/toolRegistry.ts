import type { Point } from '../types';
import { useCanvasStore } from '../store/canvasStore';

export type ToolHandler = (
  e: React.PointerEvent,
  point: Point,
  target: Element,
  isSmoothBrushActive: boolean,
  beginSelectionRectangle: (point: Point, shiftKey?: boolean, subpathMode?: boolean) => void,
  startShapeCreation: (point: Point) => void
) => void;

export const toolRegistry: Record<string, ToolHandler> = {
  pencil: (_e, point) => {
    // Start path
    useCanvasStore.getState().startPath(point);
  },
  text: (_e, point) => {
    // Add text
    const state = useCanvasStore.getState();
    state.addText(point.x, point.y, state.text.text);
  },
  shape: (_e, point, _target, _isSmoothBrushActive, _beginSelectionRectangle, startShapeCreation) => {
    // Start creating a shape
    startShapeCreation(point);
  },
  select: (_e, point, target, _isSmoothBrushActive, beginSelectionRectangle, _startShapeCreation) => {
    // Only start selection rectangle if clicking on SVG canvas, not on elements
    if (target.tagName === 'svg') {
      beginSelectionRectangle(point);
    }
  },
  edit: (e, point, target, isSmoothBrushActive, beginSelectionRectangle, _startShapeCreation) => {
    // Start command selection rectangle if clicking on SVG canvas (only when smooth brush is not active)
    if (target.tagName === 'svg' && !isSmoothBrushActive) {
      beginSelectionRectangle(point, !e.shiftKey, false);
    }
  },
  subpath: (e, point, target, _isSmoothBrushActive, beginSelectionRectangle, _startShapeCreation) => {
    // Start subpath selection rectangle if clicking on SVG canvas
    if (target.tagName === 'svg') {
      beginSelectionRectangle(point, false, !e.shiftKey);
    }
  },
};