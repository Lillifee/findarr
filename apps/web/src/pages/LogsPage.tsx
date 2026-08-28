import { LOG_LEVELS, LogLevelSchema } from '@findarr/shared/logs';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { LogList } from '../components/logs/LogList';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { SelectInput } from '../components/ui/SelectInput';
import { LoadingState } from '../components/ui/StateDisplay';
import { StickyHeader } from '../components/ui/StickyHeader';
import { useLogs } from '../hooks/useLogs';
import { useVersionInfo } from '../hooks/useVersionInfo';

export function LogsPage() {
  const { t } = useTranslation();
  const { logs, level, isLoading, error, refresh, changeLevel } = useLogs();
  const versionInfo = useVersionInfo(true);

  const handleRefresh = () => {
    void refresh();
  };

  const handleLevelChange = (event: ChangeEvent<HTMLSelectElement>) => {
    void changeLevel(LogLevelSchema.parse(event.target.value));
  };

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col md:h-screen">
      <StickyHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-semibold whitespace-nowrap text-gray-200">
            {versionInfo
              ? t('logs.appVersion', { version: versionInfo.current })
              : t('logs.appName')}
          </span>

          <div className="flex w-full min-w-0 items-center gap-3 sm:w-auto">
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
              <span className="text-sm font-medium whitespace-nowrap text-gray-300">
                {t('logs.level')}
              </span>
              <div className="min-w-0 flex-1 sm:w-36 sm:flex-none">
                <SelectInput
                  fontSize="md"
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

            <Button
              variant="secondary"
              loading={isLoading}
              onClick={handleRefresh}
              aria-label={t('logs.refresh')}
              className="w-10 shrink-0 justify-center sm:w-28"
            >
              {!isLoading && <Icon name="refresh" size="sm" />}
              <span className="hidden sm:inline">{t('logs.refresh')}</span>
            </Button>
          </div>
        </div>
      </StickyHeader>

      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-4 py-6 md:px-8 md:py-10">
        {versionInfo?.updateAvailable === true && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded border border-amber-700/60 bg-amber-900/30 p-3 text-sm text-amber-200">
            <span>
              {t('logs.updateAvailable', {
                current: versionInfo.current,
                latest: versionInfo.latest,
              })}
            </span>
            <a
              href="https://github.com/lillifee/findarr/releases"
              target="_blank"
              rel="noreferrer"
              className="font-medium whitespace-nowrap text-amber-100 underline"
            >
              {t('logs.viewRelease')}
            </a>
          </div>
        )}

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
