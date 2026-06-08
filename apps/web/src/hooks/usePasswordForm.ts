import { useState } from 'react';

import { authService } from '../services/api';

export interface PasswordChangeForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  error: string;
  success: string;
  submitting: boolean;
  canSubmit: boolean;
  setCurrentPassword: (value: string) => void;
  setNewPassword: (value: string) => void;
  setConfirmPassword: (value: string) => void;
  submit: () => Promise<void>;
}

export function usePasswordForm(): PasswordChangeForm {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = Boolean(currentPassword && newPassword && confirmPassword);

  const submit = async () => {
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation must match.');
      return;
    }

    setSubmitting(true);

    try {
      await authService.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Password updated successfully.');
    } catch {
      setError('Failed to change password. Check your current password and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return {
    currentPassword,
    newPassword,
    confirmPassword,
    error,
    success,
    submitting,
    canSubmit,
    setCurrentPassword,
    setNewPassword,
    setConfirmPassword,
    submit,
  };
}
