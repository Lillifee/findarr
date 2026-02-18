import type { User } from '@findarr/shared';
import { useState, useEffect } from 'react';
import { adminUserService } from '../../services/api';

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

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const users = await adminUserService.listUsers();
      setUsers(users);
    } catch {
      console.error('Failed to load users');
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
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
    <div className="p-4 md:p-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 md:mb-5">
        <h2 className="m-0 text-white text-xl md:text-2xl">User Management</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors cursor-pointer text-sm md:text-base"
        >
          {showCreateForm ? 'Cancel' : 'Create User'}
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-gray-800 p-4 md:p-5 rounded mb-4 md:mb-5 border border-gray-700">
          <h3 className="m-0 mb-4 text-white text-xl">Create New User</h3>
          <form onSubmit={handleCreateUser}>
            <div className="mb-3">
              <label className="block mb-1 text-gray-300">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                required
                className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mb-3">
              <label className="block mb-1 text-gray-300">Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={8}
                className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mb-3">
              <label className="block mb-1 text-gray-300">Display Name</label>
              <input
                type="text"
                value={formData.displayName}
                onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                required
                className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mb-4">
              <label className="block mb-1 text-gray-300">Role</label>
              <select
                value={formData.role}
                onChange={e =>
                  setFormData({ ...formData, role: e.target.value as 'user' | 'admin' })
                }
                className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {error && (
              <div className="p-3 mb-3 bg-red-900/50 text-red-200 rounded border border-red-700">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create User'}
            </button>
          </form>
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-800">
              <th className="p-3 text-left border-b-2 border-gray-700 text-gray-300">Email</th>
              <th className="p-3 text-left border-b-2 border-gray-700 text-gray-300">
                Display Name
              </th>
              <th className="p-3 text-left border-b-2 border-gray-700 text-gray-300">Role</th>
              <th className="p-3 text-left border-b-2 border-gray-700 text-gray-300">Created</th>
              <th className="p-3 text-left border-b-2 border-gray-700 text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-b border-gray-700">
                <td className="p-3 text-gray-300">{user.email}</td>
                <td className="p-3 text-gray-300">{user.displayName}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      user.role === 'admin' ? 'bg-yellow-600' : 'bg-green-600'
                    } text-white`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="p-3 text-gray-300">
                  {new Date(user.createdAt * 1000).toLocaleDateString()}
                </td>
                <td className="p-3">
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors cursor-pointer text-xs"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {users.map(user => (
          <div
            key={user.id}
            className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-3"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold text-sm mb-1">{user.displayName}</h3>
                <div className="text-xs text-gray-400 truncate">{user.email}</div>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs ${
                  user.role === 'admin' ? 'bg-yellow-600' : 'bg-green-600'
                } text-white font-medium shrink-0`}
              >
                {user.role}
              </span>
            </div>

            <div className="text-xs text-gray-400">
              Created {new Date(user.createdAt * 1000).toLocaleDateString()}
            </div>

            <button
              onClick={() => handleDeleteUser(user.id)}
              className="w-full px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors cursor-pointer text-xs font-medium"
            >
              Delete User
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
