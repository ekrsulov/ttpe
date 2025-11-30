import { useEffect } from 'react';
import { useColorMode } from '@chakra-ui/react';
import { useCanvasStore } from '../store/canvasStore';
import { DEFAULT_STROKE_COLOR_DARK, DEFAULT_STROKE_COLOR_LIGHT } from '../utils/defaultColors';
import type { PathData } from '../types';

/**
 * Hook that handles color mode changes and updates element colors accordingly.
 * Transforms black/white colors when switching between light and dark modes.
 */
export function useColorModeSync() {
  const { colorMode } = useColorMode();

  useEffect(() => {
    const targetStrokeColor = colorMode === 'dark'
      ? DEFAULT_STROKE_COLOR_DARK
      : DEFAULT_STROKE_COLOR_LIGHT;
    const state = useCanvasStore.getState();
    const currentDefault = state.settings.defaultStrokeColor;

    if (currentDefault === targetStrokeColor) {
      return;
    }

    // Update default stroke color
    state.updateSettings?.({ defaultStrokeColor: targetStrokeColor });

    // Update pencil state if it matches the old default
    if (state.pencil && state.updatePencilState && state.pencil.strokeColor === currentDefault) {
      state.updatePencilState({ strokeColor: targetStrokeColor });
    }

    // Update all existing path elements that have white/black colors
    const oldDefaultColor = colorMode === 'dark' ? DEFAULT_STROKE_COLOR_LIGHT : DEFAULT_STROKE_COLOR_DARK;
    const transformColor = (color: string): string => {
      if (colorMode === 'dark') {
        if (color === '#ffffff') return '#000000';
        if (color === '#000000') return '#ffffff';
      } else {
        if (color === '#000000') return '#ffffff';
        if (color === '#ffffff') return '#000000';
      }
      return color;
    };

    state.elements.forEach(element => {
      if (element.type === 'path') {
        const pathData = element.data as PathData;
        const updates: Partial<PathData> = {};

        if (pathData.strokeColor === oldDefaultColor) {
          updates.strokeColor = targetStrokeColor;
        } else if (pathData.strokeColor === '#ffffff' || pathData.strokeColor === '#000000') {
          updates.strokeColor = transformColor(pathData.strokeColor);
        }

        if (pathData.fillColor === '#000000' || pathData.fillColor === '#ffffff') {
          updates.fillColor = transformColor(pathData.fillColor);
        }

        if (Object.keys(updates).length > 0) {
          state.updateElement(element.id, {
            data: {
              ...pathData,
              ...updates
            }
          });
        }
      }
    });
  }, [colorMode]);
}
