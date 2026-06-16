import type { PinoLoggerOptions } from 'fastify/types/logger';

export function buildLogger(isProduction: boolean): PinoLoggerOptions {
  const config: PinoLoggerOptions = {
    level: 'info',
    serializers: {
      err: (err: Error & { code?: string; status?: number; response?: { data?: unknown } }) => ({
        type: err.name,
        message: err.message,
        code: err.code,
        status: err.status,
        data: err.response?.data,
        stack: err.stack ?? 'no stack trace',
      }),
    },
  };

  if (isProduction) {
    return config;
  }

  return {
    ...config,
    level: 'debug',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname,req,res',
        singleLine: true,
        messageFormat: '{msg}',
      },
    },
  };
}
