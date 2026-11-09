import { NextResponse } from "next/server";
import { getAdminClient } from "@/app/api/promises/[id]/common";
import { isEventName } from "@/lib/events/names";

// Link previews and crawlers run no scripts, but some headless ones do; they are not people.
const BOT = /bot|crawl|spider|preview|headless|facebookexternalhit|telegram|whatsapp|viber|slack|discord/i;
const REF = /^[A-Za-z0-9_-]{1,64}$/;

export async function POST(req: Request) {
  if (BOT.test(req.headers.get("user-agent") ?? "")) return new NextResponse(null, { status: 204 });
  const body = (await req.json().catch(() => null)) as { name?: unknown; ref?: unknown; visitor?: unknown } | null;
  if (!body || !isEventName(body.name) || typeof body.ref !== "string" || !REF.test(body.ref)) {
    return new NextResponse(null, { status: 400 });
  }
  const visitor = typeof body.visitor === "string" && REF.test(body.visitor) ? body.visitor : null;
  await getAdminClient()
    .from("product_events")
    .insert({ name: body.name, ref: body.ref, visitor })
    .then(
      () => undefined,
      () => undefined
    );
  return new NextResponse(null, { status: 204 });
}
