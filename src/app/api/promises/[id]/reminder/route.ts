import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/requireUser";
import { getAdminClient, loadPromiseForUser } from "../common";
import { isPromiseAccepted } from "@/lib/promiseAcceptance";
import { getNextActionOwner, resolveNextActionOwnerId } from "@/lib/promiseNextAction";
import { createNotification, mapPriorityForType } from "@/lib/notifications/service";

const DAY_MS = 24 * 60 * 60 * 1000;

type ReminderErrorCode =
  | "reminder_invalid_state"
  | "reminder_acceptance_required"
  | "reminder_participants_invalid"
  | "reminder_forbidden"
  | "reminder_rate_limit"
  | "reminder_feature_unavailable"
  | "reminder_create_failed"
  | "reminder_unexpected";

const errorResponse = (
  status: number,
  error_code: ReminderErrorCode,
  error: string,
  detail?: string
) => NextResponse.json({ error_code, error, detail: detail ?? null }, { status });


export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const user = await requireUser(req, cookieStore);
    if (user instanceof NextResponse) return user;

    const { id } = await ctx.params;
    const promise = await loadPromiseForUser(id, user.id);
    if (promise instanceof NextResponse) return promise;

    if (promise.status !== "active" && promise.status !== "completed_by_promisor") {
      return errorResponse(
        400,
        "reminder_invalid_state",
        "Reminders are available only for deals awaiting action"
      );
    }

    const admin = getAdminClient();
    if (!isPromiseAccepted(promise)) {
      return errorResponse(
        400,
        "reminder_acceptance_required",
        "Reminders are available only after the deal is accepted"
      );
    }

    const nextActionOwnerId = resolveNextActionOwnerId(promise);
    if (!nextActionOwnerId) {
      return errorResponse(400, "reminder_participants_invalid", "Deal participants are invalid");
    }

    const isActive = promise.status === "active";
    const nextActionOwner = getNextActionOwner(promise, user.id);
    if (nextActionOwner === "none") {
      return errorResponse(400, "reminder_participants_invalid", "Deal participants are invalid");
    }

    if (nextActionOwner === "me") {
      return errorResponse(
        403,
        "reminder_forbidden",
        "Нагадування можна надсилати лише коли дія очікується від іншої сторони."
      );
    }

    const receiverId = nextActionOwnerId;

    const sinceIso = new Date(Date.now() - DAY_MS).toISOString();
    const { data: existingReminder, error: existingError } = await admin
      .from("deal_reminders")
      .select("id,created_at")
      .eq("deal_id", id)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      if (existingError.code === "42P01") {
        return errorResponse(503, "reminder_feature_unavailable", "Reminder feature is temporarily unavailable", existingError.message);
      }
      return errorResponse(500, "reminder_rate_limit", "Could not validate reminder rate limit", existingError.message);
    }

    if (existingReminder) {
      return errorResponse(429, "reminder_rate_limit", "Reminder already sent in the last 24 hours");
    }

    const { data: inserted, error: insertError } = await admin
      .from("deal_reminders")
      .insert({
        deal_id: id,
        sender_id: user.id,
        receiver_id: receiverId,
      })
      .select("created_at")
      .single();

    if (insertError) {
      if (insertError.code === "42P01") {
        return errorResponse(503, "reminder_feature_unavailable", "Reminder feature is temporarily unavailable", insertError.message);
      }
      return errorResponse(500, "reminder_create_failed", "Could not create reminder", insertError.message);
    }

    const reminderType =
      isActive && promise.due_at ? "reminder_overdue" : isActive ? "reminder_manual" : "marked_completed";

    await createNotification(admin, {
      userId: receiverId,
      promiseId: id,
      type: reminderType,
      dedupeKey: `manual_reminder:${id}:${reminderType}:${Math.floor(Date.now() / DAY_MS)}`,
      ctaUrl: isActive ? `/promises/${id}` : `/promises/${id}/confirm`,
      ctaLabel: "Open",
      priority: mapPriorityForType(reminderType),
      body: isActive
        ? promise.due_at
          ? "The other side reminded you to complete this deal."
          : "The other side sent you a reminder on this deal."
        : "The other side reminded you to confirm or dispute this completed deal.",
    });

    const { count } = await admin
      .from("deal_reminders")
      .select("id", { head: true, count: "exact" })
      .eq("deal_id", id);

    return NextResponse.json({
      ok: true,
      created_at: inserted.created_at,
      count: count ?? 1,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return errorResponse(500, "reminder_unexpected", "Unexpected error", message);
  }
}
