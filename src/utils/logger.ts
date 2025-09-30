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
  enableRemote?: boolean;
}

class Logger {
  private config: LoggerConfig;

  constructor(config: LoggerConfig = {
    level: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.WARN,
    enableConsole: true
  }) {
    this.config = config;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private formatMessage(level: string, message: string, ...args: unknown[]): void {
    if (!this.config.enableConsole) return;

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}]`;
    
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

      // En producción, aquí se podría enviar a un servicio de monitoreo
      if (this.config.enableRemote && process.env.NODE_ENV === 'production') {
        // TODO: Integrate with error tracking service (Sentry, etc.)
      }
    }
  }

  // Método para cambiar la configuración en tiempo de ejecución
  setConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Instancia singleton del logger
export const logger = new Logger();

// Exportar también la clase para casos especiales
export { Logger };