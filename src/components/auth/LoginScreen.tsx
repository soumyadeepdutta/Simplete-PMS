import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../services/api';

interface LoginScreenProps {
  onBack?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onBack }) => {
  const { login, setup, needsSetup, error: authError } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (needsSetup) {
        await setup({
          name: name.trim(),
          email: email.trim(),
          password,
          setupToken: setupToken.trim() || undefined,
        });
      } else {
        await login(email.trim(), password);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-page-atmosphere p-4">
      <div className="w-full max-w-md bg-glass-strong border border-glass rounded-2xl shadow-elevated p-8">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to overview</span>
          </button>
        )}

        <div className="mb-6">
          <h1 className="text-xl font-semibold text-ink tracking-tight">Simplete PMS</h1>
          <p className="text-sm text-ink-muted mt-1">
            {needsSetup
              ? 'Create the owner account for this self-hosted instance.'
              : 'Sign in to your workspace.'}
          </p>
        </div>

        {(error || authError) && (
          <div className="mb-4 text-xs text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl px-3 py-2">
            {error || authError}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          {needsSetup && (
            <>
              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1.5">Name</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-border bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1.5">
                  Setup token (if configured)
                </label>
                <input
                  value={setupToken}
                  onChange={(e) => setSetupToken(e.target.value)}
                  placeholder="Optional"
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-border bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-border bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1.5">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-border bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 text-sm font-medium bg-accent-blue text-white rounded-xl hover:opacity-90 disabled:opacity-50"
          >
            {busy ? 'Please wait…' : needsSetup ? 'Create owner account' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
};
