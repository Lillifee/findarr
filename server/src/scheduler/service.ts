import { getErrorMessage } from '@findarr/shared';
import type { FastifyInstance } from 'fastify';
import type { SchedulerName } from './registry.js';
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
      fastify.log.debug({ name: scheduler.config.name }, `Executing scheduler`);

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
            name: scheduler.config.name,
            duration,
            nextRunIn: Math.round(scheduler.config.interval / 1000),
          },
          `Scheduler completed`
        );
      } else {
        // Scheduler wants to self-terminate - check minimum runtime
        if (scheduler.config.minRuntime && duration < scheduler.config.minRuntime) {
          // Too early to terminate - reschedule instead
          scheduler.state.nextRun = Date.now() + scheduler.config.interval;
          fastify.log.debug(
            {
              name: scheduler.config.name,
              duration,
              minRuntime: scheduler.config.minRuntime,
              nextRunIn: Math.round(scheduler.config.interval / 1000),
            },
            `Scheduler requested termination but within minimum runtime - rescheduling`
          );
        } else {
          // Allow self-termination
          scheduler.state.nextRun = null;
          scheduler.state.enabled = false;
          fastify.log.info({ name: scheduler.config.name, duration }, `Scheduler self-terminated`);
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
        { name: scheduler.config.name, duration },
        `Scheduler failed, ${scheduler.state.lastError} retrying in ${scheduler.config.interval / 1000}s`
      );
    } finally {
      scheduler.state.isRunning = false;
    }
  }

  /**
   * Orchestration tick - checks all schedulers and runs if due
   */
  async function tick(): Promise<void> {
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
          { error, name: scheduler.config.name },
          `Unexpected error in scheduler execution`
        );
      });
    }

    // Schedule next tick
    timer = setTimeout(() => tick(), TICK_INTERVAL_MS);
    timer.unref(); // Don't keep Node.js process alive
  }

  return {
    /**
     * Start a scheduler (enable + schedule next run)
     */
    start(name: SchedulerName): void {
      const scheduler = schedulers[name];

      scheduler.start();

      // Schedule immediate run if not already running
      if (!scheduler.state.isRunning && scheduler.state.nextRun === null) {
        scheduler.state.nextRun = Date.now();
      }

      fastify.log.info({ name }, `Scheduler '${name}' started`);
    },

    /**
     * Stop a scheduler (disable + clear next run)
     */
    stop(name: SchedulerName): void {
      const scheduler = schedulers[name];

      scheduler.stop();
      fastify.log.info({ name }, `Scheduler '${name}' stopped`);
    },

    /**
     * Manually trigger a scheduler (immediate run)
     */
    async trigger(name: SchedulerName): Promise<void> {
      const scheduler = schedulers[name];

      if (scheduler.state.isRunning) {
        throw new Error(`Scheduler '${name}' is already running`);
      }

      fastify.log.info({ name }, `Manually triggering scheduler '${name}'`);
      await executeScheduler(scheduler);
    },

    /**
     * Get state of one or all schedulers
     */
    getState(name?: SchedulerName): SchedulerState | SchedulerState[] {
      if (name) {
        return { ...schedulers[name].state };
      }

      return Object.values(schedulers).map(s => ({ ...s.state }));
    },

    /**
     * Start the orchestration loop
     */
    startOrchestration(): void {
      fastify.log.info(
        { tickIntervalSec: TICK_INTERVAL_MS / 1000 },
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
      fastify.log.info('Stopped scheduler orchestration');
    },
  };
}

export type SchedulerService = ReturnType<typeof createSchedulerService>;
