import { SchedulerCardList } from '../components/schedulers/SchedulerCardList';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { useSchedulers } from '../hooks/useSchedulers';

export function SchedulersPage() {
  const { schedulers, isLoading, error, actionLoading, trigger, toggle } = useSchedulers();

  const handleTrigger = (name: string) => {
    void trigger(name);
  };

  const handleToggle = (name: string, enabled: boolean) => {
    void toggle(name, enabled);
  };

  return (
    <PageContainer className="py-6 pb-20 md:py-10">
      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <div className="text-gray-400">Loading schedulers...</div>
        </div>
      ) : error ? (
        <div className="p-4">
          <div className="rounded border border-red-700 bg-red-900/50 p-3 text-red-200">
            {error}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <PageHeader
            title="Schedulers"
            description="Monitor recurring jobs and trigger them manually when needed."
            action={<div className="text-sm text-gray-400">Auto-refreshes every 5 seconds</div>}
          />

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
