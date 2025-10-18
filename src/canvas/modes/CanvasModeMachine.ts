import type { ToolMode } from '../../config/toolDefinitions';

export type CanvasMode = ToolMode | (string & {});

export type CanvasModeLifecycleAction = 'clearGuidelines' | 'clearSubpathSelection';

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

const ALL_KNOWN_MODES: CanvasMode[] = [
  'select',
  'pan',
  'pencil',
  'text',
  'shape',
  'curves',
  'subpath',
  'transformation',
  'edit',
];

const wildcardTransition = { description: 'Permite cambiar a modos registrados dinámicamente por plugins.' };

const defaultState: CanvasModeStateConfig = {
  id: 'select',
  description: 'Modo definido por un plugin externo.',
  transitions: { '*': wildcardTransition },
  resources: { plugins: [], listeners: [], overlays: [] },
};

export const CANVAS_MODE_MACHINE: CanvasModeMachineDefinition = {
  initial: 'select',
  states: ALL_KNOWN_MODES.reduce<Record<string, CanvasModeStateConfig>>((acc, mode) => {
    const baseTransitions: Record<string, { description: string }> = {
      '*': wildcardTransition,
    };

    if (mode === 'select') {
      acc[mode] = {
        id: mode,
        description: 'Herramienta por defecto para seleccionar y manipular elementos.',
        entry: ['clearSubpathSelection'],
        transitions: {
          pan: { description: 'Permite desplazarse por el lienzo.' },
          pencil: { description: 'Activa el dibujo a mano alzada.' },
          text: { description: 'Inserta nuevas cajas de texto.' },
          shape: { description: 'Crea formas geométricas básicas.' },
          transformation: { description: 'Manipula elementos seleccionados.' },
          subpath: { description: 'Permite editar subtrazados individuales.' },
          edit: { description: 'Modifica puntos y controladores de los trazos.' },
          curves: { description: 'Crea curvas paramétricas.' },
          '*': wildcardTransition,
        },
        resources: { plugins: [mode] },
      };
      return acc;
    }

    if (mode === 'transformation' || mode === 'edit' || mode === 'subpath') {
      acc[mode] = {
        id: mode,
        description:
          mode === 'transformation'
            ? 'Manipulación de tamaño, rotación y posición.'
            : mode === 'edit'
              ? 'Edición precisa de nodos y manejadores.'
              : 'Modo para elegir y trabajar con subtrazados.',
        transitions: {
          select: { description: 'Vuelve al modo de selección estándar.' },
          transformation: { description: 'Se puede alternar de vuelta al modo de selección.' },
          edit: { description: 'Intercambia hacia edición de nodos.' },
          subpath: { description: 'Intercambia hacia edición de subtrazados.' },
          pan: { description: 'Permite moverse por el lienzo sin perder el contexto.' },
          '*': wildcardTransition,
        },
        toggleTo: 'select',
        resources: { plugins: [mode] },
      };
      return acc;
    }

    acc[mode] = {
      id: mode,
      description:
        mode === 'pan'
          ? 'Modo para navegar el lienzo.'
          : mode === 'pencil'
            ? 'Dibuja trazos libres con el lápiz.'
            : mode === 'text'
              ? 'Inserta y edita texto.'
              : mode === 'shape'
                ? 'Crea formas básicas.'
                : mode === 'curves'
                  ? 'Define curvas mediante nodos maestros.'
                  : 'Modo personalizado.',
      transitions: baseTransitions,
      resources: { plugins: [mode] },
    };

    return acc;
  }, {}),
  defaultState,
  global: {
    onTransition: ['clearGuidelines'],
  },
};

const getStateDefinition = (mode: CanvasMode): CanvasModeStateConfig => {
  return CANVAS_MODE_MACHINE.states[mode] ?? {
    ...CANVAS_MODE_MACHINE.defaultState,
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
  const globalActions = CANVAS_MODE_MACHINE.global?.onTransition ?? [];

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
