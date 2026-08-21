// Talks to the hub-auth backend (backend/, deployed as a Lambda — see
// scripts/deploy-lambdas.js). Login itself happens on Microsoft's side
// (Entra ID SAML SSO, configured by Infra) — this file only points the
// browser at the backend's SSO redirect and asks it to verify the session
// token that redirect hands back afterward.
const AUTH_API_URL = process.env.EXPO_PUBLIC_AUTH_API_URL || 'http://localhost:4000/api';

/** Full-page navigation target for "Sign in with Microsoft" — not an XHR call. */
export function getMicrosoftSignInUrl(): string {
  return `${AUTH_API_URL}/auth/saml/login`;
}

export async function verifySsoToken(token: string): Promise<{ ok: boolean; email?: string; error?: string }> {
  try {
    const res = await fetch(`${AUTH_API_URL}/auth/session/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success) return { ok: false, error: data?.error || 'Sign-in could not be verified.' };
    return { ok: true, email: data.email };
  } catch {
    return { ok: false, error: 'Could not reach the sign-in server. Please try again.' };
  }
}
