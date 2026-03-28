import type { FastifyInstance } from 'fastify';

/**
 * Configuration for a scheduler
 */
export interface SchedulerConfig {
  name: string;
  description: string; // Human-readable description
  interval: number; // Default interval in milliseconds
  enabled: boolean; // Can be disabled
  runOnStartup?: boolean; // Run immediately on server start
  minRuntime?: number; // Minimum runtime in ms before allowing self-termination
}

/**
 * Runtime state of a scheduler
 */
export interface SchedulerState {
  name: string;
  description: string;
  enabled: boolean;
  isRunning: boolean;
  lastRun: number | null; // Timestamp
  nextRun: number | null; // Timestamp (null = stopped/manual trigger only)
  lastDuration: number | null; // ms
  lastError: string | null;
  interval: number; // Default interval in milliseconds
  minRuntime: number; // Minimum runtime in ms before allowing self-termination
}

/**
 * Scheduler instance
 */
export interface Scheduler {
  config: SchedulerConfig;
  state: SchedulerState;

  /**
   * Execute the scheduler task
   * @returns true to continue (reschedule), false to stop (self-terminate)
   */
  run: (fastify: FastifyInstance) => Promise<boolean>;

  /**
   * Enable and schedule next run
   */
  start: () => void;

  /**
   * Disable and clear next run
   */
  stop: () => void;
}

/**
 * Helper to create a scheduler
 */
export function createScheduler(
  config: SchedulerConfig,
  runFn: (fastify: FastifyInstance) => Promise<boolean>
): Scheduler {
  const state: SchedulerState = {
    name: config.name,
    description: config.description,
    enabled: config.enabled,
    isRunning: false,
    lastRun: null,
    nextRun: null,
    lastDuration: null,
    lastError: null,
    minRuntime: config.minRuntime ?? 0,
    interval: config.interval,
  };

  const scheduler: Scheduler = {
    config,
    state,
    run: runFn,
    start() {
      scheduler.state.enabled = true;
    },
    stop() {
      scheduler.state.enabled = false;
      scheduler.state.nextRun = null;
    },
  };

  return scheduler;
}
