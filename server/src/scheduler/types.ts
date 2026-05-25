import type { SchedulerConfig, SchedulerState } from '@findarr/shared';
import type { FastifyBaseLogger } from 'fastify';
import type { Database } from '../db/service.js';
import type { JellyfinService } from '../jellyfin/service.js';
import type { TMDBService } from '../tmdb/service.js';
import type { SchedulerService } from './service.js';

export interface SchedulerContext {
  db: Database;
  log: FastifyBaseLogger;
  tmdb: TMDBService;
  jellyfin: JellyfinService;
  scheduler: SchedulerService;
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
  run: (context: SchedulerContext) => Promise<boolean>;
}

/**
 * Helper to create a scheduler
 */
export function createScheduler(
  config: SchedulerConfig,
  runFn: (context: SchedulerContext) => Promise<boolean>
): Scheduler {
  const state: SchedulerState = {
    enabled: config.enabled,
    isRunning: false,
    lastRun: null,
    nextRun: null,
    lastDuration: null,
    lastError: null,
    startedAt: null,
  };

  const scheduler: Scheduler = {
    config,
    state,
    run: runFn,
  };

  return scheduler;
}
