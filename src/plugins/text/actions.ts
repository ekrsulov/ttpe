/**
 * Text Plugin Actions
 * 
 * Contains the business logic for text operations that were previously
 * coupled to the canvas store.
 */

import type { StoreApi } from 'zustand';
import type { CanvasStore } from '../../store/types';
import type { TextPluginSlice } from './slice';
import type { PencilPluginSlice } from '../pencil/slice';
import { textToPathCommands } from '../../utils/canvas';
import { extractSubpaths } from '../../utils/path';
import { logger } from '../../utils';

/**
 * Add text converted to path
 */
export async function addText(
  x: number,
  y: number,
  text: string,
  getState: StoreApi<CanvasStore>['getState']
): Promise<void> {
  const state = getState();
  if (!state.text || !state.pencil) return;

  const textState = state.text as TextPluginSlice['text'];
  const pencilState = state.pencil as PencilPluginSlice['pencil'];

  const { fontSize, fontFamily, fontWeight, fontStyle } = textState;
  const { fillColor, fillOpacity, strokeColor, strokeWidth, strokeOpacity } = pencilState;

  try {
    // Convert text to path commands directly without string parsing
    const commands = await textToPathCommands(
      text,
      x,
      y,
      fontSize,
      fontFamily,
      fontWeight,
      fontStyle
    );

    if (commands.length > 0) {
      // Extract subpaths directly from commands
      const subPaths = extractSubpaths(commands);

      // Create path element with the converted text
      state.addElement({
        type: 'path',
        data: {
          subPaths: subPaths.map(sp => sp.commands),
          strokeWidth,
          strokeColor,
          strokeOpacity,
          fillColor,
          fillOpacity,
          strokeLinecap: pencilState.strokeLinecap || 'round',
          strokeLinejoin: pencilState.strokeLinejoin || 'round',
          fillRule: pencilState.fillRule || 'nonzero',
          strokeDasharray: pencilState.strokeDasharray || 'none',
        },
      });
    } else {
      logger.error('Failed to convert text to path');
    }
  } catch (error) {
    logger.error('Error converting text to path', error);
  }

  // Auto-switch to select mode after adding text
  state.setActivePlugin('select');
}
