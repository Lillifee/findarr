import type { Writable } from 'node:stream';

import type { FastifyBaseLogger, FastifyInstance, FastifyLogFn } from 'fastify';
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
        ignore: 'pid,hostname',
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
 * Fastify's built-in request logging always logs at 'info', which is noisy for
 * production. Call this with `disableRequestLogging: true` set on the Fastify
 * instance to log completed requests ourselves at 'trace' (or 'warn' on
 * errors), so raw HTTP traffic stays separate from meaningful 'debug'-level
 * domain events (e.g. tmdb/radarr/sonarr timing).
 */
export function registerRequestLogging(server: FastifyInstance): void {
  server.addHook('onResponse', async (request, reply) => {
    const level = reply.statusCode >= 400 ? 'warn' : 'trace';
    request.log[level](
      {
        req: { method: request.method, url: request.url },
        res: { statusCode: reply.statusCode },
        responseTime: reply.elapsedTime,
      },
      'request completed',
    );
  });
}

/**
 * A flat, step-based stopwatch for timing a multi-step flow without wrapping
 * each step in a closure. Call `lap(step)` after each step to log its duration
 * since the previous lap, and `end()` to log the total elapsed time.
 * Every line is logged at `debug` with the timer's base fields plus `step` and
 * `duration` (ms), so a whole flow reads as flat, aligned log lines.
 */
export interface Timer {
  lap: (step: string) => void;
  end: (step?: string) => void;
}

/**
 * Application logger: the standard logging methods we use plus custom helpers
 * like `timed` and `timer`. A thin wrapper around the base (pino) logger, so we
 * get our own methods without monkey-patching the logger instance.
 */
export interface AppLogger {
  trace: FastifyLogFn;
  debug: FastifyLogFn;
  info: FastifyLogFn;
  warn: FastifyLogFn;
  error: FastifyLogFn;
  fatal: FastifyLogFn;

  /**
   * Start a flat, step-based stopwatch for a multi-step flow. Pass the
   * operation/function name as `context` (reuse the real identifier, e.g. the
   * enclosing function name) so logs are self-locating without inventing labels.
   */
  timer: (context: string, data?: Record<string, unknown>) => Timer;

  /**
   * Return a logger bound to a module/service `name` (e.g. `'catalog'`), so all
   * of its timing lines carry that scope. Create one per service and reuse it.
   */
  scope: (name: string) => AppLogger;
}

function buildAppLogger(base: FastifyBaseLogger): AppLogger {
  return {
    trace: base.trace.bind(base),
    debug: base.debug.bind(base),
    info: base.info.bind(base),
    warn: base.warn.bind(base),
    error: base.error.bind(base),
    fatal: base.fatal.bind(base),

    timer(context, data) {
      const start = performance.now();
      let last = start;

      const emit = (step: string, from: number) => {
        base.debug(
          { context, step, duration: Math.round(performance.now() - from), ...data },
          'timing',
        );
      };

      emit('start', start);

      return {
        lap(step) {
          emit(step, last);
          last = performance.now();
        },
        end(step = 'end') {
          emit(step, start);
        },
      };
    },

    // Bind `name` via a pino child logger so the scope carries into *every*
    // method (trace/debug/info/… as well as timed/timer), not just timing.
    scope(name) {
      return buildAppLogger(base.child({ name }));
    },
  };
}

export function createAppLogger(base: FastifyBaseLogger): AppLogger {
  return buildAppLogger(base);
}
