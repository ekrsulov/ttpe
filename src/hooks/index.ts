// Centralized hooks exports
// This makes imports cleaner: import { useLocalStorage, useMenuColors } from '../hooks';

// UI/UX hooks
export { useAnimatedBackground } from './useAnimatedBackground';
export { useColorModeSync } from './useColorModeSync';
export { useDragResize } from './useDragResize';
export { useIOSSupport } from './useIOSSupport';
export { useIsMobile } from './useIsMobile';
export { useMenuColors, useMenuItemStyles } from './useMenuColors';
export { useToolbarColors, usePanelHeaderColors, useCounterColors, usePanelButtonColors, useExpandablePanelColors, useInputColors, useToggleButtonColors } from './useToolbarColors';
export { useRenderCount } from './useRenderCount';
export { useSidebarFooterHeight } from './useSidebarFooterHeight';

// State/Storage hooks
export { useLocalStorage } from './useLocalStorage';
export { useTemporalState } from './useTemporalState';

// Tool/Plugin hooks
export { useDynamicTools } from './useDynamicTools';
export { usePluginPanels } from './usePluginPanels';
export { useSelectionContext } from './useSelectionContext';

// Action hooks (for floating context menu)
export { useAlignmentActions } from './useAlignmentActions';
export { useClipboardActions } from './useClipboardActions';
export { useGroupActions } from './useGroupActions';
export { useFloatingContextMenuActions } from './useFloatingContextMenuActions';

// Canvas/Element hooks  
export { useArrangeHandlers } from './useArrangeHandlers';
export { useDeletionActions } from './useDeletionActions';
export { useFrozenElementsDuringDrag } from './useFrozenElementsDuringDrag';
export { useSelectionBounds } from './useSelectionBounds';
export { useSvgImport } from './useSvgImport';

// Panel hooks
export { usePanelToggleHandlers } from './usePanelToggleHandlers';
export { useSelectPanelActions } from './useSelectPanelActions';

// Utility hooks
export { useDebouncedCallback } from './useDebouncedCallback';
export { useEventCallback } from './useEventCallback';
