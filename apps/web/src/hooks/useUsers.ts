import type { CreateUser, User } from '@findarr/shared/auth';
import { useCallback, useEffect, useState } from 'react';

import { adminUserService } from '../services/api';

export interface UsersAdmin {
  users: User[];
  createUser: (data: CreateUser) => Promise<void>;
  deleteUser: (userId: number) => Promise<void>;
}

export function useUsers(): UsersAdmin {
  const [users, setUsers] = useState<User[]>([]);

  const load = useCallback(async () => {
    try {
      setUsers(await adminUserService.listUsers());
    } catch {
      console.error('Failed to load users');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createUser = useCallback(
    async (data: CreateUser) => {
      await adminUserService.createUser(data);
      await load();
    },
    [load],
  );

  const deleteUser = useCallback(
    async (userId: number) => {
      await adminUserService.deleteUser(userId);
      await load();
    },
    [load],
  );

  return { users, createUser, deleteUser };
}
