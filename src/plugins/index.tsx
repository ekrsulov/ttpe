import type { PluginDefinition } from '../types/plugins';
import type { CanvasStore } from '../store/canvasStore';
import { debugLog } from '../utils/debugUtils';

import { selectPlugin, panPlugin, filePlugin, settingsPlugin } from './basePlugins';
import { pencilPlugin } from './pencil';
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
import { collaborationPlugin } from './collaboration';
import { lassoPlugin } from './lasso';
import { sourcePlugin } from './source';
import { pluginManagerPlugin } from './pluginManager';

export const CORE_PLUGINS: PluginDefinition<CanvasStore>[] = [
  selectPlugin,
  panPlugin,
  filePlugin,
  settingsPlugin,
  pencilPlugin,
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
  collaborationPlugin,
  lassoPlugin,
  sourcePlugin,
  pluginManagerPlugin,
];

// Plugin modes that should be registered in the mode machine
export const PLUGIN_MODES = ['transformation', 'edit', 'subpath'];

// Debug info about core plugins (only in development builds)
debugLog('[CORE_PLUGINS] Total plugins:', CORE_PLUGINS.length);


