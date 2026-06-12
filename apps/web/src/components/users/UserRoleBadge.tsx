interface UserRoleBadgeProps {
  role: string;
  className?: string;
}

export function UserRoleBadge({ role, className = '' }: UserRoleBadgeProps) {
  const toneClass =
    role === 'admin'
      ? 'border-amber-400/45 bg-amber-400/12 text-amber-100'
      : 'border-zinc-800 bg-zinc-900 text-zinc-300';

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${toneClass} ${className}`}
    >
      {role}
    </span>
  );
}
