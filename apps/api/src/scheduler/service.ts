import type { SchedulerInfo, SchedulerName, SchedulerParams } from '@findarr/shared/scheduler';
import { getErrorMessage, isDefined } from '@findarr/shared/utils';
import type { FastifyInstance } from 'fastify';

import type { Scheduler } from './types.js';

// 10 seconds
const TICK_INTERVAL_MS = 10 * 1000;

/**
 * Central scheduler orchestration service
 * Manages all schedulers with a single tick loop (every 10 seconds)
 */
export function createSchedulerService(
  fastify: FastifyInstance,
  schedulers: Record<SchedulerName, Scheduler>,
) {
  let timer: NodeJS.Timeout | null = null;

  /**
   * Execute a scheduler
   */
  async function executeScheduler(scheduler: Scheduler): Promise<void> {
    const now = Date.now();
    const { interval } = scheduler.config;

    scheduler.state.isRunning = true;
    scheduler.state.lastError = null;

    const scheduleNext = () => {
      scheduler.state.nextRun = Date.now() + interval;
    };

    const terminate = () => {
      scheduler.state.nextRun = null;
      scheduler.state.enabled = false;
      scheduler.state.startedAt = null;
    };

    try {
      fastify.log.debug(
        { name: 'scheduler', schedulerName: scheduler.config.name },
        'Executing scheduler',
      );

      const shouldContinue = await scheduler.run(fastify);

      const duration = Date.now() - now;
      const totalRuntime = isDefined(scheduler.state.startedAt)
        ? Date.now() - scheduler.state.startedAt
        : 0;

      scheduler.state.lastRun = now;
      scheduler.state.lastDuration = duration;

      const exceededMaxRuntime =
        shouldContinue &&
        isDefined(scheduler.config.maxRuntime) &&
        totalRuntime > scheduler.config.maxRuntime;

      const belowMinRuntime =
        !shouldContinue &&
        isDefined(scheduler.config.minRuntime) &&
        totalRuntime < scheduler.config.minRuntime;

      if (exceededMaxRuntime) {
        terminate();

        fastify.log.debug(
          {
            name: 'scheduler',
            schedulerName: scheduler.config.name,
            duration,
            totalRuntime,
            maxRuntime: scheduler.config.maxRuntime,
          },
          'Scheduler still running after maximum runtime - terminating',
        );

        return;
      }

      if (belowMinRuntime || shouldContinue) {
        scheduleNext();

        fastify.log.debug(
          {
            name: 'scheduler',
            schedulerName: scheduler.config.name,
            duration,
            totalRuntime,
            nextRunIn: Math.round(interval / 1000),
            ...(isDefined(scheduler.config.minRuntime) && {
              minRuntime: scheduler.config.minRuntime,
            }),
          },
          isDefined(scheduler.config.minRuntime)
            ? 'Scheduler requested termination but within minimum runtime - rescheduling'
            : 'Scheduler completed',
        );

        return;
      }

      terminate();

      fastify.log.info(
        {
          name: 'scheduler',
          schedulerName: scheduler.config.name,
          duration,
          totalRuntime,
        },
        'Scheduler self-terminated',
      );
    } catch (error) {
      const duration = Date.now() - now;

      scheduler.state.lastRun = now;
      scheduler.state.lastDuration = duration;
      scheduler.state.lastError = getErrorMessage(error);

      scheduleNext();

      fastify.log.error(
        {
          name: 'scheduler',
          schedulerName: scheduler.config.name,
          duration,
          error: scheduler.state.lastError,
          retryInSec: interval / 1000,
        },
        'Scheduler failed, retrying',
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
      executeScheduler(scheduler).catch((error: unknown) => {
        fastify.log.error(
          { name: 'scheduler', schedulerName: scheduler.config.name, err: error },
          'Unexpected error in scheduler execution',
        );
      });
    }

    // Schedule next tick
    timer = setTimeout(() => {
      tick();
    }, TICK_INTERVAL_MS);

    // Don't keep Node.js process alive
    timer.unref();
  }

  return {
    /**
     * Start a scheduler (enable + schedule next run)
     */
    start(params: SchedulerParams): void {
      const scheduler = schedulers[params.name];

      scheduler.state.enabled = true;

      // Initialize startedAt if first start
      if (!isDefined(scheduler.state.startedAt)) {
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
        'Manually triggering scheduler',
      );
      await executeScheduler(scheduler);
    },

    /**
     * Set enabled state of a scheduler only if it differs from current state.
     * Avoids redundant start/stop calls and their log noise.
     */
    setState(params: SchedulerParams & { enabled: boolean }): void {
      const scheduler = schedulers[params.name];
      if (scheduler.state.enabled === params.enabled) {
        return;
      }
      if (params.enabled) {
        this.start(params);
      } else {
        this.stop(params);
      }
    },
    /**
     * Get state of one or all schedulers
     */
    getState(): SchedulerInfo[] {
      return Object.values(schedulers).map((s) => ({ ...s.config, ...s.state }));
    },

    /**
     * Start the orchestration loop
     */
    startOrchestration() {
      fastify.log.info(
        { name: 'scheduler', tickIntervalSec: TICK_INTERVAL_MS / 1000 },
        'Starting scheduler orchestration',
      );

      // Initialize schedulers that should run on startup
      for (const scheduler of Object.values(schedulers)) {
        if (Boolean(scheduler.config.runOnStartup) && scheduler.config.enabled) {
          scheduler.state.nextRun = Date.now();
        } else if (scheduler.config.enabled) {
          // Schedule first run at interval
          scheduler.state.nextRun = Date.now() + scheduler.config.interval;
        }
      }

      // Start tick loop
      tick();
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
