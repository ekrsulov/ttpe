// Export all measurement utilities
export { measurePath } from './measurementUtils';

export {
  getAvailableFonts
} from './fontDetectionUtils';

export {
  isTTFFont,
  getTTFFontNames,
  loadTTFFont,
  ttfTextToPath
} from './ttfFontUtils';

export * from './pathParserUtils';

// Export transformation utilities
export { translateCommands } from './transformationUtils';

// Export logger
export { logger, LogLevel } from './logger';

// Export modular utilities
export * from './geometry';
export * from './path';
export * from './canvas';
export * from './overlayHelpers';

// Export SVG import utilities
export * from './svgImportUtils';

export function formatToPrecision(num: number, precision: number = 2): number {
  return parseFloat(num.toFixed(precision));
}

export { PATH_DECIMAL_PRECISION } from '../types';
