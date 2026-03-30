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
      <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A]">
        <span className="font-mono text-[#00FF88] animate-pulse">$ loading...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E0E0E0] font-mono overflow-x-hidden">
      {/* Nav */}
      <nav className="relative z-10 border-b border-[#333]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="text-[#00FF88] text-sm">$</span>
            <span className="font-bold text-lg tracking-tight text-white font-mono">
              SwarmRecall
            </span>
          </Link>
        </div>
      </nav>

      <main className="relative z-10 flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4">
        <div className="w-full max-w-md space-y-8 relative">
          {/* Header */}
          <div className="space-y-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#00FF88] font-mono">
              &gt; claim your agent
            </h1>
            <p className="text-[#888] text-sm font-mono">
              Enter the claim code your agent gave you to link it to your
              dashboard.
            </p>
          </div>

          <div className="bg-[#111] border border-[#333] p-8 space-y-6">
            {error && (
              <div className="bg-[#1a0000] border border-[#F43F5E]/40 px-4 py-3 text-sm text-[#F43F5E] font-mono">
                <span className="text-[#F43F5E]/60">error: </span>{error}
              </div>
            )}

            {success && (
              <div className="bg-[#001a0d] border border-[#00FF88]/40 px-4 py-3 text-sm text-[#00FF88] font-mono">
                <span className="text-[#00FF88]/60">&gt; </span>{success}
              </div>
            )}

            {!user ? (
              <>
                <p className="text-sm text-[#888] text-center font-mono">
                  // sign in first to claim your agent
                </p>
                <div className="space-y-3">
                  <button
                    onClick={handleGoogleLogin}
                    className="flex w-full items-center justify-center gap-3 border border-[#333] bg-[#0A0A0A] px-4 py-2.5 text-sm font-medium text-[#E0E0E0] hover:bg-[#1a1a1a] hover:border-[#555] transition-colors cursor-pointer font-mono"
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
                    className="flex w-full items-center justify-center gap-3 border border-[#333] bg-[#0A0A0A] px-4 py-2.5 text-sm font-medium text-[#E0E0E0] hover:bg-[#1a1a1a] hover:border-[#555] transition-colors cursor-pointer font-mono"
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
                    className="block text-sm text-[#888] mb-1 font-mono"
                  >
                    $ claim_code
                  </label>
                  <input
                    id="claimCode"
                    type="text"
                    required
                    value={claimCode}
                    onChange={(e) => setClaimCode(e.target.value)}
                    className="block w-full border border-[#333] bg-[#0A0A0A] px-3 py-2.5 text-sm text-[#E0E0E0] placeholder-[#555] focus:border-[#00FF88] focus:ring-1 focus:ring-[#00FF88] focus:outline-none transition-colors font-mono tracking-wider"
                    placeholder="e.g. ABC123XYZ"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting || !claimCode.trim()}
                  className="w-full bg-[#00FF88] hover:bg-[#00cc6e] px-4 py-2.5 text-sm font-bold text-black disabled:opacity-50 transition-colors cursor-pointer font-mono border-0"
                >
                  {submitting ? '> claiming...' : '> claim agent'}
                </button>
              </form>
            )}
          </div>

          <p className="text-center text-xs text-[#555] font-mono">
            Don&apos;t have a claim code?{' '}
            <Link
              href="/docs/getting-started"
              className="text-[#00FF88] hover:underline"
            >
              Get started
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
