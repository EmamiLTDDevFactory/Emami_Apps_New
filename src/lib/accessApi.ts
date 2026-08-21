// Talks to the Manage Access endpoints on the hub-auth Lambda (backend/server.js) which read/
// write emami_apps.authorized_users and emami_apps.authorized_user_apps in the dev Postgres
// database. This is a SEPARATE env var from EXPO_PUBLIC_AUTH_API_URL (authApi.ts) — that one now
// points at the Azure App Service that handles login; this Lambda's Function URL is a different
// backend entirely, kept alive only for this Manage Access API.
import type { UserAccessEntry } from '../types';

const ACCESS_API_URL = process.env.EXPO_PUBLIC_ACCESS_API_URL || 'http://localhost:4000/api';

type ApiResult = { ok: boolean; error?: string };

async function parseResult(res: Response): Promise<ApiResult> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.success) {
    return { ok: false, error: data?.error || 'Something went wrong. Please try again.' };
  }
  return { ok: true };
}

export async function listAuthorizedUsers(): Promise<{ ok: boolean; users?: UserAccessEntry[]; error?: string }> {
  try {
    const res = await fetch(`${ACCESS_API_URL}/access/users`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success) return { ok: false, error: data?.error || 'Could not load authorized users.' };
    return { ok: true, users: data.users };
  } catch {
    return { ok: false, error: 'Could not reach the server. Please try again.' };
  }
}

export async function addAuthorizedUser(email: string): Promise<ApiResult> {
  try {
    const res = await fetch(`${ACCESS_API_URL}/access/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return await parseResult(res);
  } catch {
    return { ok: false, error: 'Could not reach the server. Please try again.' };
  }
}

export async function removeAuthorizedUser(email: string): Promise<ApiResult> {
  try {
    const res = await fetch(`${ACCESS_API_URL}/access/users/${encodeURIComponent(email)}`, { method: 'DELETE' });
    return await parseResult(res);
  } catch {
    return { ok: false, error: 'Could not reach the server. Please try again.' };
  }
}

export async function setAppAccess(email: string, appId: string, granted: boolean): Promise<ApiResult> {
  try {
    const res = await fetch(
      `${ACCESS_API_URL}/access/users/${encodeURIComponent(email)}/apps/${encodeURIComponent(appId)}`,
      { method: granted ? 'POST' : 'DELETE' }
    );
    return await parseResult(res);
  } catch {
    return { ok: false, error: 'Could not reach the server. Please try again.' };
  }
}
