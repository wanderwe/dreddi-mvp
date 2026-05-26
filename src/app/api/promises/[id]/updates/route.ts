import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient, loadPromiseForUser } from "../common";
import { requireUser } from "@/lib/auth/requireUser";
import { notifyAgreementWatchers } from "@/lib/notifications/watchers";
import { buildDedupeKey, createNotification, mapPriorityForType } from "@/lib/notifications/service";
import { getAgreementParticipantIds } from "@/lib/agreements/followers";

type AgreementUpdateRecord = {
  id: string;
  agreement_id: string;
  author_id: string;
  content: string;
  created_at: string;
};

type PublicProfileRecord = {
  id: string;
  display_name: string | null;
  handle: string | null;
  is_public_profile: boolean | null;
};

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const user = await requireUser(req, cookieStore);
    if (user instanceof NextResponse) return user;

    const { id } = await ctx.params;
    const promise = await loadPromiseForUser(id, user.id);
    if (promise instanceof NextResponse) return promise;

    const admin = getAdminClient();
    const { data: updates, error } = await admin
      .from("agreement_updates")
      .select("id,agreement_id,author_id,content,created_at")
      .eq("agreement_id", promise.id)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "Could not load agreement updates", detail: error.message }, { status: 500 });
    }

    const authorIds = Array.from(new Set((updates ?? []).map((update) => update.author_id).filter(Boolean)));
    const { data: authors } = authorIds.length
      ? await admin
          .from("profiles")
          .select("id,display_name,handle,is_public_profile")
          .in("id", authorIds)
      : { data: [] as PublicProfileRecord[] };

    const profilesById = new Map((authors ?? []).map((profile) => [profile.id, profile]));
    return NextResponse.json(
      (updates ?? []).map((update) => {
        const author = profilesById.get(update.author_id);
        return {
          id: update.id,
          content: update.content,
          created_at: update.created_at,
          author_display_name: author?.display_name ?? null,
          author_handle: author?.is_public_profile ? author.handle : null,
        };
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const user = await requireUser(req, cookieStore);
    if (user instanceof NextResponse) return user;

    const { id } = await ctx.params;
    const payload = (await req.json().catch(() => null)) as { content?: unknown } | null;
    const content = typeof payload?.content === "string" ? payload.content.trim() : "";
    if (content.length < 1 || content.length > 500) {
      return NextResponse.json({ error: "Update content must be 1–500 characters" }, { status: 400 });
    }

    const promise = await loadPromiseForUser(id, user.id);
    if (promise instanceof NextResponse) return promise;

    const admin = getAdminClient();
    const { data: update, error } = await admin
      .from("agreement_updates")
      .insert({ agreement_id: promise.id, author_id: user.id, content })
      .select("id,agreement_id,author_id,content,created_at")
      .single<AgreementUpdateRecord>();

    if (error) {
      return NextResponse.json({ error: "Could not create agreement update", detail: error.message }, { status: 500 });
    }

    const { data: visibilityRow } = await admin
      .from("promises")
      .select("visibility")
      .eq("id", promise.id)
      .maybeSingle<{ visibility: string | null }>();

    if (visibilityRow?.visibility === "public") {
      await notifyAgreementWatchers(admin, promise, "public_agreement_updated", {
        actorId: user.id,
        eventId: update.id,
      });
    }

    const participantIds = Array.from(getAgreementParticipantIds(promise)).filter((id) => id !== user.id);
    for (const participantId of participantIds) {
      await createNotification(admin, {
        userId: participantId,
        promiseId: promise.id,
        type: "agreement_updated",
        dedupeKey: buildDedupeKey(["agreement_updated", promise.id, participantId, update.id]),
        ctaUrl: `/promises/${promise.id}`,
        priority: mapPriorityForType("agreement_updated"),
      });
    }

    const { data: author } = await admin
      .from("profiles")
      .select("id,display_name,handle,is_public_profile")
      .eq("id", user.id)
      .maybeSingle<PublicProfileRecord>();

    return NextResponse.json(
      {
        id: update.id,
        content: update.content,
        created_at: update.created_at,
        author_display_name: author?.display_name ?? null,
        author_handle: author?.is_public_profile ? author.handle : null,
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}
