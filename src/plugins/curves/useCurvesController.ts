import { useContext } from 'react';
import { CurvesControllerContext } from './curvesContext';
import type { CurvesControllerContextValue } from './curvesContext';

export const useCurvesController = (): CurvesControllerContextValue => {
  const context = useContext(CurvesControllerContext);
  if (!context) {
    throw new Error('useCurvesController must be used within a CurvesControllerProvider');
  }
  return context;
};
