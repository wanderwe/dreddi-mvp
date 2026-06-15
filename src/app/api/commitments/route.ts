import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/requireUser";
import {
  getAdminClient,
  isCommitmentVisibility,
  SELF_COMMITMENT_COLUMNS,
  type SelfCommitmentRecord,
} from "./common";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const user = await requireUser(req, cookieStore);
    if (user instanceof NextResponse) return user;

    const admin = getAdminClient();
    const { data, error } = await admin
      .from("self_commitments")
      .select(SELF_COMMITMENT_COLUMNS)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .returns<SelfCommitmentRecord[]>();

    if (error) {
      return NextResponse.json({ error: "Could not load goals", detail: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const user = await requireUser(req, cookieStore);
    if (user instanceof NextResponse) return user;

    const payload = (await req.json().catch(() => null)) as {
      title?: unknown;
      description?: unknown;
      deadline?: unknown;
      visibility?: unknown;
    } | null;

    const title = typeof payload?.title === "string" ? payload.title.trim() : "";
    if (title.length < 1 || title.length > 120) {
      return NextResponse.json({ error: "Title must be 1–120 characters" }, { status: 400 });
    }

    const description =
      typeof payload?.description === "string" && payload.description.trim().length > 0
        ? payload.description.trim()
        : null;
    if (description && description.length > 2000) {
      return NextResponse.json({ error: "Description must be at most 2000 characters" }, { status: 400 });
    }

    let deadline: string | null = null;
    if (typeof payload?.deadline === "string" && payload.deadline.trim().length > 0) {
      const parsed = new Date(payload.deadline);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: "Invalid deadline" }, { status: 400 });
      }
      deadline = parsed.toISOString();
    }

    const visibility = isCommitmentVisibility(payload?.visibility) ? payload.visibility : "private";

    const admin = getAdminClient();
    const { data, error } = await admin
      .from("self_commitments")
      .insert({
        user_id: user.id,
        title,
        description,
        deadline,
        visibility,
      })
      .select(SELF_COMMITMENT_COLUMNS)
      .single<SelfCommitmentRecord>();

    if (error) {
      return NextResponse.json({ error: "Could not create goal", detail: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}
