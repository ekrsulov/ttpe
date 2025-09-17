import type { StateCreator } from 'zustand';
import type { CanvasElement } from '../../../types';
import { measureText, measurePath } from '../../../utils/measurementUtils';

// Helper function to transform SVG path commands by applying a translation
const transformSvgPath = (d: string, deltaX: number, deltaY: number): string => {
  // Split the path into commands and coordinates
  const commands = d.split(/([MLHVCSQTAZmlhvcsqtaz])/).filter(cmd => cmd.trim() !== '');
  let result = '';
  let i = 0;
  
  while (i < commands.length) {
    const command = commands[i];
    result += command;
    
    // If this is a command that takes coordinates, process the next values
    if ('MLHVCSQTAZmlhvcsqtaz'.indexOf(command) !== -1) {
      i++;
      // Collect all numeric values until the next command
      while (i < commands.length && 'MLHVCSQTAZmlhvcsqtaz'.indexOf(commands[i]) === -1) {
        const coords = commands[i].trim().split(/[\s,]+/).map(parseFloat);
        if (coords.length >= 2) {
          // Apply translation to coordinate pairs
          for (let j = 0; j < coords.length; j += 2) {
            coords[j] += deltaX;     // x coordinate
            coords[j + 1] += deltaY; // y coordinate
          }
          result += ' ' + coords.join(' ');
        }
        i++;
      }
    } else {
      i++;
    }
  }
  
  return result;
};

