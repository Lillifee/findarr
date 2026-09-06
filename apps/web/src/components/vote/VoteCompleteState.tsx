import { useTranslation } from 'react-i18next';

import { useMediaNavigation } from '../../hooks/useMediaNavigation';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { StateDisplay } from '../ui/StateDisplay';

interface VoteCompleteStateProps {
  onPrimaryAction: () => void;
}

export function VoteCompleteState({ onPrimaryAction }: VoteCompleteStateProps) {
  const { t } = useTranslation();
  const { goTo } = useMediaNavigation();
  return (
    <StateDisplay
      className="py-24"
      icon={<Icon className="text-amber-300/80" name="check_circle" size="display" />}
      title={t('vote.complete.title')}
      message={t('vote.complete.message')}
      action={
        <>
          <Button onClick={onPrimaryAction}>{t('vote.complete.nextUp')}</Button>
          <Button
            variant="secondary"
            onClick={() => {
              goTo('/settings');
            }}
          >
            {t('vote.complete.openSettings')}
          </Button>
        </>
      }
    />
  );
}
