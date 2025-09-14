import { create } from 'zustand';
import type { CanvasState, CanvasElement, Point, Viewport } from '../types';

interface CanvasActions {
  // Element management
  addElement: (element: Omit<CanvasElement, 'id' | 'zIndex'>) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  deleteElement: (id: string) => void;
  deleteSelectedElements: () => void;

  // Viewport
  setViewport: (viewport: Partial<Viewport>) => void;
  pan: (deltaX: number, deltaY: number) => void;
  zoom: (factor: number, centerX?: number, centerY?: number) => void;
  resetPan: () => void;
  resetZoom: () => void;

  // Selection
  selectElement: (id: string, multiSelect?: boolean) => void;
  selectElements: (ids: string[]) => void;
  clearSelection: () => void;
  getSelectedElements: () => CanvasElement[];
  moveSelectedElements: (deltaX: number, deltaY: number) => void;

  // Helper functions for selected elements
  getSelectedPathsCount: () => number;
  getSelectedTextsCount: () => number;

  // Update selected elements properties
  updateSelectedPaths: (properties: Partial<import('../types').PathData>) => void;
  updateSelectedTexts: (properties: Partial<import('../types').TextData>) => void;

  // Order/Z-index management
  bringToFront: () => void;
  sendForward: () => void;
  sendBackward: () => void;
  sendToBack: () => void;

  // Arrange/Alignment
  alignLeft: () => void;
  alignCenter: () => void;
  alignRight: () => void;
  alignTop: () => void;
  alignMiddle: () => void;
  alignBottom: () => void;
  distributeHorizontally: () => void;
  distributeVertically: () => void;

  // Plugin management
  setActivePlugin: (plugin: string | null) => void;
  updatePluginState: <K extends keyof CanvasState['plugins']>(
    plugin: K,
    state: Partial<CanvasState['plugins'][K]>
  ) => void;

  // Pencil actions
  startPath: (point: Point) => void;
  addPointToPath: (point: Point) => void;
  finishPath: () => void;

  // Text actions
  addText: (x: number, y: number, text: string) => void;
}

