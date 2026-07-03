import type { Writable } from 'node:stream';

import type { FastifyBaseLogger } from 'fastify';
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
