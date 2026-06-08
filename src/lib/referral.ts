/**
 * Client-side referral helpers.
 *
 * A visitor who arrives on any page with `?ref=<id>` has that id stored
 * (first-touch wins). Every subscribe call then includes it, so referred
 * signups are attributable downstream via the existing /api/subscribe webhook
 * (no database needed for the MVP). After a visitor subscribes, we hand them
 * their own share link carrying a stable token derived from their email.
 */

const REF_KEY = 'tair_ref';

export const SHARE_ORIGIN = 'https://events.theairuntime.com';

/** Capture `?ref=` from the current URL into localStorage. First-touch wins. */
export function captureRef(): void {
  try {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref && !localStorage.getItem(REF_KEY)) {
      localStorage.setItem(REF_KEY, ref.slice(0, 64));
    }
  } catch {
    /* localStorage/URL unavailable; referral is best-effort */
  }
}

/** The referral id this visitor arrived with, if any. */
export function getRef(): string | null {
  try {
    return localStorage.getItem(REF_KEY);
  } catch {
    return null;
  }
}

/**
 * A stable, non-reversible short token derived from an email (djb2 hash), used
 * as the sharer's `?ref=` id. Keeps the email itself out of the shared URL.
 */
export function refTokenForEmail(email: string): string {
  const s = email.trim().toLowerCase();
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/** The share link a subscriber sends to friends. */
export function shareUrlForEmail(email: string): string {
  return `${SHARE_ORIGIN}/?ref=${refTokenForEmail(email)}`;
}
