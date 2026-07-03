import type { Writable } from 'node:stream';

import type { FastifyBaseLogger, FastifyLogFn } from 'fastify';
import { multistream, pino } from 'pino';
import pretty from 'pino-pretty';

const errSerializer = (
  err: Error & { code?: string; status?: number; response?: { data?: unknown } },
) => ({
  type: err.name,
  message: err.message,
  code: err.code,
  status: err.status,
  data: err.response?.data,
  stack: err.stack ?? 'no stack trace',
});

export function buildLogger(isProduction: boolean, bufferStream: Writable): FastifyBaseLogger {
  const level = isProduction ? 'info' : 'debug';

  const consoleStream = isProduction
    ? process.stdout
    : pretty({
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname,req,res',
        singleLine: true,
        messageFormat: '{msg}',
      });

  return pino(
    {
      level,
      serializers: { err: errSerializer },
    },
    // Streams accept everything; the logger's own `level` is the single runtime gate,
    // so it can be changed at runtime (admin log-level control).
    multistream([
      { level: 'trace', stream: consoleStream },
      { level: 'trace', stream: bufferStream },
    ]),
  );
}

/**
 * Application logger: the standard logging methods we use plus custom helpers
 * like `debugTiming`. A thin wrapper around the base (pino) logger, so we get
 * our own methods without monkey-patching the logger instance.
 */
export interface AppLogger {
  trace: FastifyLogFn;
  debug: FastifyLogFn;
  info: FastifyLogFn;
  warn: FastifyLogFn;
  error: FastifyLogFn;
  fatal: FastifyLogFn;

  debugTiming: <T>(fn: () => Promise<T>, obj: Record<string, unknown>, msg: string) => Promise<T>;
}

export function createAppLogger(base: FastifyBaseLogger): AppLogger {
  return {
    trace: base.trace.bind(base),
    debug: base.debug.bind(base),
    info: base.info.bind(base),
    warn: base.warn.bind(base),
    error: base.error.bind(base),
    fatal: base.fatal.bind(base),

    async debugTiming(fn, obj, msg) {
      const start = performance.now();
      try {
        return await fn();
      } finally {
        const duration = Math.round(performance.now() - start);
        base.debug({ ...obj, duration }, msg);
      }
    },
  };
}
