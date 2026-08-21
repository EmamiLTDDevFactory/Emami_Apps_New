// Talks to the EmamiApps hub login endpoints on the hub-auth Lambda (backend/server.js,
// backend/hub-auth.js), fronted by API Gateway rather than a Lambda Function URL — the Function
// URL was blocked by an unresolved AWS-account-level access issue (public traffic getting a 403
// despite correct config); API Gateway uses a different invoke mechanism that sidesteps it
// entirely. Login happens via Microsoft OAuth2/OIDC — this file only points the browser at the
// backend's redirect and asks it to verify the session token that redirect hands back afterward.
const AUTH_API_URL = process.env.EXPO_PUBLIC_AUTH_API_URL || 'http://localhost:4000/api';

/** Full-page navigation target for "Sign in with Microsoft" — not an XHR call. */
export function getMicrosoftSignInUrl(): string {
  return `${AUTH_API_URL}/hub-auth/login`;
}

export async function verifySsoToken(token: string): Promise<{ ok: boolean; email?: string; error?: string }> {
  try {
    const res = await fetch(`${AUTH_API_URL}/hub-auth/session/verify`, {
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
