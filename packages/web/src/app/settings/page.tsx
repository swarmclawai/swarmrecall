'use client';
/* eslint-disable @next/next/no-img-element */

import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your account and preferences
          </p>
        </div>

        {/* Account info */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Account</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  className="h-16 w-16 rounded-full"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 text-xl font-medium text-gray-600">
                  {user?.displayName?.[0] ?? user?.email?.[0] ?? '?'}
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {user?.displayName ?? 'No display name'}
                </p>
                <p className="text-sm text-gray-500">{user?.email}</p>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-500">
                  Display Name
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {user?.displayName ?? 'Not set'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">
                  Email
                </label>
                <p className="mt-1 text-sm text-gray-900">{user?.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">
                  Provider
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {user?.providerData?.[0]?.providerId ?? 'Unknown'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">
                  User ID
                </label>
                <p className="mt-1 text-sm font-mono text-gray-500">
                  {user?.uid}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* API Keys link */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">API Keys</h2>
              <p className="mt-1 text-sm text-gray-500">
                Manage API keys for programmatic access
              </p>
            </div>
            <Link
              href="/settings/api-keys"
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
            >
              Manage Keys
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
