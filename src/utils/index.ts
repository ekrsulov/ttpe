// Export all measurement utilities
export { measurePath } from './measurementUtils';

export {
  textToPath
} from './textVectorizationUtils';

export {
  getAvailableFonts,
  FONTS_TO_CHECK
} from './fontDetectionUtils';

export * from './pathParserUtils';

export function formatToPrecision(num: number, precision: number = 2): number {
  return parseFloat(num.toFixed(precision));
}

export { PATH_DECIMAL_PRECISION } from '../types';