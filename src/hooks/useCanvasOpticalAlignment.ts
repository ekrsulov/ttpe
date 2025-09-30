import { useCallback, useEffect, useMemo } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { OpticalAlignmentController } from '../canvasInteractions/OpticalAlignmentController';
import type { AlignmentResult } from '../utils/geometry';

export interface OpticalAlignmentState {
  currentAlignment: AlignmentResult | null;
  showMathematicalCenter: boolean;
  showOpticalCenter: boolean;
  showMetrics: boolean;
  showDistanceRules: boolean;
}

export interface OpticalAlignmentActions {
  calculateAlignment: () => void;
  applyAlignment: () => void;
  previewAlignment: () => void;
  resetAlignment: () => void;
  toggleMathematicalCenter: () => void;
  toggleOpticalCenter: () => void;
  toggleMetrics: () => void;
  toggleDistanceRules: () => void;
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
    calculateAlignment: storeCalculateAlignment,
    applyAlignment: storeApplyAlignment,
    previewAlignment: storePreviewAlignment,
    resetAlignment: storeResetAlignment,
    toggleMathematicalCenter: storeToggleMathematicalCenter,
    toggleOpticalCenter: storeToggleOpticalCenter,
    toggleMetrics: storeToggleMetrics,
    toggleDistanceRules: storeToggleDistanceRules,
    canPerformOpticalAlignment: storeCanPerformOpticalAlignment,
    getAlignmentValidationMessage: storeGetAlignmentValidationMessage,
    autoResetOnSelectionChange
  } = useCanvasStore();

  const controller = useMemo(() => new OpticalAlignmentController({
    calculateAlignment: storeCalculateAlignment,
    applyAlignment: storeApplyAlignment,
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
  }), [
    storeCalculateAlignment,
    storeApplyAlignment,
    storePreviewAlignment,
    storeResetAlignment,
    storeToggleMathematicalCenter,
    storeToggleOpticalCenter,
    storeToggleMetrics,
    storeToggleDistanceRules,
    storeCanPerformOpticalAlignment,
    storeGetAlignmentValidationMessage,
    currentAlignment,
    showMathematicalCenter,
    showOpticalCenter,
    showMetrics,
    showDistanceRules,
  ]);

  // Auto-reset alignment when selection changes
  useEffect(() => {
    autoResetOnSelectionChange();
  }, [autoResetOnSelectionChange]);

  const calculateAlignment = useCallback(() => {
    controller.calculate();
  }, [controller]);

  const applyAlignment = useCallback(() => {
    controller.apply();
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

    // Actions
    calculateAlignment,
    applyAlignment,
    previewAlignment,
    resetAlignment,
    toggleMathematicalCenter,
    toggleOpticalCenter,
    toggleMetrics,
    toggleDistanceRules,
    canPerformOpticalAlignment,
    getAlignmentValidationMessage,
  };
};