type CanvasStore = CanvasState & CanvasActions;

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  // Initial state
  elements: [],
  viewport: {
    zoom: 1,
    panX: 0,
    panY: 0,
  },
  plugins: {
    pan: { offsetX: 0, offsetY: 0 },
    zoom: { level: 1 },
    pencil: { strokeWidth: 2, strokeColor: '#000000' },
    text: { text: 'New Text', fontSize: 16, fontFamily: 'Arial', color: '#000000', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none' },
    select: { selectedIds: [] },
    delete: {},
  },
  activePlugin: null,

  // Actions
  addElement: (element) => {
    const id = `element_${Date.now()}_${Math.random()}`;
    const zIndex = get().elements.length;
    set((state) => ({
      elements: [...state.elements, { ...element, id, zIndex }],
    }));
  },

  updateElement: (id, updates) => {
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, ...updates } : el
      ),
    }));
  },

  deleteElement: (id) => {
    set((state) => ({
      elements: state.elements.filter((el) => el.id !== id),
      plugins: {
        ...state.plugins,
        select: {
          ...state.plugins.select,
          selectedIds: state.plugins.select.selectedIds.filter((selId) => selId !== id),
        },
      },
    }));
  },

  deleteSelectedElements: () => {
    const selectedIds = get().plugins.select.selectedIds;
    set((state) => ({
      elements: state.elements.filter((el) => !selectedIds.includes(el.id)),
      plugins: {
        ...state.plugins,
        select: { selectedIds: [] },
      },
    }));
  },

  setViewport: (viewport) => {
    set((state) => ({
      viewport: { ...state.viewport, ...viewport },
    }));
  },

  pan: (deltaX, deltaY) => {
    set((state) => ({
      viewport: {
        ...state.viewport,
        panX: state.viewport.panX + deltaX,
        panY: state.viewport.panY + deltaY,
      },
    }));
  },

  zoom: (factor, centerX = 0, centerY = 0) => {
    set((state) => {
      const newZoom = Math.max(0.1, Math.min(5, state.viewport.zoom * factor));
      const zoomRatio = newZoom / state.viewport.zoom;

      return {
        viewport: {
          ...state.viewport,
          zoom: newZoom,
          panX: centerX - (centerX - state.viewport.panX) * zoomRatio,
          panY: centerY - (centerY - state.viewport.panY) * zoomRatio,
        },
      };
    });
  },

  resetPan: () => {
    set((state) => ({
      viewport: {
        ...state.viewport,
        panX: 0,
        panY: 0,
      },
    }));
  },

  resetZoom: () => {
    set((state) => ({
      viewport: {
        ...state.viewport,
        zoom: 1,
        panX: 0,
        panY: 0,
      },
    }));
  },

  selectElement: (id, multiSelect = false) => {
    set((state) => ({
      plugins: {
        ...state.plugins,
        select: {
          selectedIds: multiSelect
            ? state.plugins.select.selectedIds.includes(id)
              ? state.plugins.select.selectedIds.filter((selId) => selId !== id)
              : [...state.plugins.select.selectedIds, id]
            : [id],
        },
      },
    }));
  },

  selectElements: (ids) => {
    set((state) => ({
      plugins: {
        ...state.plugins,
        select: { selectedIds: ids },
      },
    }));
  },

  clearSelection: () => {
    set((state) => ({
      plugins: {
        ...state.plugins,
        select: { selectedIds: [] },
      },
    }));
  },

  getSelectedElements: () => {
    const state = get();
    return state.elements.filter(el => state.plugins.select.selectedIds.includes(el.id));
  },

  getSelectedPathsCount: () => {
    return get().getSelectedElements().filter(el => el.type === 'path').length;
  },

  getSelectedTextsCount: () => {
    return get().getSelectedElements().filter(el => el.type === 'text').length;
  },

  moveSelectedElements: (deltaX, deltaY) => {
    const selectedIds = get().plugins.select.selectedIds;
    set((state) => ({
      elements: state.elements.map((el) => {
        if (selectedIds.includes(el.id)) {
          if (el.type === 'path') {
            const pathData = el.data as import('../types').PathData;
            return {
              ...el,
              data: {
                ...pathData,
                points: pathData.points.map(point => ({
                  x: point.x + deltaX,
                  y: point.y + deltaY,
                })),
              },
            };
          } else if (el.type === 'text') {
            const textData = el.data as import('../types').TextData;
            return {
              ...el,
              data: {
                ...textData,
                x: textData.x + deltaX,
                y: textData.y + deltaY,
              },
            };
          }
        }
        return el;
      }),
    }));
  },

  updateSelectedPaths: (properties) => {
    const selectedIds = get().plugins.select.selectedIds;
    set((state) => ({
      elements: state.elements.map((el) => {
        if (selectedIds.includes(el.id) && el.type === 'path') {
          const pathData = el.data as import('../types').PathData;
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

  updateSelectedTexts: (properties) => {
    const selectedIds = get().plugins.select.selectedIds;
    set((state) => ({
      elements: state.elements.map((el) => {
        if (selectedIds.includes(el.id) && el.type === 'text') {
          const textData = el.data as import('../types').TextData;
          return {
            ...el,
            data: {
              ...textData,
              ...properties,
            },
          };
        }
        return el;
      }),
    }));
  },

  setActivePlugin: (plugin) => {
    set({ activePlugin: plugin });
  },

  updatePluginState: (plugin, state) => {
    set((current) => ({
      plugins: {
        ...current.plugins,
        [plugin]: { ...current.plugins[plugin], ...state },
      },
    }));
  },

  // Pencil specific
  startPath: (point) => {
    const { strokeWidth, strokeColor } = get().plugins.pencil;
    get().addElement({
      type: 'path',
      data: {
        points: [point],
        strokeWidth,
        strokeColor,
      },
    });
  },

  addPointToPath: (point) => {
    const state = get();
    const lastElement = state.elements[state.elements.length - 1];
    if (lastElement?.type === 'path') {
      const pathData = lastElement.data as import('../types').PathData;
      get().updateElement(lastElement.id, {
        data: {
          ...pathData,
          points: [...pathData.points, point],
        },
      });
    }
  },

  finishPath: () => {
    // Path is already added, nothing special to do
  },

  addText: (x, y, text) => {
    const { fontSize, fontFamily, color, fontWeight, fontStyle, textDecoration } = get().plugins.text;
    get().addElement({
      type: 'text',
      data: {
        x,
        y,
        text,
        fontSize,
        fontFamily,
        color,
        fontWeight,
        fontStyle,
        textDecoration,
      },
    });
  },

  // Order/Z-index management
  bringToFront: () => {
    const selectedIds = get().plugins.select.selectedIds;
    if (selectedIds.length === 0) return;

    const maxZIndex = Math.max(...get().elements.map(el => el.zIndex));
    set((state) => ({
      elements: state.elements.map((el, index) => {
        if (selectedIds.includes(el.id)) {
          return { ...el, zIndex: maxZIndex + index + 1 };
        }
        return el;
      }),
    }));
  },

  sendForward: () => {
    const selectedIds = get().plugins.select.selectedIds;
    if (selectedIds.length === 0) return;

    set((state) => {
      const elements = [...state.elements].sort((a, b) => a.zIndex - b.zIndex);
      const newElements = [...elements];

      selectedIds.forEach(selectedId => {
        const currentIndex = newElements.findIndex(el => el.id === selectedId);
        if (currentIndex < newElements.length - 1) {
          // Swap with next element
          const temp = newElements[currentIndex];
          newElements[currentIndex] = newElements[currentIndex + 1];
          newElements[currentIndex + 1] = temp;
        }
      });

      return { elements: newElements };
    });
  },

  sendBackward: () => {
    const selectedIds = get().plugins.select.selectedIds;
    if (selectedIds.length === 0) return;

    set((state) => {
      const elements = [...state.elements].sort((a, b) => a.zIndex - b.zIndex);
      const newElements = [...elements];

      selectedIds.forEach(selectedId => {
        const currentIndex = newElements.findIndex(el => el.id === selectedId);
        if (currentIndex > 0) {
          // Swap with previous element
          const temp = newElements[currentIndex];
          newElements[currentIndex] = newElements[currentIndex - 1];
          newElements[currentIndex - 1] = temp;
        }
      });

      return { elements: newElements };
    });
  },

  sendToBack: () => {
    const selectedIds = get().plugins.select.selectedIds;
    if (selectedIds.length === 0) return;

    const minZIndex = Math.min(...get().elements.map(el => el.zIndex));
    set((state) => ({
      elements: state.elements.map((el, index) => {
        if (selectedIds.includes(el.id)) {
          return { ...el, zIndex: minZIndex - index - 1 };
        }
        return el;
      }),
    }));
  },

  // Arrange/Alignment functions
  alignLeft: () => {
    const selectedElements = get().getSelectedElements();
    if (selectedElements.length < 2) return;

    const minX = Math.min(...selectedElements.map(el => {
      if (el.type === 'path') {
        const points = (el.data as import('../types').PathData).points;
        return Math.min(...points.map(p => p.x));
      } else if (el.type === 'text') {
        return (el.data as import('../types').TextData).x;
      }
      return 0;
    }));

    set((state) => ({
      elements: state.elements.map(el => {
        if (get().plugins.select.selectedIds.includes(el.id)) {
          if (el.type === 'path') {
            const pathData = el.data as import('../types').PathData;
            const currentMinX = Math.min(...pathData.points.map(p => p.x));
            const deltaX = minX - currentMinX;
            return {
              ...el,
              data: {
                ...pathData,
                points: pathData.points.map(p => ({ x: p.x + deltaX, y: p.y })),
              },
            };
          } else if (el.type === 'text') {
            const textData = el.data as import('../types').TextData;
            return {
              ...el,
              data: {
                ...textData,
                x: minX,
              },
            };
          }
        }
        return el;
      }),
    }));
  },

  alignCenter: () => {
    const selectedElements = get().getSelectedElements();
    if (selectedElements.length < 2) return;

    const centers = selectedElements.map(el => {
      if (el.type === 'path') {
        const points = (el.data as import('../types').PathData).points;
        const minX = Math.min(...points.map(p => p.x));
        const maxX = Math.max(...points.map(p => p.x));
        return (minX + maxX) / 2;
      } else if (el.type === 'text') {
        return (el.data as import('../types').TextData).x;
      }
      return 0;
    });

    const targetCenter = centers.reduce((sum, center) => sum + center, 0) / centers.length;

    set((state) => ({
      elements: state.elements.map((el, index) => {
        if (get().plugins.select.selectedIds.includes(el.id)) {
          const currentCenter = centers[index];
          const deltaX = targetCenter - currentCenter;

          if (el.type === 'path') {
            const pathData = el.data as import('../types').PathData;
            return {
              ...el,
              data: {
                ...pathData,
                points: pathData.points.map(p => ({ x: p.x + deltaX, y: p.y })),
              },
            };
          } else if (el.type === 'text') {
            const textData = el.data as import('../types').TextData;
            return {
              ...el,
              data: {
                ...textData,
                x: textData.x + deltaX,
              },
            };
          }
        }
        return el;
      }),
    }));
  },

  alignRight: () => {
    const selectedElements = get().getSelectedElements();
    if (selectedElements.length < 2) return;

    const maxX = Math.max(...selectedElements.map(el => {
      if (el.type === 'path') {
        const points = (el.data as import('../types').PathData).points;
        return Math.max(...points.map(p => p.x));
      } else if (el.type === 'text') {
        const textData = el.data as import('../types').TextData;
        return textData.x + textData.text.length * textData.fontSize * 0.6;
      }
      return 0;
    }));

    set((state) => ({
      elements: state.elements.map(el => {
        if (get().plugins.select.selectedIds.includes(el.id)) {
          if (el.type === 'path') {
            const pathData = el.data as import('../types').PathData;
            const currentMaxX = Math.max(...pathData.points.map(p => p.x));
            const deltaX = maxX - currentMaxX;
            return {
              ...el,
              data: {
                ...pathData,
                points: pathData.points.map(p => ({ x: p.x + deltaX, y: p.y })),
              },
            };
          } else if (el.type === 'text') {
            const textData = el.data as import('../types').TextData;
            const currentMaxX = textData.x + textData.text.length * textData.fontSize * 0.6;
            const deltaX = maxX - currentMaxX;
            return {
              ...el,
              data: {
                ...textData,
                x: textData.x + deltaX,
              },
            };
          }
        }
        return el;
      }),
    }));
  },

  alignTop: () => {
    const selectedElements = get().getSelectedElements();
    if (selectedElements.length < 2) return;

    const minY = Math.min(...selectedElements.map(el => {
      if (el.type === 'path') {
        const points = (el.data as import('../types').PathData).points;
        return Math.min(...points.map(p => p.y));
      } else if (el.type === 'text') {
        return (el.data as import('../types').TextData).y - (el.data as import('../types').TextData).fontSize;
      }
      return 0;
    }));

    set((state) => ({
      elements: state.elements.map(el => {
        if (get().plugins.select.selectedIds.includes(el.id)) {
          if (el.type === 'path') {
            const pathData = el.data as import('../types').PathData;
            const currentMinY = Math.min(...pathData.points.map(p => p.y));
            const deltaY = minY - currentMinY;
            return {
              ...el,
              data: {
                ...pathData,
                points: pathData.points.map(p => ({ x: p.x, y: p.y + deltaY })),
              },
            };
          } else if (el.type === 'text') {
            const textData = el.data as import('../types').TextData;
            const currentMinY = textData.y - textData.fontSize;
            const deltaY = minY - currentMinY;
            return {
              ...el,
              data: {
                ...textData,
                y: textData.y + deltaY,
              },
            };
          }
        }
        return el;
      }),
    }));
  },

  alignMiddle: () => {
    const selectedElements = get().getSelectedElements();
    if (selectedElements.length < 2) return;

    const centers = selectedElements.map(el => {
      if (el.type === 'path') {
        const points = (el.data as import('../types').PathData).points;
        const minY = Math.min(...points.map(p => p.y));
        const maxY = Math.max(...points.map(p => p.y));
        return (minY + maxY) / 2;
      } else if (el.type === 'text') {
        return (el.data as import('../types').TextData).y - (el.data as import('../types').TextData).fontSize / 2;
      }
      return 0;
    });

    const targetCenter = centers.reduce((sum, center) => sum + center, 0) / centers.length;

    set((state) => ({
      elements: state.elements.map((el, index) => {
        if (get().plugins.select.selectedIds.includes(el.id)) {
          const currentCenter = centers[index];
          const deltaY = targetCenter - currentCenter;

          if (el.type === 'path') {
            const pathData = el.data as import('../types').PathData;
            return {
              ...el,
              data: {
                ...pathData,
                points: pathData.points.map(p => ({ x: p.x, y: p.y + deltaY })),
              },
            };
          } else if (el.type === 'text') {
            const textData = el.data as import('../types').TextData;
            return {
              ...el,
              data: {
                ...textData,
                y: textData.y + deltaY,
              },
            };
          }
        }
        return el;
      }),
    }));
  },

  alignBottom: () => {
    const selectedElements = get().getSelectedElements();
    if (selectedElements.length < 2) return;

    const maxY = Math.max(...selectedElements.map(el => {
      if (el.type === 'path') {
        const points = (el.data as import('../types').PathData).points;
        return Math.max(...points.map(p => p.y));
      } else if (el.type === 'text') {
        return (el.data as import('../types').TextData).y;
      }
      return 0;
    }));

    set((state) => ({
      elements: state.elements.map(el => {
        if (get().plugins.select.selectedIds.includes(el.id)) {
          if (el.type === 'path') {
            const pathData = el.data as import('../types').PathData;
            const currentMaxY = Math.max(...pathData.points.map(p => p.y));
            const deltaY = maxY - currentMaxY;
            return {
              ...el,
              data: {
                ...pathData,
                points: pathData.points.map(p => ({ x: p.x, y: p.y + deltaY })),
              },
            };
          } else if (el.type === 'text') {
            const textData = el.data as import('../types').TextData;
            const deltaY = maxY - textData.y;
            return {
              ...el,
              data: {
                ...textData,
                y: textData.y + deltaY,
              },
            };
          }
        }
        return el;
      }),
    }));
  },

  distributeHorizontally: () => {
    const selectedElements = get().getSelectedElements();
    if (selectedElements.length < 3) return;

    // Sort elements by their leftmost x position
    const sortedElements = [...selectedElements].sort((a, b) => {
      const aX = a.type === 'path' 
        ? Math.min(...(a.data as import('../types').PathData).points.map(p => p.x))
        : (a.data as import('../types').TextData).x;
      const bX = b.type === 'path' 
        ? Math.min(...(b.data as import('../types').PathData).points.map(p => p.x))
        : (b.data as import('../types').TextData).x;
      return aX - bX;
    });

    const firstElement = sortedElements[0];
    const lastElement = sortedElements[sortedElements.length - 1];

    const startX = firstElement.type === 'path' 
      ? Math.min(...(firstElement.data as import('../types').PathData).points.map(p => p.x))
      : (firstElement.data as import('../types').TextData).x;

    const endX = lastElement.type === 'path' 
      ? Math.max(...(lastElement.data as import('../types').PathData).points.map(p => p.x))
      : (lastElement.data as import('../types').TextData).x + (lastElement.data as import('../types').TextData).text.length * (lastElement.data as import('../types').TextData).fontSize * 0.6;

    const totalWidth = endX - startX;
    const spacing = totalWidth / (sortedElements.length - 1);

    set((state) => ({
      elements: state.elements.map(el => {
        const index = sortedElements.findIndex(sortedEl => sortedEl.id === el.id);
        if (index !== -1 && index > 0 && index < sortedElements.length - 1) {
          const targetX = startX + spacing * index;
          
          if (el.type === 'path') {
            const pathData = el.data as import('../types').PathData;
            const currentMinX = Math.min(...pathData.points.map(p => p.x));
            const deltaX = targetX - currentMinX;
            return {
              ...el,
              data: {
                ...pathData,
                points: pathData.points.map(p => ({ x: p.x + deltaX, y: p.y })),
              },
            };
          } else if (el.type === 'text') {
            const textData = el.data as import('../types').TextData;
            return {
              ...el,
              data: {
                ...textData,
                x: targetX,
              },
            };
          }
        }
        return el;
      }),
    }));
  },

  distributeVertically: () => {
    const selectedElements = get().getSelectedElements();
    if (selectedElements.length < 3) return;

    // Sort elements by their topmost y position
    const sortedElements = [...selectedElements].sort((a, b) => {
      const aY = a.type === 'path' 
        ? Math.min(...(a.data as import('../types').PathData).points.map(p => p.y))
        : (a.data as import('../types').TextData).y - (a.data as import('../types').TextData).fontSize;
      const bY = b.type === 'path' 
        ? Math.min(...(b.data as import('../types').PathData).points.map(p => p.y))
        : (b.data as import('../types').TextData).y - (b.data as import('../types').TextData).fontSize;
      return aY - bY;
    });

    const firstElement = sortedElements[0];
    const lastElement = sortedElements[sortedElements.length - 1];

    const startY = firstElement.type === 'path' 
      ? Math.min(...(firstElement.data as import('../types').PathData).points.map(p => p.y))
      : (firstElement.data as import('../types').TextData).y - (firstElement.data as import('../types').TextData).fontSize;

    const endY = lastElement.type === 'path' 
      ? Math.max(...(lastElement.data as import('../types').PathData).points.map(p => p.y))
      : (lastElement.data as import('../types').TextData).y;

    const totalHeight = endY - startY;
    const spacing = totalHeight / (sortedElements.length - 1);

    set((state) => ({
      elements: state.elements.map(el => {
        const index = sortedElements.findIndex(sortedEl => sortedEl.id === el.id);
        if (index !== -1 && index > 0 && index < sortedElements.length - 1) {
          const targetY = startY + spacing * index;
          
          if (el.type === 'path') {
            const pathData = el.data as import('../types').PathData;
            const currentMinY = Math.min(...pathData.points.map(p => p.y));
            const deltaY = targetY - currentMinY;
            return {
              ...el,
              data: {
                ...pathData,
                points: pathData.points.map(p => ({ x: p.x, y: p.y + deltaY })),
              },
            };
          } else if (el.type === 'text') {
            const textData = el.data as import('../types').TextData;
            const currentMinY = textData.y - textData.fontSize;
            const deltaY = targetY - currentMinY;
            return {
              ...el,
              data: {
                ...textData,
                y: textData.y + deltaY,
              },
            };
          }
        }
        return el;
      }),
    }));
  },
}));