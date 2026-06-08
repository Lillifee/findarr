import type { User } from '@findarr/shared/auth';

import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { UserRoleBadge } from './UserRoleBadge';

interface UserCardListProps {
  users: User[];
  onDelete: (userId: number) => void;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/u).filter(Boolean);
  const first = parts.at(0);

  if (first === undefined) {
    return '?';
  }
  if (parts.length === 1) {
    return first.slice(0, 2).toUpperCase();
  }

  const last = parts.at(-1) ?? first;
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

export function UserCardList({ users, onDelete }: UserCardListProps) {
  return (
    <div className="space-y-3">
      {users.map((user) => (
        <Card key={user.id} variant="solid" padding="md">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-sm font-semibold text-amber-300">
                {getInitials(user.displayName)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-semibold text-white">{user.displayName}</h3>
                  <UserRoleBadge role={user.role} className="shrink-0" />
                </div>
                <div className="mt-0.5 truncate text-xs text-gray-400">{user.email}</div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 sm:justify-end">
              <div className="text-xs text-gray-500 sm:text-right">
                <span className="block text-[11px] tracking-wide text-gray-600 uppercase">
                  Created
                </span>
                {new Date(user.createdAt * 1000).toLocaleDateString()}
              </div>

              <Button
                type="button"
                variant="danger"
                size="sm"
                className="shrink-0"
                onClick={() => {
                  onDelete(user.id);
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
