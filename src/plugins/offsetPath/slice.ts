import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../store/canvasStore';

export interface OffsetPathSlice {
  // UI State
  offsetDistance: number;
  offsetJoinType: 'round' | 'miter' | 'bevel';
  offsetMiterLimit: number;
  isApplyingOffset: boolean;
  
  // Actions
  setOffsetDistance: (distance: number) => void;
  setOffsetJoinType: (joinType: 'round' | 'miter' | 'bevel') => void;
  setOffsetMiterLimit: (limit: number) => void;
  canApplyOffset: () => boolean;
  applyOffsetPath: () => void;
}

export const createOffsetPathSlice: StateCreator<
  CanvasStore,
  [],
  [],
  OffsetPathSlice
> = (set, get) => {
  return {
    // Initial state
    offsetDistance: 5,
    offsetJoinType: 'round',
    offsetMiterLimit: 4,
    isApplyingOffset: false,

    // Setters
    setOffsetDistance: (distance: number) => {
      set({ offsetDistance: distance } as Partial<CanvasStore>);
    },

    setOffsetJoinType: (joinType: 'round' | 'miter' | 'bevel') => {
      set({ offsetJoinType: joinType } as Partial<CanvasStore>);
    },

    setOffsetMiterLimit: (limit: number) => {
      set({ offsetMiterLimit: limit } as Partial<CanvasStore>);
    },

    // Check if offset can be applied
    canApplyOffset: () => {
      const state = get();
      const selectedIds = state.selectedIds || [];
      const elements = state.elements || [];
      
      // Can apply offset if:
      // 1. Something is selected
      // 2. Selection includes paths or groups
      if (selectedIds.length === 0) return false;
      
      const hasValidElements = selectedIds.some(id => {
        const element = elements.find(el => el.id === id);
        if (!element) return false;
        return element.type === 'path' || element.type === 'group';
      });
      
      return hasValidElements;
    },

    // Apply offset path operation
    applyOffsetPath: () => {
      const state = get() as CanvasStore & OffsetPathSlice;
      const selectedIds = state.selectedIds || [];
      const elements = state.elements || [];
      const addElement = state.addElement;
      const selectElements = state.selectElements;
      
      if (!addElement || !selectElements) return;
      
      set({ isApplyingOffset: true } as Partial<CanvasStore>);
      
      const offsetDistance = (state as OffsetPathSlice).offsetDistance;
      const offsetJoinType = (state as OffsetPathSlice).offsetJoinType;
      const offsetMiterLimit = (state as OffsetPathSlice).offsetMiterLimit;
      const newElementIds: string[] = [];
      
      // Import the offset utility dynamically
      import('../../utils/pathOffsetUtils').then(({ applyOffsetToPath }) => {
        selectedIds.forEach(id => {
          const element = elements.find(el => el.id === id);
          
          if (element?.type === 'path') {
            const offsetPath = applyOffsetToPath(
              element,
              offsetDistance,
              offsetJoinType,
              offsetMiterLimit
            );
            
            if (offsetPath) {
              const newElementId = addElement(offsetPath);
              newElementIds.push(newElementId);
            }
          } else if (element?.type === 'group') {
            // For groups, recursively offset all paths within
            const groupElement = element;
            const childIds = groupElement.data.childIds || [];
            
            childIds.forEach(childId => {
              const childElement = elements.find(el => el.id === childId);
              if (childElement?.type === 'path') {
                const offsetPath = applyOffsetToPath(
                  childElement,
                  offsetDistance,
                  offsetJoinType,
                  offsetMiterLimit
                );
                
                if (offsetPath) {
                  const newElementId = addElement(offsetPath);
                  newElementIds.push(newElementId);
                }
              }
            });
          }
        });
        
        // Select the newly created offset paths
        if (newElementIds.length > 0) {
          selectElements(newElementIds);
        }
        
        set({ isApplyingOffset: false } as Partial<CanvasStore>);
      }).catch((error) => {
        console.error('Error loading offset path utility:', error);
        set({ isApplyingOffset: false } as Partial<CanvasStore>);
      });
    },
  };
}
