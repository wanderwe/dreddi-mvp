import { NextResponse } from "next/server";
import { createClient, type User } from "@supabase/supabase-js";
import { resolveExecutorId } from "@/lib/promiseParticipants";
import { requireUser } from "@/lib/auth/requireUser";
import { getPromiseUiStatus } from "@/lib/promiseUiStatus";
import { isAgreementLiveStatus } from "@/lib/agreementLiveState";
import { isPromiseStatus } from "@/lib/promiseStatus";
import { notifyAgreementWatchers } from "@/lib/notifications/watchers";

function getEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function getAdminClient() {
  return createClient(getEnv("NEXT_PUBLIC_SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getAuthClient() {
  return createClient(getEnv("NEXT_PUBLIC_SUPABASE_URL"), getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type PromisePublicAgreementRecord = {
  id: string;
  title: string | null;
  details: string | null;
  condition_text: string | null;
  is_important: boolean | null;
  status: string | null;
  invite_status: string | null;
  created_at: string | null;
  due_at: string | null;
  completed_at: string | null;
  confirmed_at: string | null;
  disputed_at: string | null;
  accepted_at: string | null;
  counterparty_accepted_at: string | null;
  declined_at: string | null;
  ignored_at: string | null;
  expires_at: string | null;
  cancelled_at: string | null;
  creator_id: string;
  counterparty_id: string | null;
  promisor_id: string | null;
  promisee_id: string | null;
  counterparty_contact: string | null;
  reviewer_id: string | null;
};

type PublicProfileRecord = {
  id: string;
  display_name: string | null;
  handle: string | null;
  is_public_profile: boolean | null;
};

type AgreementUpdateRecord = {
  id: string;
  agreement_id: string;
  author_id: string;
  content: string;
  created_at: string;
};

const isLikelyPrivateEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

function isMissingAgreementUpdatesTable(error: { code?: string; message?: string }) {
  return (
    error.code === "42P01" ||
    (/agreement_updates/i.test(error.message ?? "") &&
      /does not exist|schema cache/i.test(error.message ?? ""))
  );
}

function getBearerToken(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth) return null;
  return auth.replace(/Bearer\s+/i, "").trim() || null;
}

async function getOptionalUser(req: Request): Promise<User | null> {
  const token = getBearerToken(req);
  if (!token) return null;

  try {
    const { data, error } = await getAuthClient().auth.getUser(token);
    if (error || !data.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

function getParticipantIds(promise: PromisePublicAgreementRecord) {
  return new Set(
    [
      promise.creator_id,
      promise.counterparty_id,
      promise.promisor_id,
      promise.promisee_id,
      resolveExecutorId(promise),
    ].filter((value): value is string => Boolean(value))
  );
}

function isAgreementLive(promise: PromisePublicAgreementRecord) {
  const uiStatus = getPromiseUiStatus({
    status: isPromiseStatus(promise.status) ? promise.status : "active",
    invite_status: promise.invite_status,
    accepted_at: promise.accepted_at,
    counterparty_accepted_at: promise.counterparty_accepted_at,
    declined_at: promise.declined_at,
    ignored_at: promise.ignored_at,
    expires_at: promise.expires_at,
    cancelled_at: promise.cancelled_at,
  });
  return isAgreementLiveStatus(uiStatus);
}

function canUserPostUpdate(promise: PromisePublicAgreementRecord, userId: string | null) {
  if (!userId) return false;
  const executorId = resolveExecutorId(promise);
  return userId === promise.creator_id || userId === executorId;
}

function serializePublicAgreement(
  promise: PromisePublicAgreementRecord,
  profilesById: Map<string, PublicProfileRecord>,
  updates: AgreementUpdateRecord[],
  viewerCanUpdate: boolean,
  updatesAvailable = true,
  viewerFollowing = false,
  followersCount = 0,
  viewerCanFollow = true
) {
  const responsibleId = resolveExecutorId(promise);
  const reviewerId =
    promise.promisor_id && promise.promisee_id && promise.promisor_id === responsibleId
      ? promise.promisee_id
      : promise.promisor_id;
  const creatorProfile = profilesById.get(promise.creator_id) ?? null;
  const responsibleProfile = responsibleId ? profilesById.get(responsibleId) ?? null : null;
  const accepterProfile = promise.counterparty_id ? profilesById.get(promise.counterparty_id) ?? null : null;
  const reviewerProfile = reviewerId ? profilesById.get(reviewerId) ?? null : null;
  const counterpartyContact = promise.counterparty_contact?.trim() ?? "";
  const canUseCounterpartyContact = responsibleId === promise.counterparty_id;
  const publicCounterpartyContact =
    canUseCounterpartyContact &&
    !responsibleProfile &&
    counterpartyContact &&
    !isLikelyPrivateEmail(counterpartyContact)
      ? counterpartyContact
      : null;

  return {
    id: promise.id,
    title: promise.title,
    details: promise.details,
    condition_text: promise.condition_text,
    is_important: promise.is_important,
    status: promise.status,
    invite_status: promise.invite_status,
    created_at: promise.created_at,
    due_at: promise.due_at,
    completed_at: promise.completed_at,
    confirmed_at: promise.confirmed_at,
    disputed_at: promise.disputed_at,
    accepted_at: promise.accepted_at,
    counterparty_accepted_at: promise.counterparty_accepted_at,
    declined_at: promise.declined_at,
    ignored_at: promise.ignored_at,
    expires_at: promise.expires_at,
    cancelled_at: promise.cancelled_at,
    creator_display_name: creatorProfile?.display_name ?? null,
    creator_handle: creatorProfile?.is_public_profile ? creatorProfile.handle : null,
    creator_is_public_profile: creatorProfile?.is_public_profile ?? false,
    executor_display_name: responsibleProfile?.display_name ?? null,
    executor_handle: responsibleProfile?.is_public_profile ? responsibleProfile.handle : null,
    executor_is_public_profile: responsibleProfile?.is_public_profile ?? false,
    accepter_display_name: accepterProfile?.display_name ?? null,
    accepter_handle: accepterProfile?.is_public_profile ? accepterProfile.handle : null,
    accepter_is_public_profile: accepterProfile?.is_public_profile ?? false,
    accepter_contact: promise.counterparty_contact,
    reviewer_display_name: reviewerProfile?.display_name ?? null,
    reviewer_handle: reviewerProfile?.is_public_profile ? reviewerProfile.handle : null,
    reviewer_is_public_profile: reviewerProfile?.is_public_profile ?? false,
    reviewer_id: reviewerId ?? null,
    viewer_can_update: viewerCanUpdate,
    updates_available: updatesAvailable,
    viewer_following: viewerFollowing,
    followers_count: followersCount,
    viewer_can_follow: viewerCanFollow,
    updates: updates.map((update) => {
      const author = profilesById.get(update.author_id) ?? null;
      return {
        id: update.id,
        content: update.content,
        created_at: update.created_at,
        author_display_name: author?.display_name ?? null,
        author_handle: author?.is_public_profile ? author.handle : null,
      };
    }),
  };
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const admin = getAdminClient();

    const { data: promise, error } = await admin
      .from("promises")
      .select(
        "id,title,details,condition_text,is_important,status,invite_status,created_at,due_at,completed_at,confirmed_at,disputed_at,accepted_at,counterparty_accepted_at,declined_at,ignored_at,expires_at,cancelled_at,creator_id,counterparty_id,promisor_id,promisee_id,counterparty_contact"
      )
      .eq("id", id)
      .eq("visibility", "public")
      .maybeSingle<PromisePublicAgreementRecord>();

    if (error) {
      return NextResponse.json(
        { error: "Public agreement lookup failed", detail: error.message },
        { status: 500 }
      );
    }

    if (!promise) {
      return NextResponse.json({ error: "Public agreement not found" }, { status: 404 });
    }

    const { data: updates, error: updatesError } = await admin
      .from("agreement_updates")
      .select("id,agreement_id,author_id,content,created_at")
      .eq("agreement_id", promise.id)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .returns<AgreementUpdateRecord[]>();

    const updatesUnavailable = Boolean(updatesError);
    const publicUpdates = updatesUnavailable ? [] : updates;

    if (updatesError) {
      console.warn("Public agreement updates unavailable", {
        agreementId: promise.id,
        code: updatesError.code,
        message: updatesError.message,
        missingTable: isMissingAgreementUpdatesTable(updatesError),
      });
    }

    const responsibleId = resolveExecutorId(promise);
    const reviewerId =
      promise.promisor_id && promise.promisee_id && promise.promisor_id === responsibleId
        ? promise.promisee_id
        : promise.promisor_id;
    const profileIds = Array.from(
      new Set(
        [promise.creator_id, promise.counterparty_id, responsibleId, reviewerId, ...(publicUpdates ?? []).map((update) => update.author_id)].filter(
          (value): value is string => Boolean(value)
        )
      )
    );

    const profilesById = new Map<string, PublicProfileRecord>();
    if (profileIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id,display_name,handle,is_public_profile")
        .in("id", profileIds)
        .returns<PublicProfileRecord[]>();

      for (const profile of profiles ?? []) {
        profilesById.set(profile.id, profile);
      }
    }

    const participantIds = getParticipantIds(promise);
    const participantIdList = Array.from(participantIds);

    const user = await getOptionalUser(req);
    const viewerIsParticipant = Boolean(user?.id && participantIds.has(user.id));
    let viewerFollowing = false;
    if (user?.id) {
      const { data: follow } = await admin
        .from("agreement_followers")
        .select("id")
        .eq("agreement_id", promise.id)
        .eq("user_id", user.id)
        .maybeSingle();
      viewerFollowing = Boolean(follow?.id) && !viewerIsParticipant;
    }

    let followerCountQuery = admin
      .from("agreement_followers")
      .select("id", { count: "exact", head: true })
      .eq("agreement_id", promise.id);

    if (participantIdList.length > 0) {
      followerCountQuery = followerCountQuery.not("user_id", "in", `(${participantIdList.join(",")})`);
    }

    const { count: followersCount } = await followerCountQuery;

    const agreementLive = isAgreementLive(promise);

    return NextResponse.json(
      serializePublicAgreement(
        promise,
        profilesById,
        publicUpdates ?? [],
        canUserPostUpdate(promise, user?.id ?? null),
        !updatesUnavailable && agreementLive,
        viewerFollowing,
        followersCount ?? 0,
        !viewerIsParticipant
      )
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (user instanceof NextResponse) return user;

    const { id } = await ctx.params;
    const payload = (await req.json().catch(() => null)) as { content?: unknown } | null;
    const content = typeof payload?.content === "string" ? payload.content.trim() : "";

    if (content.length < 1 || content.length > 500) {
      return NextResponse.json({ error: "Update content must be 1–500 characters" }, { status: 400 });
    }

    const admin = getAdminClient();
    const { data: promise, error } = await admin
      .from("promises")
      .select(
        "id,title,details,condition_text,is_important,status,invite_status,created_at,due_at,completed_at,confirmed_at,disputed_at,accepted_at,counterparty_accepted_at,declined_at,ignored_at,expires_at,cancelled_at,creator_id,counterparty_id,promisor_id,promisee_id,counterparty_contact"
      )
      .eq("id", id)
      .eq("visibility", "public")
      .maybeSingle<PromisePublicAgreementRecord>();

    if (error) {
      return NextResponse.json(
        { error: "Public agreement lookup failed", detail: error.message },
        { status: 500 }
      );
    }

    if (!promise) {
      return NextResponse.json({ error: "Public agreement not found" }, { status: 404 });
    }

    if (!canUserPostUpdate(promise, user.id)) {
      return NextResponse.json({ error: "Only agreement participants can add updates" }, { status: 403 });
    }

    if (!isAgreementLive(promise)) {
      return NextResponse.json({ error: "Agreement is no longer live" }, { status: 409 });
    }

    const { data: update, error: insertError } = await admin
      .from("agreement_updates")
      .insert({ agreement_id: promise.id, author_id: user.id, content })
      .select("id,agreement_id,author_id,content,created_at")
      .single<AgreementUpdateRecord>();

    if (insertError) {
      if (isMissingAgreementUpdatesTable(insertError)) {
        return NextResponse.json(
          { error: "Agreement updates are not configured yet", detail: insertError.message },
          { status: 503 }
        );
      }

      return NextResponse.json(
        { error: "Could not create agreement update", detail: insertError.message },
        { status: 500 }
      );
    }

    await notifyAgreementWatchers(admin, promise, "public_agreement_updated", {
      actorId: user.id,
      eventId: update.id,
    });

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
