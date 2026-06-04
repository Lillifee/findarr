import { z } from 'zod';

// ============================================================================
// Scheduler Types
// ============================================================================

/**
 * Configuration for a scheduler
 */
export interface SchedulerConfig {
  name: string;
  description: string;
  interval: number;
  enabled: boolean;
  runOnStartup?: boolean;
  minRuntime?: number;
  maxRuntime?: number;
}

/**
 * Runtime state of a scheduler
 */
export interface SchedulerState {
  enabled: boolean;
  isRunning: boolean;
  lastRun: number | null;
  nextRun: number | null;
  lastDuration: number | null;
  lastError: string | null;
  startedAt: number | null;
}

export type SchedulerInfo = SchedulerConfig & SchedulerState;

// ============================================================================
// Scheduler Schemas
// ============================================================================

/**
 * Union type of all valid scheduler names
 */
export const SchedulerNameSchema = z.enum([
  'jellyfinLibrarySync',
  'jellyfinQueueSync',
  'radarrLibrarySync',
  'radarrQueueMonitor',
  'radarrQueueFastSync',
  'sonarrLibrarySync',
  'sonarrQueueMonitor',
  'sonarrQueueFastSync',
  'catalogCacheSync',
  'catalogKeywordEnrichment',
] as const);

export const SchedulerParamsSchema = z.object({
  name: SchedulerNameSchema,
});

export type SchedulerName = z.infer<typeof SchedulerNameSchema>;
export type SchedulerParams = z.infer<typeof SchedulerParamsSchema>;
