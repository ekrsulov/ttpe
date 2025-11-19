import { createContext, useContext, useRef, type PropsWithChildren } from 'react';
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react';
import type { Point } from '../types';

export type CanvasPointerEvent = ReactPointerEvent | globalThis.PointerEvent;
export type CanvasWheelEvent = ReactWheelEvent | globalThis.WheelEvent;

export interface CanvasPointerEventHelpers extends Record<string, any> { // eslint-disable-line @typescript-eslint/no-explicit-any
  beginSelectionRectangle?: (point: Point, shiftKey?: boolean, subpathMode?: boolean) => void;
  updateSelectionRectangle?: (point: Point) => void;
  completeSelectionRectangle?: () => void;
  startShapeCreation?: (point: Point) => void;
  updateShapeCreation?: (point: Point, shiftPressed: boolean) => void;
  endShapeCreation?: () => void;
  isSmoothBrushActive?: boolean;
  setDragStart?: (point: Point | null) => void;
  setIsDragging?: (isDragging: boolean) => void;
  setHasDragMoved?: (hasMoved: boolean) => void;
}

export interface CanvasPointerEventState {
  isSelecting?: boolean;
  isCreatingShape?: boolean;
  isDragging?: boolean;
  dragStart?: Point | null;
  hasDragMoved?: boolean;
}

export interface CanvasPointerEventPayload {
  event: CanvasPointerEvent;
  point: Point;
  target: EventTarget | null;
  activePlugin: string | null;
  helpers: CanvasPointerEventHelpers;
  state: CanvasPointerEventState;
}

export interface CanvasKeyboardEventPayload {
  event: KeyboardEvent;
  activePlugin: string | null;
}

export interface CanvasWheelEventPayload {
  event: CanvasWheelEvent;
  activePlugin: string | null;
  svg?: SVGSVGElement | null;
}

export type CanvasEventMap = {
  pointerdown: CanvasPointerEventPayload;
  pointermove: CanvasPointerEventPayload;
  pointerup: CanvasPointerEventPayload;
  keyboard: CanvasKeyboardEventPayload;
  wheel: CanvasWheelEventPayload;
};

type CanvasEventHandler<TPayload> = (payload: TPayload) => void;

export class CanvasEventBus<EventMap extends Record<string, unknown> = CanvasEventMap> {
  private handlers: Map<keyof EventMap, Set<CanvasEventHandler<unknown>>> = new Map();

  subscribe<K extends keyof EventMap>(eventType: K, handler: CanvasEventHandler<EventMap[K]>): () => void {
    let listeners = this.handlers.get(eventType);
    if (!listeners) {
      listeners = new Set();
      this.handlers.set(eventType, listeners);
    }

    listeners.add(handler as CanvasEventHandler<unknown>);

    return () => {
      const currentListeners = this.handlers.get(eventType);
      if (!currentListeners) {
        return;
      }
      currentListeners.delete(handler as CanvasEventHandler<unknown>);
      if (currentListeners.size === 0) {
        this.handlers.delete(eventType);
      }
    };
  }

  emit<K extends keyof EventMap>(eventType: K, payload: EventMap[K]): void {
    const listeners = this.handlers.get(eventType);
    if (!listeners) {
      return;
    }

    for (const listener of listeners) {
      (listener as CanvasEventHandler<EventMap[K]>)(payload);
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}

const CanvasEventBusContext = createContext<CanvasEventBus | null>(null);

export type CanvasEventBusProviderProps = PropsWithChildren<{ value?: CanvasEventBus }>;

export const CanvasEventBusProvider = ({ value, children }: CanvasEventBusProviderProps) => {
  const busRef = useRef<CanvasEventBus | null>(value ?? null);
  if (!busRef.current) {
    busRef.current = value ?? new CanvasEventBus();
  }

  const bus = (value ?? busRef.current)!;

  return <CanvasEventBusContext.Provider value={bus}>{children}</CanvasEventBusContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCanvasEventBus = () => {
  const bus = useContext(CanvasEventBusContext);
  if (!bus) {
    throw new Error('CanvasEventBus is not available in the current context.');
  }
  return bus;
};

