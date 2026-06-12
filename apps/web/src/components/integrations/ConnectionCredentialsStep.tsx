import { Input } from '../ui/Input';
import { SecretField } from './SecretField';
import { StepPanel } from './StepPanel';

interface ConnectionCredentialsStepProps {
  urlValue: string;
  onUrlChange: (value: string) => void;
  urlPlaceholder: string;
  apiKeyValue: string;
  onApiKeyChange: (value: string) => void;
  apiKeySet: boolean;
}

export function ConnectionCredentialsStep({
  urlValue,
  onUrlChange,
  urlPlaceholder,
  apiKeyValue,
  onApiKeyChange,
  apiKeySet,
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
        label="API Key"
        value={apiKeyValue}
        onChange={onApiKeyChange}
        isSet={apiKeySet}
        placeholder="Enter API key"
      />
    </StepPanel>
  );
}
