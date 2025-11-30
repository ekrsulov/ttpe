// Centralized hooks exports
// This makes imports cleaner: import { useLocalStorage, useMenuColors } from '../hooks';

// UI/UX hooks
export { useAnimatedBackground } from './useAnimatedBackground';
export { useColorModeSync } from './useColorModeSync';
export { useDragResize } from './useDragResize';
export { useIOSSupport } from './useIOSSupport';
export { useResponsive } from './useResponsive';

// Layout hooks
export { useEffectiveSidebarWidth, useSidebarLayout } from './useSidebarLayout';
export { useSidebarState, useToolbarPositionStyles } from './useSidebarState';
export { useMenuColors, useMenuItemStyles } from './useMenuColors';
export { useToolbarColors, usePanelHeaderColors, useCounterColors, usePanelButtonColors, useExpandablePanelColors, useInputColors, useToggleButtonColors, useActiveToolColors } from './useToolbarColors';
export { useRenderCount } from './useRenderCount';
export { useSidebarFooterHeight } from './useSidebarFooterHeight';

// Unified theme colors (new consolidated hook)
export { useThemeColors, NO_FOCUS_STYLES, NO_FOCUS_STYLES_DEEP } from './useThemeColors';

// State/Storage hooks
export { useLocalStorage } from './useLocalStorage';
export { useTemporalState } from './useTemporalState';

// Tool/Plugin hooks
export { useDynamicTools } from './useDynamicTools';
export { useEnabledPlugins } from './useEnabledPlugins';
export { usePluginPanels } from './usePluginPanels';
export { useSelectionContext } from './useSelectionContext';
export { useToolbarPosition } from './useToolbarPosition';

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
