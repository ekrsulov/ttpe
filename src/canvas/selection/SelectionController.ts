import type {
  CanvasEventBus,
  CanvasKeyboardEventPayload,
  CanvasPointerEventPayload,
} from '../CanvasEventBusContext';

type SelectionControllerListener = (state: SelectionControllerState) => void;

export interface SelectionControllerOptions {
  eventBus: CanvasEventBus;
  selectElement: (id: string, multiSelect?: boolean) => void;
  clearSelection: () => void;
  getSelectedIds: () => string[];
  onStateChange?: SelectionControllerListener;
}

export interface SelectionControllerState {
  isShiftPressed: boolean;
  isCtrlPressed: boolean;
  isMultiSelectActive: boolean;
  lastTargetId: string | null;
}

const SHIFT_KEYS = new Set(['Shift', 'ShiftLeft', 'ShiftRight']);
const CTRL_KEYS = new Set(['Control', 'ControlLeft', 'ControlRight']);
const META_KEYS = new Set(['Meta', 'MetaLeft', 'MetaRight']);

export class SelectionController {
  private readonly eventBus: CanvasEventBus;
  private readonly selectElementAction: SelectionControllerOptions['selectElement'];
  private readonly clearSelectionAction: SelectionControllerOptions['clearSelection'];
  private readonly getSelectedIds: SelectionControllerOptions['getSelectedIds'];
  private readonly listeners: SelectionControllerListener[] = [];

  private unsubscribePointerDown: (() => void) | null = null;
  private unsubscribePointerUp: (() => void) | null = null;
  private unsubscribeKeyboard: (() => void) | null = null;

  private keyUpListener: ((event: KeyboardEvent) => void) | null = null;

  private state: SelectionControllerState = {
    isShiftPressed: false,
    isCtrlPressed: false,
    isMultiSelectActive: false,
    lastTargetId: null,
  };

  constructor({
    eventBus,
    selectElement,
    clearSelection,
    getSelectedIds,
    onStateChange,
  }: SelectionControllerOptions) {
    this.eventBus = eventBus;
    this.selectElementAction = selectElement;
    this.clearSelectionAction = clearSelection;
    this.getSelectedIds = getSelectedIds;

    if (onStateChange) {
      this.listeners.push(onStateChange);
    }

    this.subscribe();
    this.emitState();
  }

  selectElement(id: string) {
    this.selectElementAction(id, this.state.isMultiSelectActive);
  }

  toggleSelection(id: string) {
    this.selectElementAction(id, true);
  }

  clearSelection() {
    if (this.getSelectedIds().length === 0) {
      return;
    }
    this.clearSelectionAction();
  }

  destroy() {
    this.unsubscribePointerDown?.();
    this.unsubscribePointerUp?.();
    this.unsubscribeKeyboard?.();

    if (this.keyUpListener) {
      window.removeEventListener('keyup', this.keyUpListener);
      this.keyUpListener = null;
    }

    this.listeners.length = 0;
  }

  private subscribe() {
    this.unsubscribePointerDown = this.eventBus.subscribe('pointerdown', payload => {
      this.handlePointerEvent(payload);
    });

    this.unsubscribePointerUp = this.eventBus.subscribe('pointerup', payload => {
      this.handlePointerEvent(payload);
    });

    this.unsubscribeKeyboard = this.eventBus.subscribe('keyboard', payload => {
      this.handleKeyboardEvent(payload);
    });

    this.keyUpListener = event => {
      if (SHIFT_KEYS.has(event.key) || SHIFT_KEYS.has(event.code)) {
        this.updateState({ isShiftPressed: false });
      } else if (
        CTRL_KEYS.has(event.key) ||
        CTRL_KEYS.has(event.code) ||
        META_KEYS.has(event.key) ||
        META_KEYS.has(event.code)
      ) {
        this.updateState({ isCtrlPressed: false });
      }
    };

    window.addEventListener('keyup', this.keyUpListener);
  }

  private handlePointerEvent({ target }: CanvasPointerEventPayload) {
    const targetId = this.extractTargetId(target);
    this.updateState({ lastTargetId: targetId });
  }

  private handleKeyboardEvent({ event }: CanvasKeyboardEventPayload) {
    if (SHIFT_KEYS.has(event.key) || SHIFT_KEYS.has(event.code)) {
      this.updateState({ isShiftPressed: true });
      return;
    }

    if (
      CTRL_KEYS.has(event.key) ||
      CTRL_KEYS.has(event.code) ||
      META_KEYS.has(event.key) ||
      META_KEYS.has(event.code)
    ) {
      this.updateState({ isCtrlPressed: true });
    }
  }

  private extractTargetId(target: EventTarget | null): string | null {
    let current: EventTarget | null = target;

    while (current && 'getAttribute' in (current as Element)) {
      const element = current as Element;
      const elementId = element.getAttribute('data-element-id');
      if (elementId) {
        return elementId;
      }
      if (element.tagName.toLowerCase() === 'svg') {
        return 'canvas';
      }
      current = element.parentElement;
    }

    return null;
  }

  private updateState(partial: Partial<SelectionControllerState>) {
    const nextState: SelectionControllerState = {
      ...this.state,
      ...partial,
    };
    nextState.isMultiSelectActive = nextState.isShiftPressed || nextState.isCtrlPressed;

    const hasChanged =
      nextState.isShiftPressed !== this.state.isShiftPressed ||
      nextState.isCtrlPressed !== this.state.isCtrlPressed ||
      nextState.isMultiSelectActive !== this.state.isMultiSelectActive ||
      nextState.lastTargetId !== this.state.lastTargetId;

    if (!hasChanged) {
      return;
    }

    this.state = nextState;
    this.emitState();
  }

  private emitState() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}
