import type { StateCreator } from 'zustand';
import type { CanvasElement } from '../../../types';
import type { CanvasStore } from '../../canvasStore';
import { translatePathData } from '../../../utils/transformationUtils';
import { measurePath } from '../../../utils/measurementUtils';

export interface SelectionSlice {
  // State
  selectedIds: string[];
  draggingElements: {
    isDragging: boolean;
    initialBounds: { minX: number; minY: number; maxX: number; maxY: number };
    startX: number;
    startY: number;
    currentX?: number;
    currentY?: number;
    deltaX?: number;
    deltaY?: number;
    previousDeltaX?: number;
    previousDeltaY?: number;
  } | null;

  // Actions
  selectElement: (id: string, multiSelect?: boolean) => void;
  selectElements: (ids: string[]) => void;
  clearSelection: () => void;
  getSelectedElements: () => CanvasElement[];
  getSelectedPathsCount: () => number;
  moveSelectedElements: (deltaX: number, deltaY: number) => void;
  updateSelectedPaths: (properties: Partial<import('../../../types').PathData>) => void;

  // Drag actions
  startDraggingElements: (canvasX: number, canvasY: number) => void;
  updateDraggingElements: (canvasX: number, canvasY: number) => void;
  stopDraggingElements: () => void;
}

export const createSelectionSlice: StateCreator<CanvasStore, [], [], SelectionSlice> = (set, get, _api) => ({
  // Initial state
  selectedIds: [],
  draggingElements: null,

  // Actions
  selectElement: (id, multiSelect = false) => {
    set((state) => {
      const fullState = state as CanvasStore; // Cast to access cross-slice properties
      
      // In select mode, when selecting a different path, clear subpath selection
      if (fullState.activePlugin === 'select' && !multiSelect) {
        const currentlySelectedPaths = fullState.selectedIds.filter((selId: string) => {
          const element = fullState.elements.find((el: CanvasElement) => el.id === selId);
          return element && element.type === 'path';
        });
        
        const newElement = fullState.elements.find((el: CanvasElement) => el.id === id);
        const isSelectingDifferentPath = newElement && newElement.type === 'path' && 
          currentlySelectedPaths.length > 0 && !currentlySelectedPaths.includes(id);
        
        if (isSelectingDifferentPath) {
          fullState.selectedSubpaths = [];
        }
      }

      return {
        selectedIds: multiSelect
          ? state.selectedIds.includes(id)
            ? state.selectedIds.filter((selId: string) => selId !== id)
            : [...state.selectedIds, id]
          : [id],
      };
    });
    
    // Auto-reset optical alignment on selection change
    const currentState = get() as CanvasStore;
    currentState.autoResetOnSelectionChange();
  },

  selectElements: (ids) => {
    set({ selectedIds: ids });
    // Auto-reset optical alignment on selection change
    const currentState = get() as CanvasStore;
    currentState.autoResetOnSelectionChange();
  },

  clearSelection: () => {
    set({ selectedIds: [] });
    // Auto-reset optical alignment on selection change
    const currentState = get() as CanvasStore;
    currentState.autoResetOnSelectionChange();
  },

  getSelectedElements: () => {
    const state = get() as CanvasStore;
    return state.elements.filter((el: CanvasElement) => state.selectedIds.includes(el.id));
  },

  getSelectedPathsCount: () => {
    const state = get() as CanvasStore;
    return state.elements.filter((el: CanvasElement) => state.selectedIds.includes(el.id) && el.type === 'path').length;
  },

  moveSelectedElements: (deltaX, deltaY) => {
    const selectedIds = get().selectedIds;
    const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
    setStore((currentState) => ({
      elements: currentState.elements.map((el: CanvasElement) => {
        if (selectedIds.includes(el.id)) {
          if (el.type === 'path') {
            const pathData = el.data as import('../../../types').PathData;
            return {
              ...el,
              data: translatePathData(pathData, deltaX, deltaY)
            };
          }
        }
        return el;
      }),
    }));
    
    // Auto-reset optical alignment on element movement
    const currentState = get() as CanvasStore;
    currentState.autoResetOnSelectionChange();
  },

  updateSelectedPaths: (properties) => {
    const selectedIds = get().selectedIds;
    const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
    setStore((currentState) => ({
      elements: currentState.elements.map((el: CanvasElement) => {
        if (selectedIds.includes(el.id) && el.type === 'path') {
          const pathData = el.data as import('../../../types').PathData;
          return {
            ...el,
            data: {
              ...pathData,
              ...properties,
            },
          };
        }
        return el;
      }),
    }));
  },

  // Drag actions
  startDraggingElements: (canvasX: number, canvasY: number) => {
    const state = get() as CanvasStore;
    const selectedIds = get().selectedIds;

    if (selectedIds.length === 0) return;

    // Calculate combined bounds of selected elements
    const initialBounds = {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity
    };

    selectedIds.forEach(id => {
      const element = state.elements.find(el => el.id === id);
      if (element && element.type === 'path') {
        const pathData = element.data as import('../../../types').PathData;
        const bounds = measurePath(pathData.subPaths, pathData.strokeWidth || 1, state.viewport.zoom);
        initialBounds.minX = Math.min(initialBounds.minX, bounds.minX);
        initialBounds.minY = Math.min(initialBounds.minY, bounds.minY);
        initialBounds.maxX = Math.max(initialBounds.maxX, bounds.maxX);
        initialBounds.maxY = Math.max(initialBounds.maxY, bounds.maxY);
      }
    });

    set({
      draggingElements: {
        isDragging: true,
        initialBounds,
        startX: canvasX,
        startY: canvasY,
        previousDeltaX: 0,
        previousDeltaY: 0
      }
    });
  },

  updateDraggingElements: (canvasX: number, canvasY: number) => {
    const draggingElements = get().draggingElements;

    if (!draggingElements?.isDragging) return;

    const deltaX = canvasX - draggingElements.startX;
    const deltaY = canvasY - draggingElements.startY;

    // Calculate incremental delta (unsnapped)
    const incrementalDeltaX = deltaX - (draggingElements.previousDeltaX || 0);
    const incrementalDeltaY = deltaY - (draggingElements.previousDeltaY || 0);

    // Move elements with incremental delta
    get().moveSelectedElements(incrementalDeltaX, incrementalDeltaY);

    // Update dragging state
    set((currentState) => ({
      draggingElements: currentState.draggingElements ? {
        ...currentState.draggingElements,
        currentX: canvasX,
        currentY: canvasY,
        deltaX,
        deltaY,
        previousDeltaX: deltaX,
        previousDeltaY: deltaY
      } : null
    }));
  },

  stopDraggingElements: () => {
    set({ draggingElements: null });
    // Auto-reset optical alignment on element movement completion
    const currentState = get() as CanvasStore;
    currentState.autoResetOnSelectionChange();
  },
});