import { Writable } from 'node:stream';

import { LOG_BUFFER_LIMIT, type LogEntry } from '@findarr/shared/logs';

const LEVEL_LABELS: Record<number, string> = {
  10: 'trace',
  20: 'debug',
  30: 'info',
  40: 'warn',
  50: 'error',
  60: 'fatal',
} as const;

// Standard pino fields that are surfaced as dedicated columns, not extra data
const KNOWN_FIELDS = new Set(['level', 'time', 'name', 'msg', 'pid', 'hostname', 'v']);

function normalize(raw: Record<string, unknown>): Omit<LogEntry, 'id'> {
  const level = typeof raw['level'] === 'number' ? raw['level'] : 30;

  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!KNOWN_FIELDS.has(key)) {
      data[key] = value;
    }
  }

  const entry: Omit<LogEntry, 'id'> = {
    level,
    levelLabel: LEVEL_LABELS[level] ?? 'info',
    time: typeof raw['time'] === 'number' ? raw['time'] : Date.now(),
    name: typeof raw['name'] === 'string' ? raw['name'] : '',
    msg: typeof raw['msg'] === 'string' ? raw['msg'] : '',
  };

  if (Object.keys(data).length > 0) {
    entry.data = data;
  }

  return entry;
}

export function createLogStore(maxEntries: number = LOG_BUFFER_LIMIT) {
  const entries: LogEntry[] = [];
  let nextId = 0;

  function push(entry: Omit<LogEntry, 'id'>): void {
    nextId += 1;
    entries.push({ ...entry, id: nextId });
    if (entries.length > maxEntries) {
      entries.shift();
    }
  }

  function getLogs(): LogEntry[] {
    return [...entries];
  }

  function createStream(): Writable {
    return new Writable({
      write(chunk: Buffer | string, _encoding, callback) {
        const text = chunk.toString();
        for (const line of text.split('\n')) {
          if (line.trim().length === 0) {
            continue;
          }
          try {
            const parsed: unknown = JSON.parse(line);
            if (parsed !== null && typeof parsed === 'object') {
              push(normalize({ ...parsed }));
            }
          } catch {
            // Ignore malformed lines
          }
        }
        callback();
      },
    });
  }

  return { getLogs, createStream };
}

export type LogStore = ReturnType<typeof createLogStore>;
