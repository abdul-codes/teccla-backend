export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDevelopment = process.env.NODE_ENV === 'development';
const logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  meta?: Record<string, unknown>;
}

function format(level: LogLevel, message: string, meta?: Record<string, unknown>): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta && Object.keys(meta).length > 0 ? { meta } : {}),
  };
}

function output(entry: LogEntry): void {
  const formatted = isDevelopment
    ? `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}${entry.meta ? ' ' + JSON.stringify(entry.meta) : ''}`
    : JSON.stringify(entry);

  if (isDevelopment) {
    console.log(formatted);
  } else {
    console.error(formatted);
  }
}

// Logger class with static methods for cleaner syntax: Logger.info(), Logger.warn()
class Logger {
  static debug(message: string, meta?: Record<string, unknown>): void {
    if (logLevel === 'debug') output(format('debug', message, meta));
  }

  static info(message: string, meta?: Record<string, unknown>): void {
    if (['debug', 'info'].includes(logLevel)) output(format('info', message, meta));
  }

  static warn(message: string, meta?: Record<string, unknown>): void {
    if (['debug', 'info', 'warn'].includes(logLevel)) output(format('warn', message, meta));
  }

  static error(message: string, error?: unknown): void {
    if (error !== undefined) {
      const errorObj = error instanceof Error
        ? { message: error.message, stack: error.stack, name: error.name }
        : { value: String(error) };
      output(format('error', message, { error: errorObj }));
    } else {
      output(format('error', message));
    }
  }
}

export default Logger;
