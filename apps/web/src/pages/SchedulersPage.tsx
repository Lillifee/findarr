import { useTranslation } from 'react-i18next';

import { SchedulerCardList } from '../components/schedulers/SchedulerCardList';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { LoadingState } from '../components/ui/StateDisplay';
import { useSchedulers } from '../hooks/useSchedulers';

export function SchedulersPage() {
  const { t } = useTranslation();
  const { schedulers, isLoading, error, actionLoading, trigger, toggle } = useSchedulers();

  const handleTrigger = (name: string) => {
    void trigger(name);
  };

  const handleToggle = (name: string, enabled: boolean) => {
    void toggle(name, enabled);
  };

  return (
    <PageContainer>
      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <LoadingState />
        </div>
      ) : error ? (
        <div className="p-4">
          <div className="rounded border border-red-700 bg-red-900/50 p-3 text-red-200">
            {error}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <PageHeader title={t('schedulers.title')} description={t('schedulers.description')} />

          <SchedulerCardList
            schedulers={schedulers}
            actionLoading={actionLoading}
            onTrigger={handleTrigger}
            onToggle={handleToggle}
          />
        </div>
      )}
    </PageContainer>
  );
}
