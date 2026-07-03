import { z } from 'zod';

// Maximum number of log entries retained in the in-memory buffer.
export const LOG_BUFFER_LIMIT = 300;

export interface LogEntry {
  id: number;
  time: number;
  level: number;
  levelLabel: string;
  msg: string;
  name?: string;
  data?: Record<string, unknown>;
}

export interface LogsResponse {
  entries: LogEntry[];
}

export const LOG_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const;

export const LogLevelSchema = z.enum(LOG_LEVELS);
export type LogLevel = z.infer<typeof LogLevelSchema>;

export const LogLevelBodySchema = z.object({ level: LogLevelSchema });

export interface LogLevelResponse {
  level: LogLevel;
}
