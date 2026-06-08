import type { CreateUser } from '@findarr/shared/auth';
import { useState, type ChangeEvent } from 'react';

import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { SelectInput } from '../ui/SelectInput';

const emptyForm: CreateUser = { email: '', password: '', displayName: '', role: 'user' };

interface CreateUserFormProps {
  onCreate: (data: CreateUser) => Promise<void>;
  onClose: () => void;
}

export function CreateUserForm({ onCreate, onClose }: CreateUserFormProps) {
  const [formData, setFormData] = useState<CreateUser>(emptyForm);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: ChangeEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await onCreate(formData);
      setFormData(emptyForm);
      onClose();
    } catch {
      setError('Failed to create user');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card variant="solid" padding="md" className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Create New User</h3>
      <form
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
        className="space-y-4"
      >
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
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </form>
    </Card>
  );
}
