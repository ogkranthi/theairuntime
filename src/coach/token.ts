import type { CoachState } from "./types";

/**
 * Signed lesson position.
 *
 * The brief asks for no database and no account, so the learner's place in the
 * lesson travels with them. That is fine for the stage index, which is theirs to
 * skip if they want, and not fine for the model call counter, which is the only
 * thing standing between an open endpoint and a drained daily AI allowance. So
 * the state is client held and server signed: readable, unforgeable.
 */

const MAX_AGE_MS = 3 * 60 * 60 * 1000;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> | null {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  try {
    const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
    const bytes = new Uint8Array(new ArrayBuffer(binary.length));
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signState(
  state: CoachState,
  secret: string,
): Promise<string> {
  const payload = toBase64Url(encoder.encode(JSON.stringify(state)));
  const signature = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(secret),
    encoder.encode(payload),
  );
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`;
}

/**
 * Recover state from a token, or null.
 *
 * Null covers every failure the same way on purpose: a bad signature, a mangled
 * payload, a stale token and a nonsense shape are all just "start over" to the
 * caller, and telling them apart would only help someone probing the format.
 */
export async function verifyState(
  token: unknown,
  secret: string,
  now: number,
): Promise<CoachState | null> {
  if (typeof token !== "string" || token.length > 4096) return null;

  const dot = token.indexOf(".");
  if (dot <= 0) return null;

  const payload = token.slice(0, dot);
  const signature = fromBase64Url(token.slice(dot + 1));
  if (!signature) return null;

  // subtle.verify rather than comparing strings ourselves: it is constant time,
  // so a wrong signature does not leak where it went wrong.
  const valid = await crypto.subtle.verify(
    "HMAC",
    await hmacKey(secret),
    signature,
    encoder.encode(payload),
  );
  if (!valid) return null;

  const raw = fromBase64Url(payload);
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(decoder.decode(raw));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;

  const value = parsed as Record<string, unknown>;
  const issuedAt = Number(value.issuedAt);
  if (!Number.isFinite(issuedAt) || now - issuedAt > MAX_AGE_MS) return null;

  const stageIndex = Number(value.stageIndex);
  const calls = Number(value.calls);
  if (
    typeof value.lessonId !== "string" ||
    !Number.isInteger(stageIndex) ||
    stageIndex < 0 ||
    stageIndex > 64 ||
    !Number.isInteger(calls) ||
    calls < 0 ||
    typeof value.probed !== "boolean"
  ) {
    return null;
  }

  return {
    lessonId: value.lessonId,
    stageIndex,
    probed: value.probed,
    calls,
    issuedAt,
  };
}
