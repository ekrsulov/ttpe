/**
 * Centralized logging system for the application
 * Provides different log levels and environment-aware logging
 */

export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
} as const;

export type LogLevel = typeof LogLevel[keyof typeof LogLevel];

interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  // Note: enableRemote removed until remote logging is actually implemented
  // When adding remote logging, expose via environment variable or Settings panel
  showCallerInfo?: boolean;
}

class Logger {
  private config: LoggerConfig;

  constructor(config?: Partial<LoggerConfig>) {
    // Initialize with default config
    const defaultConfig: LoggerConfig = {
      level: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.WARN,
      enableConsole: true,
      showCallerInfo: process.env.NODE_ENV === 'development' // Enable caller info in development by default
    };

    // Try to load log level from localStorage
    let savedLevel: LogLevel | null = null;
    let savedShowCallerInfo: boolean | null = null;
    try {
      const saved = localStorage.getItem('ttpe-log-level');
      if (saved !== null) {
        const parsedLevel = parseInt(saved, 10);
        if (parsedLevel >= LogLevel.DEBUG && parsedLevel <= LogLevel.ERROR) {
          savedLevel = parsedLevel as LogLevel;
        }
      }

      const savedCallerInfo = localStorage.getItem('ttpe-show-caller-info');
      if (savedCallerInfo !== null) {
        savedShowCallerInfo = savedCallerInfo === 'true';
      }
    } catch (_error) {
      // Ignore localStorage errors
    }

    this.config = {
      ...defaultConfig,
      ...(savedLevel !== null ? { level: savedLevel } : {}),
      ...(savedShowCallerInfo !== null ? { showCallerInfo: savedShowCallerInfo } : {}),
      ...config
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private getCallerInfo(): string {
    try {
      // Create an error to get the stack trace
      const stack = new Error().stack;
      if (!stack) return '';

      const stackLines = stack.split('\n');
      
      // Debug: log stack for path copy issue
      const isPathCopy = stackLines.some(line => line.includes('SelectPanel'));
      if (isPathCopy) {
        console.debug('DEBUG getCallerInfo stack:', stackLines);
      }
      
      // Find the first line that's not part of the logger itself
      // We need to skip the logger's internal methods to get to the actual caller
      for (let i = 1; i < stackLines.length; i++) {
        const line = stackLines[i];
        if (!line || line.includes('Logger.') || line.includes('getCallerInfo') || line.includes('formatMessage')) {
          continue;
        }

        // Extract file path and line number from stack trace
        // Different browsers have different formats, so we handle multiple patterns:
        // Chrome/Node: "    at functionName (file:///path/to/file.ts:line:column)"
        // Firefox: "functionName@file:///path/to/file.ts:line:column"
        // Safari: "functionName@file:///path/to/file.ts:line:column"
        
        let match = line.match(/at\s+(?:([^(]+)\s+\()?(?:.*\/)?([^/:()]+(?:\.[jt]sx?))(?:\?[^:]*)?:(\d+):(\d+)/);
        if (!match) {
          // Try Firefox/Safari format
          match = line.match(/([^@]*)@(?:.*\/)?([^/:()]+(?:\.[jt]sx?))(?:\?[^:]*)?:(\d+):(\d+)/);
        }
        
        // Debug: log parsing attempt for path copy issue
        if (isPathCopy) {
          console.debug('DEBUG parsing line:', line);
          console.debug('DEBUG match result:', match);
        }
        
        if (match) {
          const [, functionName, fileName, lineNumber] = match;
          const func = functionName ? functionName.trim() : '';
          
          // Debug: log extracted info for path copy issue
          if (isPathCopy) {
            console.debug('DEBUG extracted:', { functionName, fileName, lineNumber, func });
          }
          
          // Skip if it's still pointing to logger internals
          if (func.includes('debug') || func.includes('info') || func.includes('warn') || func.includes('error')) {
            if (isPathCopy) {
              console.debug('DEBUG skipping logger internal:', func);
            }
            continue;
          }
          
          // Create a clean caller info string
          let result = `${fileName}:${lineNumber}`;
          if (func && func !== 'anonymous' && func !== '') {
            result += ` (${func})`;
          }
          
          if (isPathCopy) {
            console.debug('DEBUG final result:', result);
          }
          
          return result;
        }
      }
    } catch (_error) {
      // If stack trace extraction fails, silently continue without caller info
    }
    return '';
  }

  private formatMessage(level: string, message: string, ...args: unknown[]): void {
    if (!this.config.enableConsole) return;

    const timestamp = new Date().toISOString();
    
    // Always check localStorage for the most up-to-date showCallerInfo value
    let showCallerInfo = this.config.showCallerInfo;
    try {
      const savedCallerInfo = localStorage.getItem('ttpe-show-caller-info');
      if (savedCallerInfo !== null) {
        showCallerInfo = savedCallerInfo === 'true';
      }
    } catch (_error) {
      // Ignore localStorage errors
    }
    
    const callerInfo = showCallerInfo ? this.getCallerInfo() : '';
    
    // Debug: temporary log for path copy issue
    if (message.includes('Path copied to clipboard')) {
      console.debug('DEBUG formatMessage:', {
        showCallerInfo,
        callerInfo,
        savedValue: localStorage.getItem('ttpe-show-caller-info')
      });
    }
    
    const prefix = `[${timestamp}] [${level}]${callerInfo ? ` [${callerInfo}]` : ''}`;
    
    switch (level) {
      case 'DEBUG':
        console.debug(prefix, message, ...args);
        break;
      case 'INFO':
        console.info(prefix, message, ...args);
        break;
      case 'WARN':
        console.warn(prefix, message, ...args);
        break;
      case 'ERROR':
        console.error(prefix, message, ...args);
        break;
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.formatMessage('DEBUG', message, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.formatMessage('INFO', message, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.formatMessage('WARN', message, ...args);
    }
  }

  error(message: string, error?: Error | unknown, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      if (error instanceof Error) {
        this.formatMessage('ERROR', `${message}: ${error.message}`, error.stack, ...args);
      } else {
        this.formatMessage('ERROR', message, error, ...args);
      }

      // TODO: When implementing remote error tracking (Sentry, etc.),
      // add enableRemote config flag and check:
      // if (this.config.enableRemote && process.env.NODE_ENV === 'production') { ... }
    }
  }

  // Método para cambiar la configuración en tiempo de ejecución
  setConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Persist log level to localStorage
    if (config.level !== undefined) {
      try {
        localStorage.setItem('ttpe-log-level', config.level.toString());
      } catch (_error) {
        // Ignore localStorage errors in case it's not available
      }
    }
  }

  // Método para configurar si mostrar información del caller
  setShowCallerInfo(showCallerInfo: boolean): void {
    this.config.showCallerInfo = showCallerInfo;
    
    // Persist showCallerInfo to localStorage
    try {
      localStorage.setItem('ttpe-show-caller-info', showCallerInfo.toString());
    } catch (_error) {
      // Ignore localStorage errors in case it's not available
    }
  }

  // Método para obtener si se muestra información del caller
  getShowCallerInfo(): boolean {
    return this.config.showCallerInfo || false;
  }

  // Método para obtener el nivel actual
  getLogLevel(): LogLevel {
    return this.config.level;
  }
}

// Instancia singleton del logger
export const logger = new Logger();