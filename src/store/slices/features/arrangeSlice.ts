import type { StateCreator } from 'zustand';
import type { CanvasElement } from '../../../types';
import { measureText, measurePath } from '../../../utils/measurementUtils';

export interface ArrangeSlice {
  // Actions
  alignLeft: () => void;
  alignCenter: () => void;
  alignRight: () => void;
  alignTop: () => void;
  alignMiddle: () => void;
  alignBottom: () => void;
  distributeHorizontally: () => void;
  distributeVertically: () => void;
}

export const createArrangeSlice: StateCreator<ArrangeSlice> = (set, get, _api) => ({
  // Actions
  alignLeft: () => {
    const fullState = get() as any;
    const selectedElements = fullState.elements.filter((el: CanvasElement) => fullState.selectedIds.includes(el.id));
    if (selectedElements.length < 2) return;

    const minX = Math.min(...selectedElements.map((el: CanvasElement) => {
      if (el.type === 'path') {
        const pathData = el.data as import('../../../types').PathData;
        const bounds = measurePath(pathData.points, pathData.strokeWidth, fullState.viewport.zoom);
        return bounds.minX;
      } else if (el.type === 'text') {
        const textData = el.data as import('../../../types').TextData;
        return textData.x;
      }
      return 0;
    }));

    (set as any)((state: any) => ({
      elements: state.elements.map((el: CanvasElement) => {
        if (fullState.selectedIds.includes(el.id)) {
          if (el.type === 'path') {
            const pathData = el.data as import('../../../types').PathData;
            const currentBounds = measurePath(pathData.points, pathData.strokeWidth, fullState.viewport.zoom);
            const deltaX = minX - currentBounds.minX;
            return {
              ...el,
              data: {
                ...pathData,
                points: pathData.points.map(p => ({ x: p.x + deltaX, y: p.y })),
              },
            };
          } else if (el.type === 'text') {
            const textData = el.data as import('../../../types').TextData;
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
    const fullState = get() as any;
    const selectedElements = fullState.elements.filter((el: CanvasElement) => fullState.selectedIds.includes(el.id));
    if (selectedElements.length < 2) return;

    const centers = selectedElements.map((el: CanvasElement) => {
      if (el.type === 'path') {
        const pathData = el.data as import('../../../types').PathData;
        const bounds = measurePath(pathData.points, pathData.strokeWidth, fullState.viewport.zoom);
        return (bounds.minX + bounds.maxX) / 2;
      } else if (el.type === 'text') {
        const textData = el.data as import('../../../types').TextData;
        const dimensions = measureText(
          textData.text,
          textData.fontSize,
          textData.fontFamily,
          textData.fontWeight,
          textData.fontStyle,
          textData.textDecoration,
          fullState.viewport.zoom
        );
        return textData.x + dimensions.width / 2;
      }
      return 0;
    });

    const targetCenter = centers.reduce((sum: number, center: number) => sum + center, 0) / centers.length;

    (set as any)((state: any) => ({
      elements: state.elements.map((el: CanvasElement, index: number) => {
        if (fullState.selectedIds.includes(el.id)) {
          const currentCenter = centers[index];
          const deltaX = targetCenter - currentCenter;

          if (el.type === 'path') {
            const pathData = el.data as import('../../../types').PathData;
            return {
              ...el,
              data: {
                ...pathData,
                points: pathData.points.map(p => ({ x: p.x + deltaX, y: p.y })),
              },
            };
          } else if (el.type === 'text') {
            const textData = el.data as import('../../../types').TextData;
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
    const fullState = get() as any;
    const selectedElements = fullState.elements.filter((el: CanvasElement) => fullState.selectedIds.includes(el.id));
    if (selectedElements.length < 2) return;

    const maxX = Math.max(...selectedElements.map((el: CanvasElement) => {
      if (el.type === 'path') {
        const pathData = el.data as import('../../../types').PathData;
        const bounds = measurePath(pathData.points, pathData.strokeWidth, fullState.viewport.zoom);
        return bounds.maxX;
      } else if (el.type === 'text') {
        const textData = el.data as import('../../../types').TextData;
        const dimensions = measureText(
          textData.text,
          textData.fontSize,
          textData.fontFamily,
          textData.fontWeight,
          textData.fontStyle,
          textData.textDecoration,
          fullState.viewport.zoom
        );
        return textData.x + dimensions.width;
      }
      return 0;
    }));

    (set as any)((state: any) => ({
      elements: state.elements.map((el: CanvasElement) => {
        if (fullState.selectedIds.includes(el.id)) {
          if (el.type === 'path') {
            const pathData = el.data as import('../../../types').PathData;
            const currentBounds = measurePath(pathData.points, pathData.strokeWidth, fullState.viewport.zoom);
            const deltaX = maxX - currentBounds.maxX;
            return {
              ...el,
              data: {
                ...pathData,
                points: pathData.points.map(p => ({ x: p.x + deltaX, y: p.y })),
              },
            };
          } else if (el.type === 'text') {
            const textData = el.data as import('../../../types').TextData;
            const dimensions = measureText(
              textData.text,
              textData.fontSize,
              textData.fontFamily,
              textData.fontWeight,
              textData.fontStyle,
              textData.textDecoration,
              fullState.viewport.zoom
            );
            const currentMaxX = textData.x + dimensions.width;
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
    const fullState = get() as any;
    const selectedElements = fullState.elements.filter((el: CanvasElement) => fullState.selectedIds.includes(el.id));
    if (selectedElements.length < 2) return;

    const minY = Math.min(...selectedElements.map((el: CanvasElement) => {
      if (el.type === 'path') {
        const pathData = el.data as import('../../../types').PathData;
        const bounds = measurePath(pathData.points, pathData.strokeWidth, fullState.viewport.zoom);
        return bounds.minY;
      } else if (el.type === 'text') {
        const textData = el.data as import('../../../types').TextData;
        const dimensions = measureText(
          textData.text,
          textData.fontSize,
          textData.fontFamily,
          textData.fontWeight,
          textData.fontStyle,
          textData.textDecoration,
          fullState.viewport.zoom
        );
        return textData.y - dimensions.height;
      }
      return 0;
    }));

    (set as any)((state: any) => ({
      elements: state.elements.map((el: CanvasElement) => {
        if (fullState.selectedIds.includes(el.id)) {
          if (el.type === 'path') {
            const pathData = el.data as import('../../../types').PathData;
            const currentBounds = measurePath(pathData.points, pathData.strokeWidth, fullState.viewport.zoom);
            const deltaY = minY - currentBounds.minY;
            return {
              ...el,
              data: {
                ...pathData,
                points: pathData.points.map(p => ({ x: p.x, y: p.y + deltaY })),
              },
            };
          } else if (el.type === 'text') {
            const textData = el.data as import('../../../types').TextData;
            const dimensions = measureText(
              textData.text,
              textData.fontSize,
              textData.fontFamily,
              textData.fontWeight,
              textData.fontStyle,
              textData.textDecoration,
              fullState.viewport.zoom
            );
            const currentMinY = textData.y - dimensions.height;
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
    const fullState = get() as any;
    const selectedElements = fullState.elements.filter((el: CanvasElement) => fullState.selectedIds.includes(el.id));
    if (selectedElements.length < 2) return;

    const centers = selectedElements.map((el: CanvasElement) => {
      if (el.type === 'path') {
        const pathData = el.data as import('../../../types').PathData;
        const bounds = measurePath(pathData.points, pathData.strokeWidth, fullState.viewport.zoom);
        return (bounds.minY + bounds.maxY) / 2;
      } else if (el.type === 'text') {
        const textData = el.data as import('../../../types').TextData;
        const dimensions = measureText(
          textData.text,
          textData.fontSize,
          textData.fontFamily,
          textData.fontWeight,
          textData.fontStyle,
          textData.textDecoration,
          fullState.viewport.zoom
        );
        return textData.y - dimensions.height / 2;
      }
      return 0;
    });

    const targetCenter = centers.reduce((sum: number, center: number) => sum + center, 0) / centers.length;

    (set as any)((state: any) => ({
      elements: state.elements.map((el: CanvasElement, index: number) => {
        if (fullState.selectedIds.includes(el.id)) {
          const currentCenter = centers[index];
          const deltaY = targetCenter - currentCenter;

          if (el.type === 'path') {
            const pathData = el.data as import('../../../types').PathData;
            return {
              ...el,
              data: {
                ...pathData,
                points: pathData.points.map(p => ({ x: p.x, y: p.y + deltaY })),
              },
            };
          } else if (el.type === 'text') {
            const textData = el.data as import('../../../types').TextData;
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
    const fullState = get() as any;
    const selectedElements = fullState.elements.filter((el: CanvasElement) => fullState.selectedIds.includes(el.id));
    if (selectedElements.length < 2) return;

    const maxY = Math.max(...selectedElements.map((el: CanvasElement) => {
      if (el.type === 'path') {
        const pathData = el.data as import('../../../types').PathData;
        const bounds = measurePath(pathData.points, pathData.strokeWidth, fullState.viewport.zoom);
        return bounds.maxY;
      } else if (el.type === 'text') {
        const textData = el.data as import('../../../types').TextData;
        return textData.y;
      }
      return 0;
    }));

    (set as any)((state: any) => ({
      elements: state.elements.map((el: CanvasElement) => {
        if (fullState.selectedIds.includes(el.id)) {
          if (el.type === 'path') {
            const pathData = el.data as import('../../../types').PathData;
            const currentBounds = measurePath(pathData.points, pathData.strokeWidth, fullState.viewport.zoom);
            const deltaY = maxY - currentBounds.maxY;
            return {
              ...el,
              data: {
                ...pathData,
                points: pathData.points.map(p => ({ x: p.x, y: p.y + deltaY })),
              },
            };
          } else if (el.type === 'text') {
            const textData = el.data as import('../../../types').TextData;
            return {
              ...el,
              data: {
                ...textData,
                y: maxY,
              },
            };
          }
        }
        return el;
      }),
    }));
  },

  distributeHorizontally: () => {
    // Placeholder - will implement later
    console.log('distributeHorizontally called');
  },

  distributeVertically: () => {
    // Placeholder - will implement later
    console.log('distributeVertically called');
  },
});