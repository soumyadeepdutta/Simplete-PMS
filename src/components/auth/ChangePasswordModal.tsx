import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../services/api';
import { Modal } from '../ui/Modal';

export const ChangePasswordModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirm('');
    setError(null);
    setSuccess(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirm) {
      setError('New password and confirmation do not match.');
      return;
    }
    setBusy(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to change password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Change password"
      description="Update the password for your Simplete account."
      maxWidth="sm"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error && (
          <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl px-3 py-2">
            {error}
          </div>
        )}
        {success && (
          <div className="text-xs text-accent-green bg-accent-green-soft border border-accent-green/20 rounded-xl px-3 py-2">
            Password updated successfully.
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1.5">Current password</label>
          <input
            type="password"
            required
            minLength={8}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full text-sm px-3 py-2 rounded-xl border border-border bg-canvas text-ink"
            autoComplete="current-password"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1.5">New password</label>
          <input
            type="password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full text-sm px-3 py-2 rounded-xl border border-border bg-canvas text-ink"
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1.5">Confirm new password</label>
          <input
            type="password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full text-sm px-3 py-2 rounded-xl border border-border bg-canvas text-ink"
            autoComplete="new-password"
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-xs font-medium text-ink-muted hover:bg-surface-muted rounded-xl"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 text-xs font-medium bg-accent-blue text-white rounded-xl disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Update password'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
