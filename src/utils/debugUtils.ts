/**
 * Debug logging utility with development guard
 * Ensures logs only appear in development builds
 */

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

/**
 * Log a message only in development mode
 */
export function debugLog(message: string, ...args: unknown[]): void {
  if (import.meta.env.DEV) {
    console.log(message, ...args);
  }
}

/**
 * Log with specific level only in development mode
 */
export function debugLogLevel(level: LogLevel, message: string, ...args: unknown[]): void {
  if (import.meta.env.DEV) {
    console[level](message, ...args);
  }
}

/**
 * Log info only in development mode
 */
export function debugInfo(message: string, ...args: unknown[]): void {
  debugLogLevel('info', message, ...args);
}

/**
 * Log warning only in development mode
 */
export function debugWarn(message: string, ...args: unknown[]): void {
  debugLogLevel('warn', message, ...args);
}

/**
 * Log error only in development mode
 */
export function debugError(message: string, ...args: unknown[]): void {
  debugLogLevel('error', message, ...args);
}

/**
 * Group logs only in development mode
 */
export function debugGroup(label: string, callback: () => void): void {
  if (import.meta.env.DEV) {
    console.group(label);
    callback();
    console.groupEnd();
  }
}

/**
 * Deep debug logging - for verbose traces like data URLs, snapshots
 * Can be enabled with an additional flag for extra verbose debugging
 */
const DEEP_DEBUG = false; // Set to true for extra verbose debugging

export function deepDebugLog(message: string, ...args: unknown[]): void {
  if (import.meta.env.DEV && DEEP_DEBUG) {
    console.log(message, ...args);
  }
}
