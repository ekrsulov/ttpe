import type { PluginDefinition } from '../types/plugins';
import type { CanvasStore } from '../store/canvasStore';
import { debugLog } from '../utils/debugUtils';

import { selectPlugin, panPlugin, filePlugin, settingsPlugin } from './basePlugins';
import { pencil2Plugin } from './pencil2';
import { textPlugin } from './text';
import { shapePlugin } from './shape';
import { transformationPlugin } from './transformation';
import { editPlugin } from './edit';
import { subpathPlugin } from './subpath';
import { curvesPlugin } from './curves';
import { opticalAlignmentPlugin } from './opticalAlignment';
import { guidelinesPlugin } from './guidelines';
import { objectSnapPlugin } from './objectSnap';
import { gridPlugin } from './grid';
import { minimapPlugin } from './minimap';
import { gridFillPlugin } from './gridFill';
import { duplicateOnDragPlugin } from './duplicateOnDrag';
import { trimPathPlugin } from './trimPath';
import { offsetPathPlugin } from './offsetPath';
import { measurePlugin } from './measure';
import { addPointPlugin } from './addPoint';
import { smoothBrushPlugin } from './smoothBrush';
import { pathSimplificationPlugin } from './pathSimplification';
import { roundPathPlugin } from './roundPath';
import { pathPlugin } from './path';

export const CORE_PLUGINS: PluginDefinition<CanvasStore>[] = [
  selectPlugin,
  panPlugin,
  filePlugin,
  settingsPlugin,
  pencil2Plugin,
  curvesPlugin,
  textPlugin,
  shapePlugin,
  subpathPlugin,
  transformationPlugin,
  editPlugin,
  pathPlugin,
  gridFillPlugin,
  measurePlugin,
  opticalAlignmentPlugin,
  guidelinesPlugin,
  objectSnapPlugin,
  gridPlugin,
  minimapPlugin,
  duplicateOnDragPlugin,
  trimPathPlugin,
  offsetPathPlugin,
  addPointPlugin,
  smoothBrushPlugin,
  pathSimplificationPlugin,
  roundPathPlugin,
];

// Debug info about core plugins (only in development builds)
debugLog('[CORE_PLUGINS] Total plugins:', CORE_PLUGINS.length);

export { selectPlugin, panPlugin, filePlugin, settingsPlugin } from './basePlugins';
export * from './text';
export * from './shape';
export * from './transformation';
export * from './edit';
export * from './subpath';
export * from './curves';
export * from './opticalAlignment';
export * from './guidelines';
export * from './objectSnap';
export * from './grid';
export * from './gridFill';
export * from './minimap';
export * from './duplicateOnDrag';
export * from './trimPath';
export * from './offsetPath';
export * from './measure';
export * from './path';
