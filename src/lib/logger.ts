// src/lib/logger.ts
// Structured logging utility — zero dependencies.
//
// Production: JSON lines (machine-readable, compatible with log aggregators)
// Development: Pretty colored output (human-readable)
//
// Usage:
//   import { logger } from '@/lib/logger';
//   logger.info('User registered', { userId, email });
//   logger.error('Payment failed', { error: err, orderId });
//
//   const log = logger.child({ requestId, userId });
//   log.info('Processing request');
//
// Log level via env: LOG_LEVEL=debug|info|warn|error (default: debug in dev, info in prod)

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// ANSI colors for dev pretty-printing
const COLORS = {
  debug: '\x1b[36m', // cyan
  info: '\x1b[32m',  // green
  warn: '\x1b[33m',  // yellow
  error: '\x1b[31m', // red
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
} as const;

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function getMinLevel(): number {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined;
  if (envLevel && envLevel in LOG_LEVELS) return LOG_LEVELS[envLevel];
  return IS_PRODUCTION ? LOG_LEVELS.info : LOG_LEVELS.debug;
}

type LogContext = Record<string, unknown>;

function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      ...(err.stack && !IS_PRODUCTION && { stack: err.stack }),
      // Preserve extra properties (e.g. Prisma error codes)
      ...Object.fromEntries(
        Object.entries(err).filter(([k]) => !['name', 'message', 'stack'].includes(k)),
      ),
    };
  }
  return { value: err };
}

function prepareContext(ctx: LogContext): LogContext {
  const out: LogContext = {};
  for (const [key, value] of Object.entries(ctx)) {
    if (value instanceof Error) {
      out[key] = serializeError(value);
    } else if (value === undefined) {
      // skip undefined
    } else {
      out[key] = value;
    }
  }
  return out;
}

function formatPretty(level: LogLevel, message: string, context: LogContext): string {
  const color = COLORS[level];
  const tag = `${color}${COLORS.bold}[${level.toUpperCase()}]${COLORS.reset}`;
  const ts = `${COLORS.dim}${new Date().toISOString()}${COLORS.reset}`;

  let line = `${tag} ${ts} ${message}`;

  const keys = Object.keys(context);
  if (keys.length > 0) {
    // Format context nicely
    const parts = keys.map((k) => {
      const v = context[k];
      if (typeof v === 'object' && v !== null) {
        return `${COLORS.dim}${k}=${COLORS.reset}${JSON.stringify(v)}`;
      }
      return `${COLORS.dim}${k}=${COLORS.reset}${v}`;
    });
    line += ` ${parts.join(' ')}`;
  }

  return line;
}

function formatJSON(level: LogLevel, message: string, context: LogContext): string {
  return JSON.stringify({
    level,
    timestamp: new Date().toISOString(),
    message,
    ...context,
  });
}

class Logger {
  private baseContext: LogContext;
  private minLevel: number;

  constructor(context: LogContext = {}) {
    this.baseContext = context;
    this.minLevel = getMinLevel();
  }

  /**
   * Create a child logger with additional context fields.
   * The child inherits all parent context and adds its own.
   *
   *   const log = logger.child({ requestId: 'abc', userId: 'u1' });
   *   log.info('Request processed');  // includes requestId + userId in output
   */
  child(context: LogContext): Logger {
    return new Logger({ ...this.baseContext, ...context });
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log('error', message, context);
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (LOG_LEVELS[level] < this.minLevel) return;

    const merged = prepareContext({ ...this.baseContext, ...context });
    const output = IS_PRODUCTION
      ? formatJSON(level, message, merged)
      : formatPretty(level, message, merged);

    // Use appropriate console method for level
    switch (level) {
      case 'debug':
        console.debug(output);
        break;
      case 'info':
        console.info(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'error':
        console.error(output);
        break;
    }
  }
}

/** Root logger instance. Import and use directly, or create children with context. */
export const logger = new Logger();

/** Create a named logger (adds `module` field to all output). */
export function createLogger(module: string, context?: LogContext): Logger {
  return new Logger({ module, ...context });
}
