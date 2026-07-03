import { useTranslation } from 'react-i18next';

import { LogList } from '../components/logs/LogList';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { LoadingState } from '../components/ui/StateDisplay';
import { useLogs } from '../hooks/useLogs';

export function LogsPage() {
  const { t } = useTranslation();
  const { logs, isLoading, error, refresh } = useLogs();

  const handleRefresh = () => {
    void refresh();
  };

  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem)] max-w-7xl flex-col gap-5 px-4 py-6 md:h-screen md:px-8 md:py-10">
      <PageHeader
        title={t('logs.title')}
        description={t('logs.description')}
        action={
          <Button variant="secondary" loading={isLoading} onClick={handleRefresh}>
            {t('logs.refresh')}
          </Button>
        }
      />

      {error ? (
        <div className="rounded border border-red-700 bg-red-900/50 p-3 text-red-200">{error}</div>
      ) : isLoading && logs.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-8">
          <LoadingState />
        </div>
      ) : (
        <LogList logs={logs} />
      )}
    </div>
  );
}
