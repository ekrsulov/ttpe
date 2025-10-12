import type { AlignmentResult } from '../utils/geometry';

export interface OpticalAlignmentCallbacks {
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
  canPerformOpticalAlignment: () => boolean;
  getAlignmentValidationMessage: () => string | null;
  getCurrentAlignment: () => AlignmentResult | null;
  getShowMathematicalCenter: () => boolean;
  getShowOpticalCenter: () => boolean;
  getShowMetrics: () => boolean;
  getShowDistanceRules: () => boolean;
  getShowAllDistanceRules: () => boolean;
}

export class OpticalAlignmentController {
  private callbacks: OpticalAlignmentCallbacks;

  constructor(callbacks: OpticalAlignmentCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Calculate optical alignment
   */
  calculate(): void {
    this.callbacks.calculateAlignment();
  }

  /**
   * Apply alignment
   */
  apply(): void {
    this.callbacks.applyAlignment();
  }

  /**
   * Center all pairs mathematically
   */
  centerAllPairsMathematically(): void {
    this.callbacks.centerAllPairsMathematically();
  }

  /**
   * Preview alignment
   */
  preview(): void {
    this.callbacks.previewAlignment();
  }

  /**
   * Reset alignment
   */
  reset(): void {
    this.callbacks.resetAlignment();
  }

  /**
   * Toggle mathematical center visibility
   */
  toggleMathematicalCenter(): void {
    this.callbacks.toggleMathematicalCenter();
  }

  /**
   * Toggle optical center visibility
   */
  toggleOpticalCenter(): void {
    this.callbacks.toggleOpticalCenter();
  }

  /**
   * Toggle metrics visibility
   */
  toggleMetrics(): void {
    this.callbacks.toggleMetrics();
  }

  /**
   * Toggle distance rules visibility
   */
  toggleDistanceRules(): void {
    this.callbacks.toggleDistanceRules();
  }

  /**
   * Toggle all distance rules visibility
   */
  toggleAllDistanceRules(): void {
    this.callbacks.toggleAllDistanceRules();
  }

  /**
   * Check if optical alignment can be performed
   */
  canPerform(): boolean {
    return this.callbacks.canPerformOpticalAlignment();
  }

  /**
   * Get validation message
   */
  getValidationMessage(): string | null {
    return this.callbacks.getAlignmentValidationMessage();
  }

  /**
   * Get current alignment state
   */
  getCurrentAlignment(): AlignmentResult | null {
    return this.callbacks.getCurrentAlignment();
  }

  /**
   * Get visibility states
   */
  getVisibilityStates() {
    return {
      showMathematicalCenter: this.callbacks.getShowMathematicalCenter(),
      showOpticalCenter: this.callbacks.getShowOpticalCenter(),
      showMetrics: this.callbacks.getShowMetrics(),
      showDistanceRules: this.callbacks.getShowDistanceRules(),
      showAllDistanceRules: this.callbacks.getShowAllDistanceRules(),
    };
  }
}