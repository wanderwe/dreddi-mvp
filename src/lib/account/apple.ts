import { createPrivateKey, createPublicKey, sign, verify, type JsonWebKey } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

// Sign in with Apple, server side: revoking a person's tokens when their account is deleted, and
// verifying Apple's server-to-server notifications. Needs APPLE_TEAM_ID, APPLE_KEY_ID and
// APPLE_PRIVATE_KEY (the .p8 contents); APPLE_CLIENT_ID is the Services ID the web flow signs in with.

const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID || "com.dreddi.web";
const APPLE_APP_ID = process.env.APPLE_APP_ID || "com.dreddi.app";

const b64url = (input: Buffer | string) => Buffer.from(input).toString("base64url");

function appleClientSecret(): string | null {
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const rawKey = process.env.APPLE_PRIVATE_KEY;
  if (!teamId || !keyId || !rawKey) return null;

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "ES256", kid: keyId }));
  const payload = b64url(
    JSON.stringify({ iss: teamId, iat: now, exp: now + 300, aud: APPLE_ISSUER, sub: APPLE_CLIENT_ID })
  );
  const signingInput = `${header}.${payload}`;
  const key = createPrivateKey(rawKey.replace(/\\n/g, "\n"));
  const signature = sign("sha256", Buffer.from(signingInput), { key, dsaEncoding: "ieee-p1363" });
  return `${signingInput}.${b64url(signature)}`;
}

async function revokeAppleToken(token: string, hint: "refresh_token" | "access_token", secret: string) {
  const response = await fetch(`${APPLE_ISSUER}/auth/revoke`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: APPLE_CLIENT_ID,
      client_secret: secret,
      token,
      token_type_hint: hint,
    }),
  });
  return response.ok;
}

// Best effort: a failure is logged and never stops the deletion.
export async function revokeAppleTokens(admin: SupabaseClient, userId: string) {
  const { data } = await admin
    .from("apple_tokens")
    .select("refresh_token,access_token")
    .eq("user_id", userId)
    .maybeSingle<{ refresh_token: string | null; access_token: string | null }>();
  if (!data?.refresh_token && !data?.access_token) return;

  try {
    const secret = appleClientSecret();
    if (!secret) {
      console.error("[account] apple_revoke_skipped", { userId, reason: "apple_key_not_configured" });
      return;
    }
    const revoked = data.refresh_token
      ? await revokeAppleToken(data.refresh_token, "refresh_token", secret)
      : await revokeAppleToken(data.access_token as string, "access_token", secret);
    if (!revoked) console.error("[account] apple_revoke_failed", { userId });
    await admin.from("apple_tokens").delete().eq("user_id", userId);
  } catch (error) {
    console.error("[account] apple_revoke_failed", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

type AppleJwk = JsonWebKey & { kid?: string };
let cachedKeys: { keys: AppleJwk[]; fetchedAt: number } | null = null;

async function appleSigningKeys(force = false): Promise<AppleJwk[]> {
  if (!force && cachedKeys && Date.now() - cachedKeys.fetchedAt < 60 * 60 * 1000) return cachedKeys.keys;
  const response = await fetch(`${APPLE_ISSUER}/auth/keys`);
  if (!response.ok) throw new Error(`Apple keys: ${response.status}`);
  const body = (await response.json()) as { keys?: AppleJwk[] };
  cachedKeys = { keys: body.keys ?? [], fetchedAt: Date.now() };
  return cachedKeys.keys;
}

export type AppleNotificationEvent = {
  type: "email-disabled" | "email-enabled" | "consent-revoked" | "account-delete" | string;
  sub: string;
  email?: string;
  event_time?: number;
};

// Apple posts { payload: "<JWS>" }, signed with one of its published RS256 keys.
export async function verifyAppleNotification(jws: string): Promise<AppleNotificationEvent | null> {
  const parts = jws.split(".");
  if (parts.length !== 3) return null;
  const [headerPart, payloadPart, signaturePart] = parts;

  const header = JSON.parse(Buffer.from(headerPart, "base64url").toString("utf8")) as { kid?: string; alg?: string };
  if (header.alg !== "RS256" || !header.kid) return null;

  let jwk = (await appleSigningKeys()).find((key) => key.kid === header.kid);
  if (!jwk) jwk = (await appleSigningKeys(true)).find((key) => key.kid === header.kid);
  if (!jwk) return null;

  const valid = verify(
    "sha256",
    Buffer.from(`${headerPart}.${payloadPart}`),
    createPublicKey({ key: jwk, format: "jwk" }),
    Buffer.from(signaturePart, "base64url")
  );
  if (!valid) return null;

  const claims = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8")) as {
    iss?: string;
    aud?: string;
    events?: string | AppleNotificationEvent;
  };
  if (claims.iss !== APPLE_ISSUER) return null;
  if (claims.aud !== APPLE_CLIENT_ID && claims.aud !== APPLE_APP_ID) return null;

  const event = typeof claims.events === "string" ? (JSON.parse(claims.events) as AppleNotificationEvent) : claims.events;
  return event?.sub && event.type ? event : null;
}
