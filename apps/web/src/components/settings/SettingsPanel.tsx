import { isDefined } from '@findarr/shared/utils';

import { Card } from '../ui/Card';

interface SettingsPanelProps {
  title: string;
  description?: string;
}

export function SettingsPanel({
  title,
  description,
  children,
}: React.PropsWithChildren<SettingsPanelProps>) {
  return (
    <Card variant="solid" padding="none" className="overflow-hidden">
      <div className="border-b border-zinc-800 px-5 py-4 md:px-6">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {isDefined(description) && <p className="mt-1 text-sm text-zinc-400">{description}</p>}
      </div>
      <div className="px-5 py-5 md:px-6 md:py-6">{children}</div>
    </Card>
  );
}
