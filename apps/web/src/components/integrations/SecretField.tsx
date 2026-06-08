import { Input } from '../ui/Input';

interface SecretFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isSet: boolean;
  placeholder: string;
}

export function SecretField({ label, value, onChange, isSet, placeholder }: SecretFieldProps) {
  return (
    <div>
      <label className="mb-1.5 block text-sm text-gray-300">
        {label}
        {isSet && !value && (
          <span className="ml-2 text-xs font-normal text-gray-500">
            (already set — leave blank to keep)
          </span>
        )}
      </label>
      <Input
        type="password"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        placeholder={isSet ? '••••••••••••••••' : placeholder}
        autoComplete="new-password"
      />
    </div>
  );
}
