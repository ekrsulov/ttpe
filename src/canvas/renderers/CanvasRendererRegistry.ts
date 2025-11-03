import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from 'react';
import type { CanvasElement, ElementType, Viewport } from '../../types';

export interface CanvasElementEventHandlers {
  onPointerDown?: (
    elementId: string,
    event: ReactPointerEvent<Element>
  ) => void;
  onPointerUp?: (elementId: string, event: ReactPointerEvent<Element>) => void;
  onDoubleClick?: (elementId: string, event: ReactMouseEvent<Element>) => void;
  onTouchEnd?: (elementId: string, event: React.TouchEvent<Element>) => void;
}

export interface CanvasRenderContext {
  viewport: Viewport;
  activePlugin: string | null;
  scaleStrokeWithZoom: boolean;
  isElementHidden?: (elementId: string) => boolean;
  isElementLocked?: (elementId: string) => boolean;
  isElementSelected?: (elementId: string) => boolean;
  isTransforming?: boolean;
  isSelecting?: boolean;
  isCreatingShape?: boolean;
  eventHandlers: CanvasElementEventHandlers;
}

export type CanvasElementRenderer<T extends CanvasElement = CanvasElement> = (
  element: T,
  context: CanvasRenderContext
) => ReactNode;

export class CanvasRendererRegistry {
  private renderers = new Map<ElementType, CanvasElementRenderer>();

  registerRenderer<T extends CanvasElement>(
    type: T['type'],
    renderer: CanvasElementRenderer<T>
  ): void {
    this.renderers.set(type, renderer as CanvasElementRenderer);
  }

  unregisterRenderer(type: ElementType): void {
    this.renderers.delete(type);
  }

  getRenderer(type: ElementType): CanvasElementRenderer | undefined {
    return this.renderers.get(type);
  }

  render(element: CanvasElement, context: CanvasRenderContext): React.ReactNode {
    if (context.isElementHidden?.(element.id)) {
      return null;
    }

    const renderer = this.renderers.get(element.type);
    if (!renderer) {
      return null;
    }

    return renderer(element as never, context);
  }
}

export const canvasRendererRegistry = new CanvasRendererRegistry();
