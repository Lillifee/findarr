import { useTranslation } from 'react-i18next';

import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { StateDisplay } from '../ui/StateDisplay';

interface VoteCompleteStateProps {
  onExplore: () => void;
  onOpenSettings: () => void;
}

export function VoteCompleteState({ onExplore, onOpenSettings }: VoteCompleteStateProps) {
  const { t } = useTranslation();
  return (
    <StateDisplay
      className="py-24"
      icon={<Icon className="text-amber-300/80" name="check_circle" size="display" />}
      title={t('vote.complete.title')}
      message={t('vote.complete.message')}
      action={
        <>
          <Button onClick={onExplore}>{t('vote.complete.explore')}</Button>
          <Button variant="secondary" onClick={onOpenSettings}>
            {t('vote.complete.openSettings')}
          </Button>
        </>
      }
    />
  );
}
