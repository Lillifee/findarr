import type { CastMember } from '@findarr/shared/media';

const TOP_CAST_LIMIT = 3;

export const getTopCast = (cast: CastMember[] | undefined) =>
  (cast ?? []).toSorted((first, second) => first.order - second.order).slice(0, TOP_CAST_LIMIT);