// Helper interface for element bounds
interface ElementWithBounds {
  element: CanvasElement;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  centerX: number;
  width: number;
  height: number;
}

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
        const bounds = measurePath(pathData.d, pathData.strokeWidth, fullState.viewport.zoom);
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
            const currentBounds = measurePath(pathData.d, pathData.strokeWidth, fullState.viewport.zoom);
            const deltaX = minX - currentBounds.minX;
            return {
              ...el,
              data: {
                ...pathData,
                d: transformSvgPath(pathData.d, deltaX, 0),
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
        const bounds = measurePath(pathData.d, pathData.strokeWidth, fullState.viewport.zoom);
        return (bounds.minX + bounds.maxX) / 2;
      } else if (el.type === 'text') {
        const textData = el.data as import('../../../types').TextData;
        const dimensions = measureText(
          textData.text,
          textData.fontSize,
          textData.fontFamily,
          textData.fontWeight,
          textData.fontStyle,
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
                d: transformSvgPath(pathData.d, deltaX, 0),
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
        const bounds = measurePath(pathData.d, pathData.strokeWidth, fullState.viewport.zoom);
        return bounds.maxX;
      } else if (el.type === 'text') {
        const textData = el.data as import('../../../types').TextData;
        const dimensions = measureText(
          textData.text,
          textData.fontSize,
          textData.fontFamily,
          textData.fontWeight,
          textData.fontStyle,
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
            const currentBounds = measurePath(pathData.d, pathData.strokeWidth, fullState.viewport.zoom);
            const deltaX = maxX - currentBounds.maxX;
            return {
              ...el,
              data: {
                ...pathData,
                d: transformSvgPath(pathData.d, deltaX, 0),
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
        const bounds = measurePath(pathData.d, pathData.strokeWidth, fullState.viewport.zoom);
        return bounds.minY;
      } else if (el.type === 'text') {
        const textData = el.data as import('../../../types').TextData;
        const dimensions = measureText(
          textData.text,
          textData.fontSize,
          textData.fontFamily,
          textData.fontWeight,
          textData.fontStyle,
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
            const currentBounds = measurePath(pathData.d, pathData.strokeWidth, fullState.viewport.zoom);
            const deltaY = minY - currentBounds.minY;
            return {
              ...el,
              data: {
                ...pathData,
                d: transformSvgPath(pathData.d, 0, deltaY),
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
        const bounds = measurePath(pathData.d, pathData.strokeWidth, fullState.viewport.zoom);
        return (bounds.minY + bounds.maxY) / 2;
      } else if (el.type === 'text') {
        const textData = el.data as import('../../../types').TextData;
        const dimensions = measureText(
          textData.text,
          textData.fontSize,
          textData.fontFamily,
          textData.fontWeight,
          textData.fontStyle,
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
                d: transformSvgPath(pathData.d, 0, deltaY),
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
        const bounds = measurePath(pathData.d, pathData.strokeWidth, fullState.viewport.zoom);
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
            const currentBounds = measurePath(pathData.d, pathData.strokeWidth, fullState.viewport.zoom);
            const deltaY = maxY - currentBounds.maxY;
            return {
              ...el,
              data: {
                ...pathData,
                d: transformSvgPath(pathData.d, 0, deltaY),
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
    const fullState = get() as any;
    const selectedElements = fullState.elements.filter((el: CanvasElement) => fullState.selectedIds.includes(el.id));
    if (selectedElements.length < 3) return;

    // Calculate bounds for all selected elements
    const elementBounds: ElementWithBounds[] = [];

    selectedElements.forEach((el: CanvasElement) => {
      if (el.type === 'path') {
        const pathData = el.data as import('../../../types').PathData;
        const bounds = measurePath(pathData.d, pathData.strokeWidth, fullState.viewport.zoom);
        elementBounds.push({
          element: el,
          bounds,
          centerX: (bounds.minX + bounds.maxX) / 2,
          width: bounds.maxX - bounds.minX,
          height: bounds.maxY - bounds.minY
        });
      } else if (el.type === 'text') {
        const textData = el.data as import('../../../types').TextData;
        const dimensions = measureText(
          textData.text,
          textData.fontSize,
          textData.fontFamily,
          textData.fontWeight,
          textData.fontStyle,
          fullState.viewport.zoom
        );
        elementBounds.push({
          element: el,
          bounds: {
            minX: textData.x,
            maxX: textData.x + dimensions.width,
            minY: textData.y - dimensions.height,
            maxY: textData.y
          },
          centerX: textData.x + dimensions.width / 2,
          width: dimensions.width,
          height: dimensions.height
        });
      }
    });

    if (elementBounds.length < 3) return;

    // Sort by current center X position
    elementBounds.sort((a: ElementWithBounds, b: ElementWithBounds) => a.centerX - b.centerX);

    // Calculate the available space between elements
    const leftmost = elementBounds[0].bounds.minX;
    const rightmost = elementBounds[elementBounds.length - 1].bounds.maxX;
    const totalWidth = rightmost - leftmost;
    
    // Calculate total width of all elements
    const totalElementsWidth = elementBounds.reduce((sum, item) => sum + item.width, 0);
    
    // Calculate available space for distribution (excluding element widths)
    const availableSpace = totalWidth - totalElementsWidth;
    const spaceBetween = availableSpace / (elementBounds.length - 1);

    // Calculate positions for each element's left edge
    const positions: number[] = [];
    let currentX = leftmost;
    for (let i = 0; i < elementBounds.length; i++) {
      positions.push(currentX);
      currentX += elementBounds[i].width + spaceBetween;
    }

    (set as any)((state: any) => ({
      elements: state.elements.map((el: CanvasElement) => {
        const boundItemIndex = elementBounds.findIndex((item: ElementWithBounds) => item.element.id === el.id);
        if (boundItemIndex !== -1) {
          const boundItem = elementBounds[boundItemIndex];
          const targetLeftX = positions[boundItemIndex];
          const currentLeftX = boundItem.bounds.minX;
          const deltaX = targetLeftX - currentLeftX;

          if (el.type === 'path') {
            const pathData = el.data as import('../../../types').PathData;
            return {
              ...el,
              data: {
                ...pathData,
                d: transformSvgPath(pathData.d, deltaX, 0),
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

  distributeVertically: () => {
    const fullState = get() as any;
    const selectedElements = fullState.elements.filter((el: CanvasElement) => fullState.selectedIds.includes(el.id));
    if (selectedElements.length < 3) return;

    // Calculate bounds for all selected elements
    const elementBounds: ElementWithBounds[] = [];

    selectedElements.forEach((el: CanvasElement) => {
      if (el.type === 'path') {
        const pathData = el.data as import('../../../types').PathData;
        const bounds = measurePath(pathData.d, pathData.strokeWidth, fullState.viewport.zoom);
        elementBounds.push({
          element: el,
          bounds,
          centerX: (bounds.minX + bounds.maxX) / 2,
          width: bounds.maxX - bounds.minX,
          height: bounds.maxY - bounds.minY
        });
      } else if (el.type === 'text') {
        const textData = el.data as import('../../../types').TextData;
        const dimensions = measureText(
          textData.text,
          textData.fontSize,
          textData.fontFamily,
          textData.fontWeight,
          textData.fontStyle,
          fullState.viewport.zoom
        );
        elementBounds.push({
          element: el,
          bounds: {
            minX: textData.x,
            maxX: textData.x + dimensions.width,
            minY: textData.y - dimensions.height,
            maxY: textData.y
          },
          centerX: textData.x + dimensions.width / 2,
          width: dimensions.width,
          height: dimensions.height
        });
      }
    });

    if (elementBounds.length < 3) return;

    // Sort by current center Y position
    elementBounds.sort((a: ElementWithBounds, b: ElementWithBounds) => {
      const centerY_a = (a.bounds.minY + a.bounds.maxY) / 2;
      const centerY_b = (b.bounds.minY + b.bounds.maxY) / 2;
      return centerY_a - centerY_b;
    });

    // Calculate the available space between elements
    const topmost = elementBounds[0].bounds.minY;
    const bottommost = elementBounds[elementBounds.length - 1].bounds.maxY;
    const totalHeight = bottommost - topmost;
    
    // Calculate total height of all elements
    const totalElementsHeight = elementBounds.reduce((sum, item) => {
      const height = item.bounds.maxY - item.bounds.minY;
      return sum + height;
    }, 0);
    
    // Calculate available space for distribution (excluding element heights)
    const availableSpace = totalHeight - totalElementsHeight;
    const spaceBetween = availableSpace / (elementBounds.length - 1);

    // Calculate positions for each element's top edge
    const positions: number[] = [];
    let currentY = topmost;
    for (let i = 0; i < elementBounds.length; i++) {
      positions.push(currentY);
      const elementHeight = elementBounds[i].bounds.maxY - elementBounds[i].bounds.minY;
      currentY += elementHeight + spaceBetween;
    }

    (set as any)((state: any) => ({
      elements: state.elements.map((el: CanvasElement) => {
        const boundItemIndex = elementBounds.findIndex((item: ElementWithBounds) => item.element.id === el.id);
        if (boundItemIndex !== -1) {
          const boundItem = elementBounds[boundItemIndex];
          const targetTopY = positions[boundItemIndex];
          const currentTopY = boundItem.bounds.minY;
          const deltaY = targetTopY - currentTopY;

          if (el.type === 'path') {
            const pathData = el.data as import('../../../types').PathData;
            return {
              ...el,
              data: {
                ...pathData,
                d: transformSvgPath(pathData.d, 0, deltaY),
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
});