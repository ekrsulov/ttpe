import { CurvesController } from './CurvesController';

// Global controller instance for the plugin
let globalCurvesController: CurvesController | null = null;

export const getGlobalCurvesController = (): CurvesController | null => globalCurvesController;

export const setGlobalCurvesController = (controller: CurvesController | null) => {
  globalCurvesController = controller;
};
