import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/requireUser";
import { getEmailProviderHealth } from "@/lib/notifications/email";

export async function GET(req: Request) {
  const user = await requireUser(req, await cookies());
  if (user instanceof NextResponse) {
    return user;
  }

  const health = getEmailProviderHealth();
  return NextResponse.json(health, { status: 200 });
}
