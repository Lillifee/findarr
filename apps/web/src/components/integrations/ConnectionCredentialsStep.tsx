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
  return (
    <StepPanel
      title="Step 1"
      message="Save the server URL and API key before testing the connection."
    >
      <div>
        <label className="mb-1.5 block text-sm text-zinc-300">Server URL</label>
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
