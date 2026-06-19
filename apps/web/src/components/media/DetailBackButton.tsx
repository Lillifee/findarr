import { useTranslation } from 'react-i18next';

import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

interface DetailBackButtonProps {
  onClick: () => void;
}

export function DetailBackButton({ onClick }: DetailBackButtonProps) {
  const { t } = useTranslation();
  return (
    <div className="pointer-events-none fixed top-4 right-0 left-0 z-100 md:top-8 md:left-64">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <Button onClick={onClick} variant="secondary" className="pointer-events-auto">
          <Icon name="arrow_back" size="sm" />
          <span>{t('media.back')}</span>
        </Button>
      </div>
    </div>
  );
}
