// Talks to the hub-auth backend (backend/, deployed as a Lambda — see
// scripts/deploy-lambdas.js). The allowed email + OTP live ONLY on that
// server; this file never sees or hardcodes them.
const AUTH_API_URL = process.env.EXPO_PUBLIC_AUTH_API_URL || 'http://localhost:4000/api';

async function postJson(path: string, body: unknown) {
  const res = await fetch(`${AUTH_API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export async function requestOtp(email: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { ok, data } = await postJson('/auth/request-otp', { email });
    if (!ok) return { ok: false, error: data?.error || 'Could not send the code. Please try again.' };
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not reach the sign-in server. Please try again.' };
  }
}

export async function verifyOtp(email: string, otp: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { ok, data } = await postJson('/auth/verify-otp', { email, otp });
    if (!ok || !data?.success) return { ok: false, error: data?.error || 'Invalid email or OTP.' };
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not reach the sign-in server. Please try again.' };
  }
}
