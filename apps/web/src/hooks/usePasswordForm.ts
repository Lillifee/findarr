import { useState } from 'react';

import { authService } from '../services/api';

interface PasswordFields {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface PasswordStatus {
  error: string;
  success: string;
  submitting: boolean;
}

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

const emptyFields: PasswordFields = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

const idleStatus: PasswordStatus = {
  error: '',
  success: '',
  submitting: false,
};

export function usePasswordForm(): PasswordChangeForm {
  const [fields, setFields] = useState<PasswordFields>(emptyFields);
  const [status, setStatus] = useState<PasswordStatus>(idleStatus);

  const canSubmit = Boolean(
    fields.currentPassword && fields.newPassword && fields.confirmPassword && !status.submitting,
  );

  const submit = async () => {
    setStatus(idleStatus);

    if (fields.newPassword !== fields.confirmPassword) {
      setStatus({ ...idleStatus, error: 'New password and confirmation must match.' });
      return;
    }

    setStatus({ ...idleStatus, submitting: true });

    try {
      await authService.changePassword({
        currentPassword: fields.currentPassword,
        newPassword: fields.newPassword,
      });
      setFields(emptyFields);
      setStatus({ ...idleStatus, success: 'Password updated successfully.' });
    } catch {
      setStatus({
        ...idleStatus,
        error: 'Failed to change password. Check your current password and try again.',
      });
    }
  };

  return {
    ...fields,
    ...status,
    canSubmit,
    setCurrentPassword: (currentPassword) => {
      setFields((prev) => ({ ...prev, currentPassword }));
    },
    setNewPassword: (newPassword) => {
      setFields((prev) => ({ ...prev, newPassword }));
    },
    setConfirmPassword: (confirmPassword) => {
      setFields((prev) => ({ ...prev, confirmPassword }));
    },
    submit,
  };
}
