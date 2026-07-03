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
