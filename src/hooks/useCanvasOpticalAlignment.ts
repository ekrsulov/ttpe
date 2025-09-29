import { useCallback, useEffect } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import type { AlignmentResult } from '../utils/opticalAlignmentUtils';

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

  // Auto-reset alignment when selection changes
  useEffect(() => {
    autoResetOnSelectionChange();
  }, [autoResetOnSelectionChange]);

  const calculateAlignment = useCallback(() => {
    storeCalculateAlignment();
  }, [storeCalculateAlignment]);

  const applyAlignment = useCallback(() => {
    storeApplyAlignment();
  }, [storeApplyAlignment]);

  const previewAlignment = useCallback(() => {
    storePreviewAlignment();
  }, [storePreviewAlignment]);

  const resetAlignment = useCallback(() => {
    storeResetAlignment();
  }, [storeResetAlignment]);

  const toggleMathematicalCenter = useCallback(() => {
    storeToggleMathematicalCenter();
  }, [storeToggleMathematicalCenter]);

  const toggleOpticalCenter = useCallback(() => {
    storeToggleOpticalCenter();
  }, [storeToggleOpticalCenter]);

  const toggleMetrics = useCallback(() => {
    storeToggleMetrics();
  }, [storeToggleMetrics]);

  const toggleDistanceRules = useCallback(() => {
    storeToggleDistanceRules();
  }, [storeToggleDistanceRules]);

  const canPerformOpticalAlignment = useCallback(() => {
    return storeCanPerformOpticalAlignment();
  }, [storeCanPerformOpticalAlignment]);

  const getAlignmentValidationMessage = useCallback(() => {
    return storeGetAlignmentValidationMessage();
  }, [storeGetAlignmentValidationMessage]);

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