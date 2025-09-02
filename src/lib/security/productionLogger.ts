/**
 * Production-safe logging utility
 * Replaces console.log statements with secure, environment-aware logging
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  timestamp?: Date;
}

class ProductionLogger {
  private logLevel: LogLevel;
  private isProduction: boolean;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.logLevel = this.isProduction ? LogLevel.ERROR : LogLevel.DEBUG;
  }

  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const sensitiveKeys = [
      'password', 'token', 'secret', 'key', 'authorization',
      'phone', 'email', 'driverPhone', 'driverEmail', 
      'ssn', 'license', 'passport', 'creditcard', 'apiKey',
      'refreshToken', 'accessToken', 'sessionId'
    ];

    const sanitized = Array.isArray(data) ? [...data] : { ...data };

    for (const key in sanitized) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    }

    return sanitized;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` [${JSON.stringify(this.sanitizeData(context))}]` : '';
    return `[${timestamp}] ${level}: ${message}${contextStr}`;
  }

  error(message: string, data?: any, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    
    const sanitizedData = this.sanitizeData(data);
    console.error(this.formatMessage('ERROR', message, context), sanitizedData);
  }

  warn(message: string, data?: any, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    
    const sanitizedData = this.sanitizeData(data);
    console.warn(this.formatMessage('WARN', message, context), sanitizedData);
  }

  info(message: string, data?: any, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    
    const sanitizedData = this.sanitizeData(data);
    console.log(`[INFO] ${message}`, sanitizedData);
  }

  debug(message: string, data?: any, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    
    const sanitizedData = this.sanitizeData(data);
    console.debug(`[DEBUG] ${message}`, sanitizedData);
  }

  // Performance logging
  time(label: string): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    console.time(label);
  }

  timeEnd(label: string): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    console.timeEnd(label);
  }

  // Metric logging for production monitoring
  metric(name: string, value: number, tags?: Record<string, string>): void {
    if (this.isProduction) {
      // In production, send to monitoring service
      // For now, we'll just log it safely
      this.info(`METRIC: ${name}`, { value, tags });
    }
  }
}

export const logger = new ProductionLogger();

// Convenience exports for easier migration
export const secureConsole = {
  log: (message: string, data?: any) => logger.debug(message, data),
  error: (message: string, data?: any) => logger.error(message, data),
  warn: (message: string, data?: any) => logger.warn(message, data),
  info: (message: string, data?: any) => logger.info(message, data),
  debug: (message: string, data?: any) => logger.debug(message, data)
};

export default logger;