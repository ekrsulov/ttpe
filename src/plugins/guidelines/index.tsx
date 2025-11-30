import type { PluginDefinition, PluginSliceFactory, CanvasShortcutContext } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { useCanvasStore } from '../../store/canvasStore';
import { createGuidelinesPluginSlice } from './slice';
import type { GuidelinesPluginSlice } from './slice';
import { GuidelinesPanel } from './GuidelinesPanel';
import { GuidelinesOverlay } from './GuidelinesOverlay';
import type { GuidelinesState } from './types';
import { useGuidelinesAltKey } from './hooks/useGuidelinesAltKey';
import { useGuidelinesHoverElement } from './hooks/useGuidelinesHoverElement';
import { createGuidelinesDragModifier } from './hooks/useGuidelinesDragSnap';
import { createRulersDecorator } from './decorators/RulersDecorator';
import { pluginManager } from '../../utils/pluginManager';

const guidelinesSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slice = createGuidelinesPluginSlice(set as any, get as any, api as any);
  return {
    state: slice,
  };
};

// Type guard for guidelines state
const hasGuidelines = (state: unknown): state is { guidelines: GuidelinesState } => {
  return state !== null && typeof state === 'object' && 'guidelines' in state;
};

export const guidelinesPlugin: PluginDefinition<CanvasStore> = {
  id: 'guidelines',
  metadata: {
    label: 'Guidelines',
    cursor: 'default',
  },
  keyboardShortcuts: {
    // Toggle guidelines (Cmd/Ctrl + G with shift to differentiate from group)
    G: {
      handler: (event: KeyboardEvent, context: CanvasShortcutContext) => {
        // Only handle when Cmd/Ctrl + Shift is pressed (to not conflict with other G shortcuts)
        if (!(event.metaKey || event.ctrlKey) || !event.shiftKey) {
          return;
        }
        const state = context.store.getState();
        if (hasGuidelines(state) && state.guidelines) {
          const updateFn = (state as unknown as { updateGuidelinesState?: (s: Partial<GuidelinesState>) => void }).updateGuidelinesState;
          updateFn?.({ enabled: !state.guidelines.enabled });
        }
      },
      options: { preventDefault: true },
    },
  },
  canvasLayers: [
    {
      id: 'guidelines-overlay',
      placement: 'foreground',
      render: ({
        activePlugin,
        guidelines,
        isDragging,
        editingPoint,
        draggingSelection,
        elements,
        selectedIds,
        viewport,
      }) => {
        // Show guidelines in select mode, edit mode, or when dragging a guide
        const isActiveMode = activePlugin === 'select' || activePlugin === 'edit';
        const isDraggingGuide = guidelines?.isDraggingGuide;
        const isAltHovering = guidelines?.isAltPressed && guidelines?.hoveredElementId;
        
        if (!guidelines?.enabled) {
          return null;
        }

        // Show guidelines when:
        // 1. Dragging elements
        // 2. Dragging a guide from ruler
        // 3. Alt + hovering an element (for measurements)
        // 4. Manual guides should always be visible
        const shouldShowDynamicGuidelines = 
          (isActiveMode && (isDragging || editingPoint?.isDragging || draggingSelection?.isDragging)) ||
          isDraggingGuide ||
          isAltHovering;
        
        const hasManualGuides = guidelines?.manualGuidesEnabled && guidelines?.manualGuides?.length > 0;

        if (!shouldShowDynamicGuidelines && !hasManualGuides) {
          return null;
        }

        return (
          <GuidelinesOverlay
            guidelines={guidelines}
            viewport={viewport}
            elements={elements}
            selectedIds={selectedIds}
          />
        );
      },
    },
  ],
  hooks: [
    {
      id: 'guidelines-alt-key-listener',
      global: true,
      hook: useGuidelinesAltKey,
    },
    {
      id: 'guidelines-hover-element-listener',
      global: true,
      hook: useGuidelinesHoverElement,
    },
  ],
  slices: [guidelinesSliceFactory],
  init: (context) => {
    // Register the element drag modifier for guidelines snapping
    const unregisterDragModifier = pluginManager.registerElementDragModifier(
      createGuidelinesDragModifier(context)
    );
    
    // Register the canvas decorator for rulers
    const unregisterDecorator = pluginManager.registerCanvasDecorator(
      createRulersDecorator()
    );
    
    // Register lifecycle action for clearing guidelines on mode transitions
    const unregisterClearAction = pluginManager.registerLifecycleAction(
      'clearGuidelines',
      () => {
        const state = useCanvasStore.getState();
        state.clearGuidelines?.();
      },
      { global: true } // Run on every mode transition
    );
    
    // Register lifecycle action for element deletion cleanup
    const unregisterDeleteAction = pluginManager.registerLifecycleAction(
      'onElementDeleted',
      () => {
        const state = useCanvasStore.getState();
        state.clearGuidelines?.();
      }
    );
    
    // Register lifecycle action for drag end cleanup
    const unregisterDragEndAction = pluginManager.registerLifecycleAction(
      'onDragEnd',
      () => {
        const state = useCanvasStore.getState();
        state.clearGuidelines?.();
      }
    );
    
    // Return cleanup function
    return () => {
      unregisterDragModifier();
      unregisterDecorator();
      unregisterClearAction();
      unregisterDeleteAction();
      unregisterDragEndAction();
    };
  },
  sidebarPanels: [
    {
      key: 'guidelines',
      condition: (ctx) => ctx.showSettingsPanel,
      component: GuidelinesPanel,
    },
  ],
};

export type { GuidelinesPluginSlice };
export { GuidelinesPanel };
// eslint-disable-next-line react-refresh/only-export-components
export * from './types';
