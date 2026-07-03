import { LOG_LEVELS, LogLevelSchema } from '@findarr/shared/logs';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { LogList } from '../components/logs/LogList';
import { Button } from '../components/ui/Button';
import { SelectInput } from '../components/ui/SelectInput';
import { LoadingState } from '../components/ui/StateDisplay';
import { StickyHeader } from '../components/ui/StickyHeader';
import { useLogs } from '../hooks/useLogs';

export function LogsPage() {
  const { t } = useTranslation();
  const { logs, level, isLoading, error, refresh, changeLevel } = useLogs();

  const handleRefresh = () => {
    void refresh();
  };

  const handleLevelChange = (event: ChangeEvent<HTMLSelectElement>) => {
    void changeLevel(LogLevelSchema.parse(event.target.value));
  };

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col md:h-screen">
      <StickyHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium whitespace-nowrap text-gray-300">
              {t('logs.level')}
            </span>
            <div className="w-36">
              <SelectInput
                fontSize="sm"
                value={level ?? ''}
                disabled={level === null}
                onChange={handleLevelChange}
                aria-label={t('logs.level')}
              >
                {LOG_LEVELS.map((logLevel) => (
                  <option key={logLevel} value={logLevel}>
                    {logLevel}
                  </option>
                ))}
              </SelectInput>
            </div>
          </div>

          <Button variant="secondary" loading={isLoading} onClick={handleRefresh}>
            {t('logs.refresh')}
          </Button>
        </div>
      </StickyHeader>

      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-4 py-6 md:px-8 md:py-10">
        {error ? (
          <div className="rounded border border-red-700 bg-red-900/50 p-3 text-red-200">
            {error}
          </div>
        ) : isLoading && logs.length === 0 ? (
          <div className="flex flex-1 items-center justify-center p-8">
            <LoadingState />
          </div>
        ) : (
          <LogList logs={logs} />
        )}
      </div>
    </div>
  );
}
