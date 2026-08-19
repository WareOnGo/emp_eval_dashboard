/**
 * Single shared password, held in DASHBOARD_PASSWORD.
 *
 * The cookie stores a hash derived from the password rather than a flag like
 * `auth=1`, so a visitor cannot grant themselves access by setting a cookie —
 * producing a valid value requires knowing the password. Everything here uses
 * Web Crypto only, because middleware runs on the edge runtime where Node's
 * `crypto` module is unavailable.
 *
 * This is a shared-secret gate, not per-user auth: it keeps the dashboard off
 * the open internet, and gives no audit trail of who looked at what.
 */

export const SESSION_COOKIE = "wog_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

/** Domain-separated so the hash is useless anywhere else. */
const TOKEN_PREFIX = "wareongo-eval-dashboard:v1:";

async function sha256Hex(input: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * The cookie value a correct password produces, or null when no password is
 * configured — in which case the app locks rather than falling open.
 */
export async function expectedSessionToken() {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) return null;
  return sha256Hex(TOKEN_PREFIX + password);
}

export async function tokenForPassword(password: string) {
  return sha256Hex(TOKEN_PREFIX + password);
}

/** Constant-time compare, so response timing doesn't leak how much matched. */
export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function isPasswordConfigured() {
  return Boolean(process.env.DASHBOARD_PASSWORD);
}
