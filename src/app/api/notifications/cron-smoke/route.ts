import { NextResponse } from "next/server";

type SmokeSuccessResponse = {
  ok: true;
  now: string;
  envPresent: {
    cronSecret: boolean;
    resendApiKey: boolean;
    resendFromEmail: boolean;
    appUrl: boolean;
  };
};

type SmokeErrorResponse = {
  ok: false;
  error: string;
};

const getCronSecret = () =>
  process.env.CRON_SECRET ?? process.env.NOTIFICATIONS_CRON_SECRET;

const getTokenFromAuthHeader = (req: Request) => {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  return authHeader.slice("Bearer ".length).trim();
};


const unauthorizedResponse = () =>
  NextResponse.json<SmokeErrorResponse>(
    { ok: false, error: "unauthorized" },
    { status: 401 }
  );

const missingCronSecretResponse = () =>
  NextResponse.json<SmokeErrorResponse>(
    { ok: false, error: "cron_secret_missing" },
    { status: 500 }
  );

const authorize = (req: Request): NextResponse<SmokeErrorResponse> | null => {
  const secret = getCronSecret();

  if (!secret) {
    console.error("[notifications] cron_smoke_secret_missing", {
      ts: new Date().toISOString(),
      route: "cron-smoke",
    });

    return missingCronSecretResponse();
  }

  const bearerToken = getTokenFromAuthHeader(req);

  if (bearerToken === secret) {
    return null;
  }

  return unauthorizedResponse();
};

export async function GET(req: Request) {
  const unauthorized = authorize(req);
  if (unauthorized) return unauthorized;

  const now = new Date().toISOString();
  console.info("[notifications] cron_smoke_ok", { now });

  return NextResponse.json<SmokeSuccessResponse>({
    ok: true,
    now,
    envPresent: {
      cronSecret: Boolean(getCronSecret()),
      resendApiKey: Boolean(process.env.RESEND_API_KEY),
      resendFromEmail: Boolean(process.env.RESEND_FROM_EMAIL),
      appUrl: Boolean(process.env.NEXT_PUBLIC_APP_URL),
    },
  });
}
