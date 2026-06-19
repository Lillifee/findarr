import type { ArrSettings } from '@findarr/shared/settings';

export interface ArrSettingsFull extends ArrSettings {
  apiKey: string | null;
}
