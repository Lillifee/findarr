import { useTranslation } from 'react-i18next';

import { Input } from '../ui/Input';
import { SecretField } from './SecretField';
import { StepPanel } from './StepPanel';

interface ConnectionCredentialsStepProps {
  urlValue: string;
  urlPlaceholder: string;
  apiKeyValue: string;
  apiKeySet: boolean;
  apiKeyLabel?: string;
  apiKeyPlaceholder?: string;
  onUrlChange: (value: string) => void;
  onApiKeyChange: (value: string) => void;
}

export function ConnectionCredentialsStep({
  urlValue,
  urlPlaceholder,
  apiKeyValue,
  apiKeySet,
  apiKeyLabel = 'API Key',
  apiKeyPlaceholder = 'Enter API key',
  onUrlChange,
  onApiKeyChange,
}: ConnectionCredentialsStepProps) {
  const { t } = useTranslation();
  return (
    <StepPanel step={1} message={t('integrationCard.credentials.stepMessage')}>
      <div>
        <label className="mb-1.5 block text-sm text-zinc-300">
          {t('integrationCard.credentials.serverUrlLabel')}
        </label>
        <Input
          type="url"
          value={urlValue}
          onChange={(event) => {
            onUrlChange(event.target.value);
          }}
          placeholder={urlPlaceholder}
        />
      </div>

      <SecretField
        label={apiKeyLabel}
        value={apiKeyValue}
        onChange={onApiKeyChange}
        isSet={apiKeySet}
        placeholder={apiKeyPlaceholder}
      />
    </StepPanel>
  );
}
