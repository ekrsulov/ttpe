// Export all measurement utilities
export { measurePath } from './measurementUtils';

export {
  getAvailableFonts,
  FONTS_TO_CHECK
} from './fontDetectionUtils';

export * from './pathParserUtils';

// Export coordinate helpers
export * from './coordinateHelpers';

// Export logger
export { logger, LogLevel } from './logger';

// Export type guards
export * from './typeGuards';

// Export modular utilities
export * from './geometry';
export * from './path';
export * from './canvas';

export function formatToPrecision(num: number, precision: number = 2): number {
  return parseFloat(num.toFixed(precision));
}

export { PATH_DECIMAL_PRECISION } from '../types';