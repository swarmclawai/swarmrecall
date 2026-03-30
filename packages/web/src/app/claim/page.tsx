'use client';

import { useAuth } from '@/lib/auth-context';
import { getAuth, googleProvider, githubProvider } from '@/lib/firebase';
import { signInWithPopup } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3300';

export default function ClaimPage() {
  const { user, loading, getToken } = useAuth();
  const router = useRouter();
  const [claimCode, setClaimCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setError('');
      await signInWithPopup(getAuth()!, googleProvider);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
    }
  };

  const handleGitHubLogin = async () => {
    try {
      setError('');
      await signInWithPopup(getAuth()!, githubProvider);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'GitHub sign-in failed');
    }
  };

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimCode.trim()) return;

    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const token = await getToken();
      if (!token) {
        setError('You must be signed in to claim an agent.');
        return;
      }

      const res = await fetch(`${API_URL}/api/v1/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ claimCode: claimCode.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error || data.message || `Claim failed (${res.status})`
        );
      }

      const data = await res.json();
      setSuccess('Agent claimed successfully! Redirecting...');
      setTimeout(() => {
        router.push(
          data.agentId
            ? `/dashboard/agents/${data.agentId}`
            : '/dashboard'
        );
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Claim failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#08080d]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366F1]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080d] text-[#e2e2ec] font-sans overflow-x-hidden">
      {/* Grid pattern overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      {/* Nav */}
      <nav className="relative z-10 border-b border-white/[0.05]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-[#6366F1]/20 flex items-center justify-center">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#818CF8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <span className="font-display font-bold text-lg tracking-tight text-white">
              SwarmRecall
            </span>
          </Link>
        </div>
      </nav>

      <main className="relative z-10 flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.08)_0%,transparent_70%)] pointer-events-none" />

        <div className="w-full max-w-md space-y-8 relative">
          {/* Header */}
          <div className="text-center space-y-3">
            <h1 className="font-display text-3xl font-bold tracking-tight text-white">
              Claim your agent
            </h1>
            <p className="text-[#7a7a96]">
              Enter the claim code your agent gave you to link it to your
              dashboard.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-8 space-y-6">
            {error && (
              <div className="rounded-lg bg-[#F43F5E]/10 border border-[#F43F5E]/20 px-4 py-3 text-sm text-[#F43F5E]">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-lg bg-[#34D399]/10 border border-[#34D399]/20 px-4 py-3 text-sm text-[#34D399]">
                {success}
              </div>
            )}

            {!user ? (
              <>
                <p className="text-sm text-[#7a7a96] text-center">
                  Sign in first to claim your agent.
                </p>
                <div className="space-y-3">
                  <button
                    onClick={handleGoogleLogin}
                    className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-[#e2e2ec] hover:bg-white/[0.06] transition-colors cursor-pointer"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Continue with Google
                  </button>

                  <button
                    onClick={handleGitHubLogin}
                    className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-[#e2e2ec] hover:bg-white/[0.06] transition-colors cursor-pointer"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        fillRule="evenodd"
                        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Continue with GitHub
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleClaim} className="space-y-4">
                <div>
                  <label
                    htmlFor="claimCode"
                    className="block text-sm font-medium text-[#7a7a96] mb-1"
                  >
                    Claim Code
                  </label>
                  <input
                    id="claimCode"
                    type="text"
                    required
                    value={claimCode}
                    onChange={(e) => setClaimCode(e.target.value)}
                    className="block w-full rounded-xl border border-white/[0.07] bg-[#0d0d14] px-3 py-2.5 text-sm text-[#e2e2ec] placeholder-[#42425c] focus:border-[#6366F1]/50 focus:ring-1 focus:ring-[#6366F1]/50 focus:outline-none transition-colors font-mono tracking-wider"
                    placeholder="e.g. ABC123XYZ"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting || !claimCode.trim()}
                  className="w-full rounded-xl bg-[#6366F1] hover:bg-[#818CF8] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition-colors cursor-pointer shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                >
                  {submitting ? 'Claiming...' : 'Claim Agent'}
                </button>
              </form>
            )}
          </div>

          <p className="text-center text-xs text-[#42425c]">
            Don&apos;t have a claim code?{' '}
            <Link
              href="/docs/getting-started"
              className="text-[#818CF8] hover:underline"
            >
              Get started
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
