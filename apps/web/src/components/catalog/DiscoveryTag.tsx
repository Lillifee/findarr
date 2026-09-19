import type { DiscoveryType } from '../../utils/catalogSearchParams';
import { Icon } from '../ui/Icon';
import { discoveryIcons } from './discoveryTagConfig';
import { discoveryTagClassName } from './discoveryTagStyles';

interface DiscoveryTagProps {
  type: DiscoveryType;
  name: string;
  onClick: () => void;
}

export function DiscoveryTag({ type, name, onClick }: DiscoveryTagProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${discoveryTagClassName} transition-colors hover:border-amber-500/60 hover:text-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400`}
    >
      <Icon name={discoveryIcons[type]} size="xs" />
      <span className="max-w-40 truncate">{name}</span>
    </button>
  );
}
