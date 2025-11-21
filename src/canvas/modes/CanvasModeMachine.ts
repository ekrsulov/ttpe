import type { PluginDefinition } from '../../types/plugins';

// Tool modes are now defined per-plugin and aggregated via the Plugin Manager.
// We treat canvas modes as plain strings to allow arbitrary plugin-defined modes.
export type CanvasMode = string & {};

export type CanvasModeLifecycleAction = 'clearGuidelines' | 'clearSubpathSelection' | 'clearSelectedCommands';

export interface CanvasModeResources {
  plugins?: CanvasMode[];
  listeners?: string[];
  overlays?: string[];
}

export interface CanvasModeStateConfig {
  id: CanvasMode;
  description: string;
  entry?: CanvasModeLifecycleAction[];
  exit?: CanvasModeLifecycleAction[];
  /**
   * Transition table described as a map where the key is the target mode.
   * A wildcard entry (`*`) allows transitioning to any unlisted mode (custom plugins).
   */
  transitions: Record<string, { description: string }>;
  /**
   * When defined, activating the same mode twice will fall back to this mode.
   */
  toggleTo?: CanvasMode;
  resources?: CanvasModeResources;
}

export interface CanvasModeMachineDefinition {
  initial: CanvasMode;
  /** Base configuration for built-in modes. */
  states: Record<string, CanvasModeStateConfig>;
  /** Definition used for any custom mode that isn't explicitly described. */
  defaultState: CanvasModeStateConfig;
  global?: {
    onTransition?: CanvasModeLifecycleAction[];
  };
}

export interface CanvasModeEvent {
  type: 'ACTIVATE';
  value: CanvasMode;
}

export interface CanvasModeTransitionResult {
  changed: boolean;
  mode: CanvasMode;
  actions: CanvasModeLifecycleAction[];
  reason: 'noop' | 'switch' | 'toggle-fallback' | 'denied';
  from: CanvasMode;
  requested: CanvasMode;
}

const wildcardTransition = { description: 'Allows transitioning to modes dynamically registered by plugins.' };

const defaultState: CanvasModeStateConfig = {
  id: 'select',
  description: 'Mode defined by an external plugin.',
  transitions: { '*': wildcardTransition },
  resources: { plugins: [], listeners: [], overlays: [] },
};

/**
 * Builds the canvas mode machine dynamically from registered plugins.
 * This allows plugins to define their own modes with custom configurations.
 */
export function buildCanvasModeMachine(plugins: PluginDefinition[]): CanvasModeMachineDefinition {
  const states: Record<string, CanvasModeStateConfig> = {};

  // Add all plugin modes (including core modes like select, pan, text, curves)
  plugins.forEach(plugin => {
    if (plugin.modeConfig) {
      const transitions = { ...plugin.modeConfig.transitions };
      
      // For 'select' mode, automatically add transitions to all other plugin modes
      if (plugin.id === 'select') {
        plugins.forEach(otherPlugin => {
          if (otherPlugin.modeConfig && otherPlugin.id !== 'select') {
            // Only add if not already defined
            if (!transitions[otherPlugin.id]) {
              transitions[otherPlugin.id] = { description: otherPlugin.modeConfig.description };
            }
          }
        });
      }

      states[plugin.id] = {
        id: plugin.id,
        description: plugin.modeConfig.description,
        entry: plugin.modeConfig.entry,
        exit: plugin.modeConfig.exit,
        transitions,
        toggleTo: plugin.modeConfig.toggleTo,
        resources: { plugins: [plugin.id] },
      };
    }
  });

  return {
    initial: 'select',
    states,
    defaultState,
    global: {
      onTransition: ['clearGuidelines'],
    },
  };
}

// Default empty machine (will be replaced by buildCanvasModeMachine when plugins are registered)
let CANVAS_MODE_MACHINE: CanvasModeMachineDefinition = {
  initial: 'select',
  states: {},
  defaultState,
  global: {
    onTransition: ['clearGuidelines'],
  },
};

/**
 * Updates the canvas mode machine with plugin configurations.
 * Should be called after plugins are registered.
 */
export function updateCanvasModeMachine(plugins: PluginDefinition[]): void {
  CANVAS_MODE_MACHINE = buildCanvasModeMachine(plugins);
}

/**
 * Gets the current canvas mode machine.
 */
export function getCanvasModeMachine(): CanvasModeMachineDefinition {
  return CANVAS_MODE_MACHINE;
}

const getStateDefinition = (mode: CanvasMode): CanvasModeStateConfig => {
  const machine = getCanvasModeMachine();
  return machine.states[mode] ?? {
    ...machine.defaultState,
    id: mode,
  };
};

export const getCanvasModeDefinition = (mode: CanvasMode): CanvasModeStateConfig => getStateDefinition(mode);

export const getCanvasModeResources = (mode: CanvasMode): CanvasModeResources => {
  const definition = getStateDefinition(mode);
  return {
    plugins: definition.resources?.plugins && definition.resources.plugins.length > 0
      ? definition.resources.plugins
      : [mode],
    listeners: definition.resources?.listeners ?? [],
    overlays: definition.resources?.overlays ?? [],
  };
};

const collectActions = (
  from: CanvasModeStateConfig,
  to: CanvasModeStateConfig,
  reason: CanvasModeTransitionResult['reason'],
): CanvasModeLifecycleAction[] => {
  const exitActions = from.exit ?? [];
  const entryActions = to.entry ?? [];
  const globalActions = getCanvasModeMachine().global?.onTransition ?? [];

  if (reason === 'noop') {
    return [];
  }

  return [...exitActions, ...globalActions, ...entryActions];
};

export const transitionCanvasMode = (
  currentMode: CanvasMode,
  event: CanvasModeEvent,
): CanvasModeTransitionResult => {
  const requested = event.value;
  const currentDefinition = getStateDefinition(currentMode);

  if (requested === currentMode) {
    if (currentDefinition.toggleTo && currentDefinition.toggleTo !== currentMode) {
      const fallbackDefinition = getStateDefinition(currentDefinition.toggleTo);
      return {
        changed: true,
        mode: currentDefinition.toggleTo,
        actions: collectActions(currentDefinition, fallbackDefinition, 'toggle-fallback'),
        reason: 'toggle-fallback',
        from: currentMode,
        requested,
      };
    }

    return {
      changed: false,
      mode: currentMode,
      actions: [],
      reason: 'noop',
      from: currentMode,
      requested,
    };
  }

  const transitions = currentDefinition.transitions ?? {};
  const hasWildcard = Object.prototype.hasOwnProperty.call(transitions, '*');
  const isAllowed = transitions[requested] || hasWildcard;

  if (!isAllowed) {
    return {
      changed: false,
      mode: currentMode,
      actions: [],
      reason: 'denied',
      from: currentMode,
      requested,
    };
  }

  const targetDefinition = getStateDefinition(requested);
  return {
    changed: true,
    mode: requested,
    actions: collectActions(currentDefinition, targetDefinition, 'switch'),
    reason: 'switch',
    from: currentMode,
    requested,
  };
};
