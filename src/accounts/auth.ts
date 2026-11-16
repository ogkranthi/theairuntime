import { verifyToken } from '@clerk/backend';
import { AdmissionError } from '../security/types';
import type { AccountEnv } from './types';
export async function privateId(env: AccountEnv, purpose: string, value: string): Promise<string> {
  if (!env.COACH_IDENTITY_KEY || env.COACH_IDENTITY_KEY.length < 32) throw new AdmissionError(503, 'Accounts are unavailable.');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.COACH_IDENTITY_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(JSON.stringify([purpose, value])))), b => b.toString(16).padStart(2, '0')).join('');
}
/** Bearer-only session authentication. Never derive identity from a body/header user ID. */
export async function identity(request: Request, env: AccountEnv): Promise<string> {
  if (!env.CLERK_JWT_KEY || !env.CLERK_PUBLISHABLE_KEY || !env.CLERK_ISSUER || !env.COACH_ALLOWED_ORIGIN) throw new AdmissionError(503, 'Accounts are unavailable.');
  const origin = request.headers.get('origin');
  if ((origin && origin !== env.COACH_ALLOWED_ORIGIN) || (request.method !== 'GET' && origin !== env.COACH_ALLOWED_ORIGIN)) throw new AdmissionError(403, 'Request origin is not allowed.');
  const bearer = request.headers.get('authorization');
  if (!bearer?.startsWith('Bearer ') || bearer.length > 8192) throw new AdmissionError(401, 'Sign in to continue.');
  try {
    // Networkless SDK signature/exp/nbf validation, followed by strict instance,
    // party and human-session checks. No cookies, API keys or machine tokens.
    const claims = await verifyToken(bearer.slice(7), { jwtKey: env.CLERK_JWT_KEY, authorizedParties: [env.COACH_ALLOWED_ORIGIN], clockSkewInMs: 0 });
    if (claims.iss !== env.CLERK_ISSUER || claims.azp !== env.COACH_ALLOWED_ORIGIN || !/^user_[a-zA-Z0-9]+$/.test(claims.sub) || typeof claims.sid !== 'string' || !claims.sid.startsWith('sess_')) throw new Error('Invalid session');
    return await privateId(env, 'account', claims.sub);
  } catch (error) {
    if (error instanceof AdmissionError) throw error;
    throw new AdmissionError(401, 'Sign in again to continue.');
  }
}
