import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/requireUser";
import {
  getAdminClient,
  isCommitmentStatus,
  isCommitmentVisibility,
  loadCommitmentForUser,
  SELF_COMMITMENT_COLUMNS,
  type SelfCommitmentRecord,
} from "../common";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const user = await requireUser(req, cookieStore);
    if (user instanceof NextResponse) return user;

    const { id } = await ctx.params;
    const commitment = await loadCommitmentForUser(id, user.id);
    if (commitment instanceof NextResponse) return commitment;

    return NextResponse.json(commitment);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const user = await requireUser(req, cookieStore);
    if (user instanceof NextResponse) return user;

    const { id } = await ctx.params;
    const commitment = await loadCommitmentForUser(id, user.id);
    if (commitment instanceof NextResponse) return commitment;

    const payload = (await req.json().catch(() => null)) as {
      title?: unknown;
      description?: unknown;
      deadline?: unknown;
      visibility?: unknown;
      status?: unknown;
    } | null;

    const update: Record<string, unknown> = {};

    if (payload?.title !== undefined) {
      const title = typeof payload.title === "string" ? payload.title.trim() : "";
      if (title.length < 1 || title.length > 120) {
        return NextResponse.json({ error: "Title must be 1–120 characters" }, { status: 400 });
      }
      update.title = title;
    }

    if (payload?.description !== undefined) {
      const description =
        typeof payload.description === "string" && payload.description.trim().length > 0
          ? payload.description.trim()
          : null;
      if (description && description.length > 2000) {
        return NextResponse.json({ error: "Description must be at most 2000 characters" }, { status: 400 });
      }
      update.description = description;
    }

    if (payload?.deadline !== undefined) {
      if (payload.deadline === null) {
        update.deadline = null;
      } else if (typeof payload.deadline === "string" && payload.deadline.trim().length > 0) {
        const parsed = new Date(payload.deadline);
        if (Number.isNaN(parsed.getTime())) {
          return NextResponse.json({ error: "Invalid deadline" }, { status: 400 });
        }
        update.deadline = parsed.toISOString();
      } else {
        update.deadline = null;
      }
    }

    if (payload?.visibility !== undefined) {
      if (!isCommitmentVisibility(payload.visibility)) {
        return NextResponse.json({ error: "Invalid visibility" }, { status: 400 });
      }
      update.visibility = payload.visibility;
    }

    if (payload?.status !== undefined) {
      if (!isCommitmentStatus(payload.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }

      if (commitment.status !== "active" && payload.status !== commitment.status) {
        return NextResponse.json({ error: "This goal already has a final status" }, { status: 409 });
      }

      update.status = payload.status;
      update.completed_at = payload.status === "active" ? null : new Date().toISOString();
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(commitment);
    }

    const admin = getAdminClient();
    const { data, error } = await admin
      .from("self_commitments")
      .update(update)
      .eq("id", commitment.id)
      .select(SELF_COMMITMENT_COLUMNS)
      .single<SelfCommitmentRecord>();

    if (error) {
      return NextResponse.json({ error: "Could not update goal", detail: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}
