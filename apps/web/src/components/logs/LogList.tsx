import type { LogEntry } from '@findarr/shared/logs';
import { isNotEmpty } from '@findarr/shared/utils';
import { useEffect, useRef } from 'react';

const LEVEL_STYLES: Record<string, string> = {
  trace: 'text-zinc-500',
  debug: 'text-sky-300',
  info: 'text-emerald-300',
  warn: 'text-amber-300',
  error: 'text-red-300',
  fatal: 'text-red-400',
};

function formatTime(time: number): string {
  return new Date(time).toLocaleTimeString();
}

interface LogRowProps {
  entry: LogEntry;
}

function LogRow({ entry }: LogRowProps) {
  const levelClass = LEVEL_STYLES[entry.levelLabel] ?? 'text-zinc-300';

  return (
    <div className="w-max min-w-full px-3 py-0.5 whitespace-pre hover:bg-zinc-900/40">
      <span className="text-zinc-500">{`[${formatTime(entry.time)}] `}</span>
      <span className={`font-semibold uppercase ${levelClass}`}>{entry.levelLabel}</span>
      {isNotEmpty(entry.name) && <span className="text-zinc-400">{` (${entry.name})`}</span>}
      <span className="text-zinc-500">{': '}</span>
      <span className="text-zinc-200">{entry.msg}</span>
      {entry.data !== undefined && (
        <span className="text-zinc-500">{` ${JSON.stringify(entry.data)}`}</span>
      )}
    </div>
  );
}

interface LogListProps {
  logs: LogEntry[];
}

export function LogList({ logs }: LogListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (container !== null) {
      container.scrollTop = container.scrollHeight;
    }
  }, [logs]);

  return (
    <div
      ref={containerRef}
      className="min-h-0 flex-1 overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 py-1 font-mono text-xs leading-relaxed"
    >
      {logs.map((entry) => (
        <LogRow key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
