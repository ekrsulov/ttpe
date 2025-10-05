// Export all measurement utilities
export { measurePath } from './measurementUtils';

export {
  getAvailableFonts
} from './fontDetectionUtils';

export * from './pathParserUtils';

// Export logger
export { logger, LogLevel } from './logger';

// Export modular utilities
export * from './geometry';
export * from './path';
export * from './canvas';

export function formatToPrecision(num: number, precision: number = 2): number {
  return parseFloat(num.toFixed(precision));
}

export { PATH_DECIMAL_PRECISION } from '../types';