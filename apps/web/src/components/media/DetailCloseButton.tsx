import { useTranslation } from 'react-i18next';

import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

interface DetailCloseButtonProps {
  onClick: () => void;
}

export function DetailCloseButton({ onClick }: DetailCloseButtonProps) {
  const { t } = useTranslation();

  return (
    <div className="absolute inset-x-0 top-0 z-20 mx-auto flex w-full max-w-7xl justify-end px-4 pt-4 md:px-8">
      <Button
        onClick={onClick}
        variant="secondary"
        className="h-10 w-10 p-0 shadow-lg"
        aria-label={t('common.close')}
        title={t('common.close')}
      >
        <Icon name="close" />
      </Button>
    </div>
  );
}
