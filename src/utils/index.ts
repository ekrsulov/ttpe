// Export all measurement utilities
export { measurePath } from './measurementUtils';

// Export all text vectorization utilities
export {
  textToPath
} from './textVectorizationUtils';

// Export font detection utilities
export {
  getAvailableFonts,
  clearFontCache,
  FONTS_TO_CHECK
} from './fontDetectionUtils';

// Export path parser utilities
export * from './pathParserUtils';

// Utility function to format numbers to at most N decimal places
export function formatToPrecision(num: number, precision: number = 2): number {
  return parseFloat(num.toFixed(precision));
}

// Export precision utilities
export { PATH_DECIMAL_PRECISION } from '../types';