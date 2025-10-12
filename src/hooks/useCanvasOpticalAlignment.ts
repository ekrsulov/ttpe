import { useCallback, useMemo } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { OpticalAlignmentController } from '../canvasInteractions/OpticalAlignmentController';
import type { AlignmentResult } from '../utils/geometry';

export interface OpticalAlignmentState {
  currentAlignment: AlignmentResult | null;
  showMathematicalCenter: boolean;
  showOpticalCenter: boolean;
  showMetrics: boolean;
  showDistanceRules: boolean;
  showAllDistanceRules: boolean;
  dxFilter: number;
  dyFilter: number;
}

export interface OpticalAlignmentActions {
  calculateAlignment: () => void;
  applyAlignment: () => void;
  centerAllPairsMathematically: () => void;
  previewAlignment: () => void;
  resetAlignment: () => void;
  toggleMathematicalCenter: () => void;
  toggleOpticalCenter: () => void;
  toggleMetrics: () => void;
  toggleDistanceRules: () => void;
  toggleAllDistanceRules: () => void;
  setDxFilter: (value: number) => void;
  setDyFilter: (value: number) => void;
  canPerformOpticalAlignment: () => boolean;
  getAlignmentValidationMessage: () => string | null;
}

export type UseCanvasOpticalAlignmentReturn = OpticalAlignmentState & OpticalAlignmentActions;

/**
 * Hook for managing optical alignment functionality
 * Handles alignment calculations, visualization, and application
 */
export const useCanvasOpticalAlignment = (): UseCanvasOpticalAlignmentReturn => {
  const {
    currentAlignment,
    showMathematicalCenter,
    showOpticalCenter,
    showMetrics,
    showDistanceRules,
    showAllDistanceRules,
    dxFilter,
    dyFilter,
    calculateAlignment: storeCalculateAlignment,
    applyAlignment: storeApplyAlignment,
    centerAllPairsMathematically: storeCenterAllPairsMathematically,
    previewAlignment: storePreviewAlignment,
    resetAlignment: storeResetAlignment,
    toggleMathematicalCenter: storeToggleMathematicalCenter,
    toggleOpticalCenter: storeToggleOpticalCenter,
    toggleMetrics: storeToggleMetrics,
    toggleDistanceRules: storeToggleDistanceRules,
    toggleAllDistanceRules: storeToggleAllDistanceRules,
    setDxFilter: storeSetDxFilter,
    setDyFilter: storeSetDyFilter,
    canPerformOpticalAlignment: storeCanPerformOpticalAlignment,
    getAlignmentValidationMessage: storeGetAlignmentValidationMessage
  } = useCanvasStore();

  const controller = useMemo(() => new OpticalAlignmentController({
    calculateAlignment: storeCalculateAlignment,
    applyAlignment: storeApplyAlignment,
    centerAllPairsMathematically: storeCenterAllPairsMathematically,
    previewAlignment: storePreviewAlignment,
    resetAlignment: storeResetAlignment,
    toggleMathematicalCenter: storeToggleMathematicalCenter,
    toggleOpticalCenter: storeToggleOpticalCenter,
    toggleMetrics: storeToggleMetrics,
    toggleDistanceRules: storeToggleDistanceRules,
    canPerformOpticalAlignment: storeCanPerformOpticalAlignment,
    getAlignmentValidationMessage: storeGetAlignmentValidationMessage,
    getCurrentAlignment: () => currentAlignment,
    getShowMathematicalCenter: () => showMathematicalCenter,
    getShowOpticalCenter: () => showOpticalCenter,
    getShowMetrics: () => showMetrics,
    getShowDistanceRules: () => showDistanceRules,
    getShowAllDistanceRules: () => showAllDistanceRules,
    toggleAllDistanceRules: storeToggleAllDistanceRules,
  }), [
    storeCalculateAlignment,
    storeApplyAlignment,
    storeCenterAllPairsMathematically,
    storePreviewAlignment,
    storeResetAlignment,
    storeToggleMathematicalCenter,
    storeToggleOpticalCenter,
    storeToggleMetrics,
    storeToggleDistanceRules,
    storeToggleAllDistanceRules,
    storeCanPerformOpticalAlignment,
    storeGetAlignmentValidationMessage,
    currentAlignment,
    showMathematicalCenter,
    showOpticalCenter,
    showMetrics,
    showDistanceRules,
    showAllDistanceRules,
  ]);

  const calculateAlignment = useCallback(() => {
    controller.calculate();
  }, [controller]);

  const applyAlignment = useCallback(() => {
    controller.apply();
  }, [controller]);

  const centerAllPairsMathematically = useCallback(() => {
    controller.centerAllPairsMathematically();
  }, [controller]);

  const previewAlignment = useCallback(() => {
    controller.preview();
  }, [controller]);

  const resetAlignment = useCallback(() => {
    controller.reset();
  }, [controller]);

  const toggleMathematicalCenter = useCallback(() => {
    controller.toggleMathematicalCenter();
  }, [controller]);

  const toggleOpticalCenter = useCallback(() => {
    controller.toggleOpticalCenter();
  }, [controller]);

  const toggleMetrics = useCallback(() => {
    controller.toggleMetrics();
  }, [controller]);

  const toggleDistanceRules = useCallback(() => {
    controller.toggleDistanceRules();
  }, [controller]);

  const toggleAllDistanceRules = useCallback(() => {
    controller.toggleAllDistanceRules();
  }, [controller]);

  const canPerformOpticalAlignment = useCallback(() => {
    return controller.canPerform();
  }, [controller]);

  const getAlignmentValidationMessage = useCallback(() => {
    return controller.getValidationMessage();
  }, [controller]);

  return {
    // State
    currentAlignment,
    showMathematicalCenter,
    showOpticalCenter,
    showMetrics,
    showDistanceRules,
    showAllDistanceRules,
    dxFilter,
    dyFilter,

    // Actions
    calculateAlignment,
    applyAlignment,
    centerAllPairsMathematically,
    previewAlignment,
    resetAlignment,
    toggleMathematicalCenter,
    toggleOpticalCenter,
    toggleMetrics,
    toggleDistanceRules,
    toggleAllDistanceRules,
    setDxFilter: storeSetDxFilter,
    setDyFilter: storeSetDyFilter,
    canPerformOpticalAlignment,
    getAlignmentValidationMessage,
  };
};