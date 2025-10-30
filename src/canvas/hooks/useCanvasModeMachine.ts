import { useCallback, useMemo } from 'react';
import type { ComponentType } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { pluginManager } from '../../utils/pluginManager';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import {
  CANVAS_MODE_MACHINE,
  getCanvasModeDefinition,
  getCanvasModeResources,
  transitionCanvasMode,
  type CanvasMode,
  type CanvasModeStateConfig,
  type CanvasModeTransitionResult,
} from '../modes/CanvasModeMachine';

export type CanvasModeTransitionExecutor = (mode: CanvasMode) => CanvasModeTransitionResult;

export type CanvasModePointerHandler = NonNullable<PluginDefinition<CanvasStore>['handler']>;

export interface CanvasModeListeners {
  pointerdown?: CanvasModePointerHandler;
}

export interface CanvasModeEffects {
  listeners: CanvasModeListeners;
  overlays: ComponentType<Record<string, unknown>>[];
}

export interface CanvasModeMachineHookResult {
  currentMode: CanvasMode;
  definition: CanvasModeStateConfig;
  transition: CanvasModeTransitionExecutor;
  effects: CanvasModeEffects;
}

const normalizeMode = (mode: string | null | undefined): CanvasMode => {
  if (!mode) {
    return CANVAS_MODE_MACHINE.initial;
  }
  return mode as CanvasMode;
};

const dedupe = <T,>(items: T[]): T[] => Array.from(new Set(items));

export const useCanvasModeMachine = (): CanvasModeMachineHookResult => {
  const activePlugin = useCanvasStore((state) => state.activePlugin);

  const currentMode = normalizeMode(activePlugin);

  const definition = useMemo(
    () => getCanvasModeDefinition(currentMode),
    [currentMode],
  );

  const resources = useMemo(
    () => getCanvasModeResources(currentMode),
    [currentMode],
  );

  const pluginIds = useMemo(
    () => dedupe((resources.plugins && resources.plugins.length > 0 ? resources.plugins : [currentMode]).map((id) => id)),
    [resources.plugins, currentMode],
  );

  const overlays = useMemo(
    () => pluginIds.flatMap((id) => pluginManager.getOverlays(id) ?? []),
    [pluginIds],
  );

  const listeners = useMemo<CanvasModeListeners>(() => {
    const primaryPlugin = pluginManager.getPlugin(currentMode);
    return {
      pointerdown: primaryPlugin?.handler,
    };
  }, [currentMode]);

  const transition = useCallback<CanvasModeTransitionExecutor>((mode) => {
    const store = useCanvasStore.getState();
    const current = normalizeMode(store.activePlugin);
    const result = transitionCanvasMode(current, { type: 'ACTIVATE', value: mode });

    if (!result.changed) {
      return result;
    }

    useCanvasStore.setState({ activePlugin: result.mode });

    for (const action of result.actions) {
      switch (action) {
        case 'clearGuidelines':
          store.clearGuidelines?.();
          break;
        case 'clearSubpathSelection':
          store.clearSubpathSelection?.();
          break;
        default:
          break;
      }
    }

    return result;
  }, []);

  return {
    currentMode,
    definition,
    transition,
    effects: {
      listeners,
      overlays,
    },
  };
};
