import type { MediaStatus } from '@findarr/shared/media';

export type ActivityAudience = 'mine' | 'everyone';
export type ActivityStatusGroup = 'voting' | 'requested' | 'available' | 'downloading' | 'warning';

export const activityStatusGroups = {
  voting: ['voting'],
  requested: ['requested'],
  available: ['downloaded', 'available'],
  downloading: ['downloading'],
  warning: ['warning'],
} as const satisfies Record<ActivityStatusGroup, readonly MediaStatus[]>;
