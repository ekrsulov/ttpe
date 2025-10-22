import { createContext } from 'react';
import type { CurvesController } from '../../canvas/interactions/CurvesController';
import type { CurveState } from '../../types';

export interface CurvesControllerContextValue {
  controller: CurvesController;
  curveState: CurveState;
}

export const CurvesControllerContext = createContext<CurvesControllerContextValue | null>(null);
