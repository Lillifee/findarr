import type { MediaStatus } from '@findarr/shared/media';

export type ActivityAudience = 'mine' | 'everyone';
export type ActivityStatusGroup = 'all' | 'voting' | 'requested' | 'available' | 'attention';

export const activityStatusGroups = {
  all: ['none', 'voting', 'requested', 'downloading', 'downloaded', 'available', 'warning'],
  voting: ['voting'],
  requested: ['requested'],
  available: ['downloaded', 'available'],
  attention: ['downloading', 'warning'],
} as const satisfies Record<ActivityStatusGroup, readonly MediaStatus[]>;
