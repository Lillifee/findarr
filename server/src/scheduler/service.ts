import { getErrorMessage, type SchedulerName, type SchedulerParams } from '@findarr/shared';
import type { FastifyInstance } from 'fastify';
import type { Scheduler, SchedulerState } from './types.js';

const TICK_INTERVAL_MS = 10 * 1000; // 10 seconds

/**
 * Central scheduler orchestration service
 * Manages all schedulers with a single tick loop (every 10 seconds)
 */
export function createSchedulerService(
  fastify: FastifyInstance,
  schedulers: Record<SchedulerName, Scheduler>
) {
  let timer: NodeJS.Timeout | null = null;

  /**
   * Execute a scheduler
   */
  async function executeScheduler(scheduler: Scheduler): Promise<void> {
    const startTime = Date.now();
    scheduler.state.isRunning = true;
    scheduler.state.lastError = null;

    try {
      fastify.log.debug(
        { name: 'scheduler', schedulerName: scheduler.config.name },
        'Executing scheduler'
      );

      // Run scheduler and get result
      const shouldContinue = await scheduler.run(fastify);

      const duration = Date.now() - startTime;
      scheduler.state.lastRun = startTime;
      scheduler.state.lastDuration = duration;

      // Schedule next run based on return value
      if (shouldContinue) {
        // Continue - schedule next run with default interval
        scheduler.state.nextRun = Date.now() + scheduler.config.interval;
        fastify.log.debug(
          {
            name: 'scheduler',
            schedulerName: scheduler.config.name,
            duration,
            nextRunIn: Math.round(scheduler.config.interval / 1000),
          },
          'Scheduler completed'
        );
      } else {
        // Scheduler wants to self-terminate - check minimum runtime
        const totalRuntime = scheduler.state.startedAt ? Date.now() - scheduler.state.startedAt : 0;
        if (scheduler.config.minRuntime && totalRuntime < scheduler.config.minRuntime) {
          // Too early to terminate - reschedule instead
          scheduler.state.nextRun = Date.now() + scheduler.config.interval;
          fastify.log.debug(
            {
              name: 'scheduler',
              schedulerName: scheduler.config.name,
              duration,
              totalRuntime,
              minRuntime: scheduler.config.minRuntime,
              nextRunIn: Math.round(scheduler.config.interval / 1000),
            },
            'Scheduler requested termination but within minimum runtime - rescheduling'
          );
        } else {
          // Allow self-termination
          scheduler.state.nextRun = null;
          scheduler.state.enabled = false;
          scheduler.state.startedAt = null; // Reset for next start
          fastify.log.info(
            {
              name: 'scheduler',
              schedulerName: scheduler.config.name,
              duration,
              totalRuntime,
            },
            'Scheduler self-terminated'
          );
        }
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      scheduler.state.lastRun = startTime;
      scheduler.state.lastDuration = duration;
      scheduler.state.lastError = getErrorMessage(error);

      // Schedule retry with default interval
      scheduler.state.nextRun = Date.now() + scheduler.config.interval;

      fastify.log.error(
        {
          name: 'scheduler',
          schedulerName: scheduler.config.name,
          duration,
          error: scheduler.state.lastError,
          retryInSec: scheduler.config.interval / 1000,
        },
        'Scheduler failed, retrying'
      );
    } finally {
      scheduler.state.isRunning = false;
    }
  }

  /**
   * Orchestration tick - checks all schedulers and runs if due
   */
  function tick(): void {
    const now = Date.now();

    for (const scheduler of Object.values(schedulers)) {
      // Skip if disabled, already running, or not due yet
      if (
        !scheduler.state.enabled ||
        scheduler.state.isRunning ||
        scheduler.state.nextRun === null ||
        scheduler.state.nextRun > now
      ) {
        continue;
      }

      // Execute scheduler (async, don't await to prevent blocking other schedulers)
      executeScheduler(scheduler).catch(error => {
        fastify.log.error(
          { name: 'scheduler', schedulerName: scheduler.config.name, err: error },
          'Unexpected error in scheduler execution'
        );
      });
    }

    // Schedule next tick
    timer = setTimeout(() => {
      tick();
    }, TICK_INTERVAL_MS);
    timer.unref(); // Don't keep Node.js process alive
  }

  return {
    /**
     * Start a scheduler (enable + schedule next run)
     */
    start(params: SchedulerParams): void {
      const scheduler = schedulers[params.name];

      scheduler.state.enabled = true;

      // Initialize startedAt if first start
      if (scheduler.state.startedAt === null) {
        scheduler.state.startedAt = Date.now();
      }

      // Schedule immediate run if not already running
      if (!scheduler.state.isRunning && scheduler.state.nextRun === null) {
        scheduler.state.nextRun = Date.now();
      }

      fastify.log.info({ name: 'scheduler', schedulerName: params.name }, 'Scheduler started');
    },

    /**
     * Stop a scheduler (disable + clear next run)
     */
    stop(params: SchedulerParams): void {
      const scheduler = schedulers[params.name];

      scheduler.state.enabled = false;

      // Clear scheduling state
      scheduler.state.nextRun = null;
      scheduler.state.startedAt = null;

      fastify.log.info({ name: 'scheduler', schedulerName: params.name }, 'Scheduler stopped');
    },

    /**
     * Manually trigger a scheduler (immediate run)
     */
    async trigger(params: SchedulerParams): Promise<void> {
      const scheduler = schedulers[params.name];

      if (scheduler.state.isRunning) {
        throw new Error(`Scheduler '${params.name}' is already running`);
      }

      fastify.log.info(
        { name: 'scheduler', schedulerName: params.name },
        'Manually triggering scheduler'
      );
      await executeScheduler(scheduler);
    },

    /**
     * Get state of one or all schedulers
     */
    getState(params?: SchedulerParams): SchedulerState | SchedulerState[] {
      if (params?.name) {
        return { ...schedulers[params.name].state };
      }

      return Object.values(schedulers).map(s => ({ ...s.state }));
    },

    /**
     * Start the orchestration loop
     */
    async startOrchestration() {
      fastify.log.info(
        { name: 'scheduler', tickIntervalSec: TICK_INTERVAL_MS / 1000 },
        'Starting scheduler orchestration'
      );

      // Initialize schedulers that should run on startup
      for (const scheduler of Object.values(schedulers)) {
        if (scheduler.config.runOnStartup && scheduler.config.enabled) {
          scheduler.state.nextRun = Date.now();
        } else if (scheduler.config.enabled) {
          // Schedule first run at interval
          scheduler.state.nextRun = Date.now() + scheduler.config.interval;
        }
      }

      // Start tick loop
      await tick();
    },

    /**
     * Stop the orchestration loop
     */
    stopOrchestration(): void {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      fastify.log.info({ name: 'scheduler' }, 'Stopped scheduler orchestration');
    },
  };
}

export type SchedulerService = ReturnType<typeof createSchedulerService>;
