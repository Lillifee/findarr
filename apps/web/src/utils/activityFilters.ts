import type { MediaStatus } from '@findarr/shared/media';

export type ActivityAudience = 'mine' | 'everyone';
export type ActivityStatusGroup = 'all' | 'voted' | 'requested' | 'available' | 'attention';

export const activityStatusGroups = {
  all: ['none', 'voted', 'requested', 'downloading', 'downloaded', 'available', 'warning'],
  voted: ['voted'],
  requested: ['requested'],
  available: ['downloaded', 'available'],
  attention: ['downloading', 'warning'],
} as const satisfies Record<ActivityStatusGroup, readonly MediaStatus[]>;
