import { useState } from 'react';

import { useAuth } from '../hooks/useAuth';
import { asVoid } from '../utils/asyncHandlers';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  async function handleSubmit(e: React.ChangeEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 px-4">
      <div className="w-full max-w-md">
        <Card variant="solid" padding="lg">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold text-white">Findarr</h1>
            <p className="text-gray-400">Sign in to your account</p>
          </div>

          <form onSubmit={asVoid(handleSubmit)} className="space-y-6">
            <Input
              id="email"
              type="email"
              label="Email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
              }}
              required
              placeholder="you@example.com"
            />

            <Input
              id="password"
              type="password"
              label="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
              }}
              required
              placeholder="••••••••"
            />

            {error && (
              <div className="rounded-lg border border-red-700 bg-red-900/50 px-4 py-3 text-red-200">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              loading={isLoading}
              variant="primary"
              className="w-full"
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
