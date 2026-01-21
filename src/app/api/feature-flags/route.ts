import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/requireUser";
import { isGroupDealsEnabled } from "@/lib/featureFlags";

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const user = await requireUser(req, cookieStore);
  if (user instanceof NextResponse) {
    return NextResponse.json({ groupDealsEnabled: false }, { status: 200 });
  }

  return NextResponse.json({ groupDealsEnabled: isGroupDealsEnabled(user) }, { status: 200 });
}
