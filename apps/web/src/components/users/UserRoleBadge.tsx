interface UserRoleBadgeProps {
  role: string;
  className?: string;
}

export function UserRoleBadge({ role, className = '' }: UserRoleBadgeProps) {
  const toneClass =
    role === 'admin'
      ? 'border-gray-300 bg-gray-200 text-gray-950'
      : 'border-gray-700 bg-gray-800 text-gray-300';

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${toneClass} ${className}`}
    >
      {role}
    </span>
  );
}
