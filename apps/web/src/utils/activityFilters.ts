import type { MediaStatus } from '@findarr/shared/media';

export type ActivityAudience = 'mine' | 'everyone';
export type ActivityStatus = MediaStatus;

export const ALL_ACTIVITY_STATUSES: ActivityStatus[] = [
  'none',
  'voting',
  'requested',
  'downloading',
  'downloaded',
  'available',
  'warning',
];
