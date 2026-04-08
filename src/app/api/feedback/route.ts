import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/auth/requireUser";

const FEEDBACK_CATEGORIES = ["bug", "suggestion", "confusing_ux", "other"] as const;
type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

type FeedbackRequestBody = {
  category?: string;
  message?: string;
  allowContact?: boolean;
  pageUrl?: string;
  locale?: string;
};

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const user = await requireUser(req, cookieStore);
  if (user instanceof NextResponse) return user;

  const body = (await req.json().catch(() => null)) as FeedbackRequestBody | null;

  const category = body?.category?.trim() as FeedbackCategory | undefined;
  const message = body?.message?.trim() ?? "";
  const allowContact = Boolean(body?.allowContact);
  const pageUrl = body?.pageUrl?.trim() ?? "";
  const locale = body?.locale?.trim() || "en";

  if (!category || !FEEDBACK_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Category is required" }, { status: 400 });
  }

  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  if (!pageUrl) {
    return NextResponse.json({ error: "Page URL is required" }, { status: 400 });
  }

  const admin = supabaseAdmin();

  const { data: profile } = await admin
    .from("profiles")
    .select("display_name,handle")
    .eq("id", user.id)
    .maybeSingle<{ display_name?: string | null; handle?: string | null }>();

  const displayName = profile?.display_name?.trim() || null;
  const handle = profile?.handle?.trim() || null;
  const userHandleOrName = displayName || handle;

  const { error } = await admin.from("feedback").insert({
    user_id: user.id,
    user_email: user.email ?? null,
    user_handle_or_name: userHandleOrName,
    category,
    message,
    page_url: pageUrl,
    locale,
    allow_contact: allowContact,
  });

  if (error) {
    return NextResponse.json({ error: "Failed to send feedback", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
