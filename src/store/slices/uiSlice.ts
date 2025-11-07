import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../canvasStore';

export interface UiSlice {
  // UI State
  arrangePanelExpanded: boolean;
  editorAdvancedStrokeOpen: boolean;
  editorColorControlsOpen: boolean;
  selectPanelHeight: number;
  sidebarWidth: number;
  showCallerInfo: boolean;
  isDraggingElements: boolean;

  // Actions
  setArrangePanelExpanded: (expanded: boolean) => void;
  setEditorAdvancedStrokeOpen: (open: boolean) => void;
  setEditorColorControlsOpen: (open: boolean) => void;
  setSelectPanelHeight: (height: number) => void;
  setSidebarWidth: (width: number) => void;
  setShowCallerInfo: (show: boolean) => void;
  setIsDraggingElements: (isDragging: boolean) => void;
}

const DEFAULT_PANEL_HEIGHT = 140;

export const createUiSlice: StateCreator<CanvasStore, [], [], UiSlice> = (set) => ({
  // Initial state with localStorage fallback
  arrangePanelExpanded: (() => {
    try {
      const item = localStorage.getItem('arrange-panel-expanded');
      return item ? JSON.parse(item) : import.meta.env.DEV;
    } catch {
      return import.meta.env.DEV;
    }
  })(),

  editorAdvancedStrokeOpen: (() => {
    try {
      const item = localStorage.getItem('editor-advanced-stroke-open');
      return item ? JSON.parse(item) : false;
    } catch {
      return false;
    }
  })(),

  editorColorControlsOpen: (() => {
    try {
      const item = localStorage.getItem('editor-color-controls-open');
      return item ? JSON.parse(item) : import.meta.env.DEV;
    } catch {
      return import.meta.env.DEV;
    }
  })(),

  selectPanelHeight: (() => {
    try {
      const item = localStorage.getItem('select-panel-height');
      return item ? JSON.parse(item) : DEFAULT_PANEL_HEIGHT;
    } catch {
      return DEFAULT_PANEL_HEIGHT;
    }
  })(),

  sidebarWidth: (() => {
    try {
      const item = localStorage.getItem('sidebar-width');
      return item ? JSON.parse(item) : 250;
    } catch {
      return 250;
    }
  })(),

  showCallerInfo: (() => {
    try {
      const item = localStorage.getItem('ttpe-show-caller-info');
      return item ? JSON.parse(item) : false;
    } catch {
      return false;
    }
  })(),

  isDraggingElements: false,

  // Actions
  setArrangePanelExpanded: (expanded) => set({ arrangePanelExpanded: expanded }),
  setEditorAdvancedStrokeOpen: (open) => set({ editorAdvancedStrokeOpen: open }),
  setEditorColorControlsOpen: (open) => set({ editorColorControlsOpen: open }),
  setSelectPanelHeight: (height) => set({ selectPanelHeight: height }),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setShowCallerInfo: (show) => set({ showCallerInfo: show }),
  setIsDraggingElements: (isDragging) => set({ isDraggingElements: isDragging }),
});