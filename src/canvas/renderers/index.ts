import {
  CanvasRendererRegistry,
  canvasRendererRegistry,
} from './CanvasRendererRegistry';
import { PathElementRenderer } from './PathElementRenderer';

canvasRendererRegistry.registerRenderer('path', PathElementRenderer);

export { CanvasRendererRegistry, canvasRendererRegistry };
export type {
  CanvasElementRenderer,
  CanvasElementEventHandlers,
  CanvasRenderContext,
} from './CanvasRendererRegistry';
export { PathElementRenderer } from './PathElementRenderer';
