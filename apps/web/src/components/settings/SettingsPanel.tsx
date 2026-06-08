import { isDefined } from '@findarr/shared/utils';
import type { ReactNode } from 'react';

import { Card } from '../ui/Card';

interface SettingsPanelProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function SettingsPanel({ title, description, children }: SettingsPanelProps) {
  return (
    <Card variant="solid" padding="none" className="overflow-hidden">
      <div className="border-b border-gray-800 px-5 py-4 md:px-6">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {isDefined(description) && <p className="mt-1 text-sm text-gray-400">{description}</p>}
      </div>
      <div className="px-5 py-5 md:px-6 md:py-6">{children}</div>
    </Card>
  );
}
