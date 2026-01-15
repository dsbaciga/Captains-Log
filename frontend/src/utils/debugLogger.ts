/**
 * Debug logging utility for tracking down production errors
 *
 * This logger adds comprehensive debugging information to help identify
 * the source of errors that are difficult to trace in minified production builds.
 */

const DEBUG_ENABLED = true; // Set to false to disable all debug logging

export interface DebugContext {
  component?: string;
  function?: string;
  operation?: string;
  data?: any;
  timestamp?: number;
}

class DebugLogger {
  private context: DebugContext[] = [];
  private maxContextSize = 50;

  /**
   * Log a debug message with context
   */
  log(message: string, context?: DebugContext): void {
    if (!DEBUG_ENABLED) return;

    const logEntry = {
      ...context,
      timestamp: Date.now(),
      message,
    };

    this.context.push(logEntry);
    if (this.context.length > this.maxContextSize) {
      this.context.shift();
    }

    console.log(`[DEBUG] ${message}`, context || '');
  }

  /**
   * Log an error with full context history
   */
  error(message: string, error: any, context?: DebugContext): void {
    if (!DEBUG_ENABLED) return;

    console.error(`[DEBUG ERROR] ${message}`, {
      error,
      context,
      recentHistory: this.context.slice(-10),
      stack: error?.stack,
    });
  }

  /**
   * Safely access array with logging
   */
  safeArray<T>(
    value: any,
    context: DebugContext
  ): T[] {
    const isArray = Array.isArray(value);
    const isEmpty = !value;
    const isUndefined = value === undefined;
    const isNull = value === null;

    this.log(`safeArray check`, {
      ...context,
      data: {
        isArray,
        isEmpty,
        isUndefined,
        isNull,
        type: typeof value,
        length: isArray ? value.length : 'N/A',
        valuePreview: this.getValuePreview(value),
      },
    });

    if (!Array.isArray(value)) {
      this.log(`⚠️ Expected array but got ${typeof value}`, {
        ...context,
        data: {
          value: this.getValuePreview(value),
          isNull,
          isUndefined,
        },
      });
      return [];
    }

    return value;
  }

  /**
   * Safely access object property with logging
   */
  safeProperty<T>(
    obj: any,
    property: string,
    context: DebugContext
  ): T | undefined {
    const exists = obj && obj.hasOwnProperty(property);
    const value = obj?.[property];

    this.log(`safeProperty check: ${property}`, {
      ...context,
      data: {
        objectExists: !!obj,
        propertyExists: exists,
        propertyValue: this.getValuePreview(value),
        propertyType: typeof value,
        objectKeys: obj ? Object.keys(obj).slice(0, 10) : [],
      },
    });

    return value;
  }

  /**
   * Log data structure before processing
   */
  logDataStructure(name: string, data: any, context?: DebugContext): void {
    if (!DEBUG_ENABLED) return;

    const structure: any = {};

    if (Array.isArray(data)) {
      structure.type = 'array';
      structure.length = data.length;
      structure.firstItem = data[0] ? this.getObjectStructure(data[0]) : null;
      structure.sampleIndices = [0, Math.floor(data.length / 2), data.length - 1].filter(i => i < data.length);
      structure.samples = structure.sampleIndices.map((i: number) => ({
        index: i,
        type: typeof data[i],
        isNull: data[i] === null,
        isUndefined: data[i] === undefined,
        keys: data[i] && typeof data[i] === 'object' ? Object.keys(data[i]).slice(0, 10) : [],
      }));
    } else if (data && typeof data === 'object') {
      structure.type = 'object';
      structure.keys = Object.keys(data).slice(0, 20);
      structure.sampleValues = {};
      Object.keys(data).slice(0, 5).forEach(key => {
        structure.sampleValues[key] = this.getValuePreview(data[key]);
      });
    } else {
      structure.type = typeof data;
      structure.value = this.getValuePreview(data);
    }

    this.log(`Data structure: ${name}`, {
      ...context,
      data: structure,
    });
  }

  /**
   * Get a safe preview of any value
   */
  private getValuePreview(value: any): any {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return value.length > 50 ? value.substring(0, 50) + '...' : value;
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (Array.isArray(value)) return `Array(${value.length})`;
    if (typeof value === 'object') {
      return `Object{${Object.keys(value).slice(0, 5).join(', ')}}`;
    }
    return String(value).substring(0, 50);
  }

  /**
   * Get structure of an object
   */
  private getObjectStructure(obj: any): any {
    if (!obj || typeof obj !== 'object') return typeof obj;

    const structure: any = {
      keys: Object.keys(obj).slice(0, 10),
    };

    // Check for common nested arrays
    Object.keys(obj).forEach(key => {
      if (Array.isArray(obj[key])) {
        structure[`${key}_length`] = obj[key].length;
      }
    });

    return structure;
  }

  /**
   * Create a scoped logger for a component
   */
  createScopedLogger(component: string) {
    return {
      log: (message: string, context?: Partial<DebugContext>) =>
        this.log(message, { component, ...context }),
      error: (message: string, error: any, context?: Partial<DebugContext>) =>
        this.error(message, error, { component, ...context }),
      safeArray: <T>(value: any, operation: string) =>
        this.safeArray<T>(value, { component, operation }),
      logDataStructure: (name: string, data: any, operation?: string) =>
        this.logDataStructure(name, data, { component, operation }),
    };
  }

  /**
   * Get recent context history
   */
  getRecentContext(count = 20): DebugContext[] {
    return this.context.slice(-count);
  }

  /**
   * Clear context history
   */
  clearContext(): void {
    this.context = [];
  }
}

// Export singleton instance
export const debugLogger = new DebugLogger();

// Export helper to attach to window for console access
if (typeof window !== 'undefined') {
  (window as any).__debugLogger = debugLogger;
  console.log('[DEBUG] Debug logger attached to window.__debugLogger');
  console.log('[DEBUG] Use window.__debugLogger.getRecentContext() to see recent logs');
}
