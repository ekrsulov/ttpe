import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../canvasStore';
import { getStoredValue } from '../../utils/storageHelpers';

export interface UiSlice {
  // UI State
  arrangePanelExpanded: boolean;
  editorAdvancedStrokeOpen: boolean;
  editorColorControlsOpen: boolean;
  selectPanelHeight: number;
  sidebarWidth: number;
  isSidebarPinned: boolean;
  isSidebarOpen: boolean;
  showCallerInfo: boolean;
  isDraggingElements: boolean;

  // Actions
  setArrangePanelExpanded: (expanded: boolean) => void;
  setEditorAdvancedStrokeOpen: (open: boolean) => void;
  setEditorColorControlsOpen: (open: boolean) => void;
  setSelectPanelHeight: (height: number) => void;
  setSidebarWidth: (width: number) => void;
  setIsSidebarPinned: (isPinned: boolean) => void;
  setIsSidebarOpen: (isOpen: boolean) => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  setShowCallerInfo: (show: boolean) => void;
  setIsDraggingElements: (isDragging: boolean) => void;
}

const DEFAULT_PANEL_HEIGHT = 140;
const IS_DEV = import.meta.env.DEV;

export const createUiSlice: StateCreator<CanvasStore, [], [], UiSlice> = (set) => ({
  // Initial state with localStorage fallback (using helper)
  arrangePanelExpanded: getStoredValue('arrange-panel-expanded', IS_DEV),
  editorAdvancedStrokeOpen: getStoredValue('editor-advanced-stroke-open', false),
  editorColorControlsOpen: getStoredValue('editor-color-controls-open', IS_DEV),
  selectPanelHeight: getStoredValue('select-panel-height', DEFAULT_PANEL_HEIGHT),
  sidebarWidth: getStoredValue('sidebar-width', 250),
  isSidebarPinned: IS_DEV, // In dev mode, start pinned; in prod, unpinned
  isSidebarOpen: IS_DEV, // In dev mode, start open; in prod, closed to prevent blocking UI
  showCallerInfo: getStoredValue('ttpe-show-caller-info', false),
  isDraggingElements: false,

  // Actions
  setArrangePanelExpanded: (expanded) => set({ arrangePanelExpanded: expanded }),
  setEditorAdvancedStrokeOpen: (open) => set({ editorAdvancedStrokeOpen: open }),
  setEditorColorControlsOpen: (open) => set({ editorColorControlsOpen: open }),
  setSelectPanelHeight: (height) => set({ selectPanelHeight: height }),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setIsSidebarPinned: (isPinned) => set({ isSidebarPinned: isPinned }),
  setIsSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  openSidebar: () => set({ isSidebarOpen: true }),
  closeSidebar: () => set({ isSidebarOpen: false }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setShowCallerInfo: (show) => set({ showCallerInfo: show }),
  setIsDraggingElements: (isDragging) => set({ isDraggingElements: isDragging }),
});