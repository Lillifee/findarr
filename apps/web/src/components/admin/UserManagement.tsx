import type { User } from '@findarr/shared/auth';
import { useState, useEffect } from 'react';

import { adminUserService } from '../../services/api';
import { asVoid } from '../../utils/asyncHandlers';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { PageHeader } from '../ui/PageHeader';
import { SelectInput } from '../ui/SelectInput';

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    role: 'user' as 'user' | 'admin',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function loadUsers() {
    try {
      setUsers(await adminUserService.listUsers());
    } catch {
      console.error('Failed to load users');
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function handleCreateUser(e: React.ChangeEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await adminUserService.createUser(formData);
      setFormData({ email: '', password: '', displayName: '', role: 'user' });
      setShowCreateForm(false);
      await loadUsers();
    } catch {
      setError('Failed to create user');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteUser(userId: number) {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      await adminUserService.deleteUser(userId);
      await loadUsers();
    } catch {
      alert('Failed to delete user');
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Users"
        description="Manage access, roles, and invitations for people using Findarr."
        action={
          <Button
            type="button"
            variant={showCreateForm ? 'secondary' : 'success'}
            size="sm"
            onClick={() => {
              setShowCreateForm(!showCreateForm);
            }}
            className="w-full sm:w-auto"
          >
            {showCreateForm ? 'Cancel' : 'Create user'}
          </Button>
        }
      />

      {showCreateForm && (
        <Card variant="solid" padding="md" className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Create New User</h3>
          <form onSubmit={asVoid(handleCreateUser)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm text-gray-300">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                  }}
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-gray-300">Display Name</label>
                <Input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => {
                    setFormData({ ...formData, displayName: e.target.value });
                  }}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm text-gray-300">Password</label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                  }}
                  required
                  minLength={8}
                />
              </div>
              <div>
                <SelectInput
                  label="Role"
                  value={formData.role}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      role: e.target.value === 'admin' ? 'admin' : 'user',
                    });
                  }}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </SelectInput>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={isLoading} size="sm">
                {isLoading ? 'Creating...' : 'Create User'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCreateForm(false);
                }}
              >
                Close
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card variant="solid" padding="none" className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-800 text-left text-sm text-gray-400">
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Display Name</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3">Created</th>
              <th className="px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-gray-800 last:border-b-0">
                <td className="px-5 py-4 text-sm text-gray-300">{user.email}</td>
                <td className="px-5 py-4 text-sm text-white">{user.displayName}</td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                      user.role === 'admin'
                        ? 'border-gray-300 bg-gray-200 text-gray-950'
                        : 'border-gray-700 bg-gray-800 text-gray-300'
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-5 py-4 text-sm text-gray-400">
                  {new Date(user.createdAt * 1000).toLocaleDateString()}
                </td>
                <td className="px-5 py-4">
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={asVoid(async () => handleDeleteUser(user.id))}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="space-y-3 md:hidden">
        {users.map((user) => (
          <Card key={user.id} variant="solid" padding="md" className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="mb-1 text-sm font-semibold text-white">{user.displayName}</h3>
                <div className="truncate text-xs text-gray-400">{user.email}</div>
              </div>
              <span
                className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${
                  user.role === 'admin'
                    ? 'border-gray-300 bg-gray-200 text-gray-950'
                    : 'border-gray-700 bg-gray-800 text-gray-300'
                }`}
              >
                {user.role}
              </span>
            </div>

            <div className="text-xs text-gray-400">
              Created {new Date(user.createdAt * 1000).toLocaleDateString()}
            </div>

            <Button
              type="button"
              variant="danger"
              size="sm"
              className="w-full"
              onClick={asVoid(async () => handleDeleteUser(user.id))}
            >
              Delete User
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
