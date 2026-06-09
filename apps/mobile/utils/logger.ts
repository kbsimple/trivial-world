/**
 * Logger utility for consistent error/warning handling
 * Replaces console usage with configurable logging
 */

/**
 * Check if running in development mode
 * __DEV__ is a React Native global set by the bundler
 */
declare const __DEV__: boolean | undefined;

/**
 * Logger namespace for trivial-world
 */
export const logger = {
  /**
   * Log an error message
   * In development: logs to console
   * In production: could send to monitoring service
   */
  error: (message: string, error?: unknown): void => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      if (error !== undefined) {
        console.error(message, error);
      } else {
        console.error(message);
      }
    }
    // In production: send to monitoring service (e.g., Sentry, Bugsnag)
    // Example: monitoringService.captureError(message, error);
  },

  /**
   * Log a warning message
   * In development: logs to console
   * In production: could send to analytics
   */
  warn: (message: string): void => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn(message);
    }
    // In production: send to analytics
    // Example: analytics.trackWarning(message);
  },

  /**
   * Log an info message (debug only)
   * Only logs in development mode
   */
  info: (message: string, data?: unknown): void => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      if (data !== undefined) {
        console.log(`[INFO] ${message}`, data);
      } else {
        console.log(`[INFO] ${message}`);
      }
    }
  },

  /**
   * Log a debug message (debug only)
   * Only logs in development mode
   */
  debug: (message: string, data?: unknown): void => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      if (data !== undefined) {
        console.log(`[DEBUG] ${message}`, data);
      } else {
        console.log(`[DEBUG] ${message}`);
      }
    }
  },
};

export default logger;