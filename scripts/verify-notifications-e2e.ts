import { createClient } from "@supabase/supabase-js";

type ScenarioResult = {
  scenario: string;
  expectedCount: number;
  actualCount: number;
  types: string;
  recipients: string;
  pass: boolean;
  details?: string;
};

type CronResponse = {
  ok: boolean;
  results: Record<string, number>;
  processed?: Record<string, number>;
  skipped?: Record<string, number>;
  missingRecipients?: Record<string, number>;
};

const baseUrl = process.env.DREDDI_BASE_URL || "http://localhost:3000";
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const cronSecret = process.env.NOTIFICATIONS_CRON_SECRET;

if (!supabaseUrl || !anonKey || !serviceKey) {
  console.error(
    "Missing env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const buildClient = () =>
  createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3600 * 1000).toISOString();
const hoursFromNow = (hours: number) =>
  new Date(Date.now() + hours * 3600 * 1000).toISOString();

const logResult = (label: string, ok: boolean, status: number) => {
  console.log(`${label}:`, status, ok ? "OK" : "FAIL");
};

const ensureUser = async (args: {
  email: string;
  password: string;
  handle: string;
  displayName: string;
  deadlineRemindersEnabled?: boolean;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}) => {
  const { data, error } = await admin.auth.admin.createUser({
    email: args.email,
    password: args.password,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`createUser failed for ${args.email}: ${error?.message}`);
  }

  const profilePayload = {
    id: data.user.id,
    email: args.email,
    handle: args.handle,
    display_name: args.displayName,
    locale: "en",
    push_notifications_enabled: true,
    deadline_reminders_enabled: args.deadlineRemindersEnabled ?? true,
    quiet_hours_enabled: args.quietHoursEnabled ?? false,
    quiet_hours_start: args.quietHoursStart ?? "22:00",
    quiet_hours_end: args.quietHoursEnd ?? "09:00",
  };

  const { error: profileError } = await admin.from("profiles").upsert(profilePayload);
  if (profileError) {
    throw new Error(`profile upsert failed: ${profileError.message}`);
  }

  return data.user;
};

const signIn = async (email: string, password: string) => {
  const client = buildClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) {
    throw new Error(`signIn failed for ${email}: ${error?.message}`);
  }
  return data.session.access_token;
};

const callApi = async (path: string, token: string, body?: Record<string, unknown>) => {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body: json };
};

const callCron = async () => {
  const res = await fetch(`${baseUrl}/api/notifications/cron`, {
    method: "POST",
    headers: cronSecret ? { Authorization: `Bearer ${cronSecret}` } : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as CronResponse;
  return { ok: res.ok, status: res.status, body: json };
};

const fetchPromise = async (id: string) => {
  const { data, error } = await admin
    .from("promises")
    .select(
      "id,invite_token,counterparty_id,creator_id,status,invite_status,invited_at,due_at,completed_at"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`promise fetch failed: ${error.message}`);
  if (!data) throw new Error(`promise not found: ${id}`);
  return data;
};

const fetchNotificationState = async (promiseId: string) => {
  const { data, error } = await admin
    .from("promise_notification_state")
    .select(
      "promise_id,invite_notified_at,invite_followup_notified_at,due_soon_notified_at,overdue_notified_at,overdue_creator_notified_at,completion_notified_at,completion_followups_count,completion_cycle_id"
    )
    .eq("promise_id", promiseId)
    .maybeSingle();
  if (error) throw new Error(`notification state fetch failed: ${error.message}`);
  return data;
};

const fetchNotificationsForPromise = async (promiseId: string) => {
  const { data, error } = await admin
    .from("notifications")
    .select("id,user_id,promise_id,type,dedupe_key,cta_url,created_at,delivered_at,read_at,body")
    .eq("promise_id", promiseId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`notification fetch failed: ${error.message}`);
  return data ?? [];
};

const recordScenario = (
  results: ScenarioResult[],
  scenario: string,
  expectedCount: number,
  rows: Array<{ type: string | null; user_id: string | null }>,
  pass: boolean,
  details?: string
) => {
  results.push({
    scenario,
    expectedCount,
    actualCount: rows.length,
    types: rows.map((row) => row.type).filter(Boolean).join(", ") || "-",
    recipients: rows.map((row) => row.user_id).filter(Boolean).join(", ") || "-",
    pass,
    details,
  });
};

const createPromise = async (token: string, payload: Record<string, unknown>) => {
  const result = await callApi("/api/promises/create", token, payload);
  logResult("create promise", result.ok, result.status);
  if (!result.ok) {
    throw new Error(`promise create failed: ${JSON.stringify(result.body)}`);
  }
  return result.body as { id: string };
};

const createAcceptedPromise = async (args: {
  creatorToken: string;
  executorToken: string;
  counterpartyEmail: string;
  title: string;
  dueAt: string | null;
}) => {
  const created = await createPromise(args.creatorToken, {
    title: args.title,
    details: `E2E ${runId}`,
    conditionText: null,
    counterpartyContact: args.counterpartyEmail,
    dueAt: args.dueAt,
    executor: "other",
    visibility: "private",
  });
  const promiseRow = await fetchPromise(created.id);
  const accepted = await callApi(
    `/api/invite/${promiseRow.invite_token}/accept`,
    args.executorToken
  );
  logResult("accept invite", accepted.ok, accepted.status);
  if (!accepted.ok) {
    throw new Error(`invite accept failed: ${JSON.stringify(accepted.body)}`);
  }
  return await fetchPromise(created.id);
};

const run = async () => {
  const results: ScenarioResult[] = [];
  const createdUserIds: string[] = [];
  const createdPromiseIds: string[] = [];
  const skipSnapshots: Array<{
    label: string;
    skipped?: Record<string, number>;
    missingRecipients?: Record<string, number>;
  }> = [];

  const password = `Password-${runId}!`;
  const creatorEmail = `creator-${runId}@example.com`;
  const executorEmail = `executor-${runId}@example.com`;
  const executorQuietEmail = `executor-quiet-${runId}@example.com`;
  const executorNoRemindersEmail = `executor-noremind-${runId}@example.com`;

  try {
    const quietStart = new Date(Date.now() - 30 * 60 * 1000);
    const quietEnd = new Date(Date.now() + 30 * 60 * 1000);
    const quietStartStr = `${quietStart.getHours().toString().padStart(2, "0")}:${quietStart
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
    const quietEndStr = `${quietEnd.getHours().toString().padStart(2, "0")}:${quietEnd
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;

    const creator = await ensureUser({
      email: creatorEmail,
      password,
      handle: `creator-${runId}`,
      displayName: "Creator E2E",
    });
    const executor = await ensureUser({
      email: executorEmail,
      password,
      handle: `executor-${runId}`,
      displayName: "Executor E2E",
    });
    const executorQuiet = await ensureUser({
      email: executorQuietEmail,
      password,
      handle: `executor-quiet-${runId}`,
      displayName: "Executor Quiet",
      quietHoursEnabled: true,
      quietHoursStart: quietStartStr,
      quietHoursEnd: quietEndStr,
    });
    const executorNoReminders = await ensureUser({
      email: executorNoRemindersEmail,
      password,
      handle: `executor-noremind-${runId}`,
      displayName: "Executor No Reminders",
      deadlineRemindersEnabled: false,
    });

    createdUserIds.push(
      creator.id,
      executor.id,
      executorQuiet.id,
      executorNoReminders.id
    );

    const creatorToken = await signIn(creatorEmail, password);
    const executorToken = await signIn(executorEmail, password);
    const executorQuietToken = await signIn(executorQuietEmail, password);
    const executorNoRemindersToken = await signIn(executorNoRemindersEmail, password);

    const callCronWithLabel = async (label: string) => {
      const response = await callCron();
      skipSnapshots.push({
        label,
        skipped: response.body.skipped,
        missingRecipients: response.body.missingRecipients,
      });
      return response;
    };

    // S1: Invite created (counterparty exists)
    const invitePromise = await createPromise(creatorToken, {
      title: "S1 Invite",
      details: `S1 ${runId}`,
      conditionText: null,
      counterpartyContact: executorQuietEmail,
      dueAt: null,
      executor: "other",
      visibility: "private",
    });
    createdPromiseIds.push(invitePromise.id);
    const invitePromiseRow = await fetchPromise(invitePromise.id);
    const inviteNotifications = await fetchNotificationsForPromise(invitePromise.id);
    const inviteRows = inviteNotifications.filter(
      (row) => row.type === "invite" && row.user_id === executorQuiet.id
    );
    const inviteRow = inviteRows[0];
    const inviteExpectedCta = `/p/invite/${invitePromiseRow.invite_token}`;
    const invitePass =
      inviteRows.length === 1 &&
      inviteRow?.cta_url === inviteExpectedCta &&
      inviteRow?.dedupe_key === `invite:${invitePromise.id}`;
    const inviteQuietPass = inviteRow?.delivered_at === null;
    recordScenario(
      results,
      "S1 Invite created",
      1,
      inviteRows,
      invitePass && inviteQuietPass,
      invitePass
        ? inviteQuietPass
          ? undefined
          : "Expected delivered_at to be null during quiet hours"
        : "Invite row mismatch"
    );

    // S2: Invite accepted → creator + executor get invite_followup
    const acceptInvite = await callApi(
      `/api/invite/${invitePromiseRow.invite_token}/accept`,
      executorQuietToken
    );
    logResult("accept invite S2", acceptInvite.ok, acceptInvite.status);
    const followupRows = (await fetchNotificationsForPromise(invitePromise.id)).filter(
      (row) => row.type === "invite_followup"
    );
    const followupPass =
      followupRows.length === 2 &&
      followupRows.some((row) => row.user_id === creator.id) &&
      followupRows.some((row) => row.user_id === executorQuiet.id) &&
      followupRows.every((row) => row.cta_url === `/promises/${invitePromise.id}`);
    recordScenario(
      results,
      "S2 Invite accepted",
      2,
      followupRows,
      followupPass,
      followupPass ? undefined : "Expected creator + executor invite_followup"
    );

    // S3: Invite declined → creator gets invite_declined
    const declinedPromise = await createPromise(creatorToken, {
      title: "S3 Decline",
      details: `S3 ${runId}`,
      conditionText: null,
      counterpartyContact: executorEmail,
      dueAt: null,
      executor: "other",
      visibility: "private",
    });
    createdPromiseIds.push(declinedPromise.id);
    const declinedRow = await fetchPromise(declinedPromise.id);
    const declinedResp = await callApi(
      `/api/invite/${declinedRow.invite_token}/decline`,
      executorToken
    );
    logResult("decline invite", declinedResp.ok, declinedResp.status);
    const declinedNotifications = (await fetchNotificationsForPromise(declinedPromise.id)).filter(
      (row) => row.type === "invite_declined" && row.user_id === creator.id
    );
    const declinedPass =
      declinedNotifications.length === 1 &&
      declinedNotifications[0]?.dedupe_key === `invite_declined:${declinedPromise.id}`;
    recordScenario(
      results,
      "S3 Invite declined",
      1,
      declinedNotifications,
      declinedPass,
      declinedPass ? undefined : "Invite declined notification missing"
    );

    // S4: Mark complete → creator gets completion_waiting
    const completionPromise = await createAcceptedPromise({
      creatorToken,
      executorToken,
      counterpartyEmail: executorEmail,
      title: "S4 Complete",
      dueAt: hoursFromNow(48),
    });
    createdPromiseIds.push(completionPromise.id);
    const completeResp = await callApi(
      `/api/promises/${completionPromise.id}/complete`,
      executorToken
    );
    logResult("complete promise", completeResp.ok, completeResp.status);
    const completionState = await fetchNotificationState(completionPromise.id);
    const completionRows = (await fetchNotificationsForPromise(completionPromise.id)).filter(
      (row) => row.type === "completion_waiting" && row.user_id === creator.id
    );
    const completionDedupe = `completion_waiting:${completionPromise.id}:${completionState?.completion_cycle_id ?? 0}:initial`;
    const completionPass =
      completionRows.length === 1 &&
      completionRows[0]?.cta_url === `/promises/${completionPromise.id}/confirm` &&
      completionRows[0]?.dedupe_key === completionDedupe;
    recordScenario(
      results,
      "S4 Mark complete",
      1,
      completionRows,
      completionPass,
      completionPass ? undefined : "Completion waiting notification mismatch"
    );

    // S5: Confirm → executor gets completion_followup + delta
    const confirmResp = await callApi(
      `/api/promises/${completionPromise.id}/confirm`,
      creatorToken
    );
    logResult("confirm promise", confirmResp.ok, confirmResp.status);
    const confirmRows = (await fetchNotificationsForPromise(completionPromise.id)).filter(
      (row) => row.type === "completion_followup" && row.user_id === executor.id
    );
    const expectedDelta = 4;
    const confirmBody = confirmRows[0]?.body ?? "";
    const confirmPass =
      confirmRows.length === 1 &&
      confirmRows[0]?.dedupe_key === `completion_followup:${completionPromise.id}` &&
      confirmRows[0]?.cta_url === `/promises/${completionPromise.id}` &&
      confirmBody.includes(`+${expectedDelta}`);
    recordScenario(
      results,
      "S5 Confirm",
      1,
      confirmRows,
      confirmPass,
      confirmPass ? undefined : `Expected completion_followup body to include +${expectedDelta}`
    );

    // S6: Dispute → executor gets dispute
    const disputePromise = await createAcceptedPromise({
      creatorToken,
      executorToken,
      counterpartyEmail: executorEmail,
      title: "S6 Dispute",
      dueAt: hoursAgo(1),
    });
    createdPromiseIds.push(disputePromise.id);
    const disputeComplete = await callApi(
      `/api/promises/${disputePromise.id}/complete`,
      executorToken
    );
    logResult("complete dispute promise", disputeComplete.ok, disputeComplete.status);
    const disputeResp = await callApi(
      `/api/promises/${disputePromise.id}/dispute`,
      creatorToken,
      { code: "late", reason: "E2E dispute" }
    );
    logResult("dispute promise", disputeResp.ok, disputeResp.status);
    const disputeRows = (await fetchNotificationsForPromise(disputePromise.id)).filter(
      (row) => row.type === "dispute" && row.user_id === executor.id
    );
    const disputePass =
      disputeRows.length === 1 &&
      disputeRows[0]?.dedupe_key === `dispute:${disputePromise.id}` &&
      disputeRows[0]?.cta_url === `/promises/${disputePromise.id}`;
    recordScenario(
      results,
      "S6 Dispute",
      1,
      disputeRows,
      disputePass,
      disputePass ? undefined : "Dispute notification mismatch"
    );

    // S7: Cron due soon (reminders enabled)
    const dueSoonPromise = await createAcceptedPromise({
      creatorToken,
      executorToken,
      counterpartyEmail: executorEmail,
      title: "S7 Due Soon",
      dueAt: hoursFromNow(6),
    });
    createdPromiseIds.push(dueSoonPromise.id);
    const cronDueSoon = await callCronWithLabel("cron due soon");
    logResult("cron due soon", cronDueSoon.ok, cronDueSoon.status);
    const dueSoonRows = (await fetchNotificationsForPromise(dueSoonPromise.id)).filter(
      (row) => row.type === "due_soon" && row.user_id === executor.id
    );
    const dueSoonPass =
      dueSoonRows.length === 1 &&
      dueSoonRows[0]?.dedupe_key === `due_soon:${dueSoonPromise.id}` &&
      dueSoonRows[0]?.cta_url === `/promises/${dueSoonPromise.id}`;
    recordScenario(
      results,
      "S7 Cron due soon",
      1,
      dueSoonRows,
      dueSoonPass,
      dueSoonPass ? undefined : "Due soon notification missing"
    );

    // S7b: Cron due soon suppressed (reminders disabled)
    const dueSoonSuppressed = await createAcceptedPromise({
      creatorToken,
      executorToken: executorNoRemindersToken,
      counterpartyEmail: executorNoRemindersEmail,
      title: "S7b Due Soon Off",
      dueAt: hoursFromNow(6),
    });
    createdPromiseIds.push(dueSoonSuppressed.id);
    const cronSuppressed = await callCronWithLabel("cron due soon suppressed");
    logResult("cron due soon suppressed", cronSuppressed.ok, cronSuppressed.status);
    const suppressedRows = (await fetchNotificationsForPromise(dueSoonSuppressed.id)).filter(
      (row) => row.type === "due_soon"
    );
    const suppressedPass =
      suppressedRows.length === 0 &&
      Boolean(cronSuppressed.body.skipped?.deadline_reminders_disabled);
    recordScenario(
      results,
      "S7b Due soon suppressed",
      0,
      suppressedRows,
      suppressedPass,
      suppressedPass ? undefined : "Expected deadline_reminders_disabled skip"
    );

    // S8: Cron overdue executor repeat + creator once
    const overduePromise = await createAcceptedPromise({
      creatorToken,
      executorToken,
      counterpartyEmail: executorEmail,
      title: "S8 Overdue",
      dueAt: hoursAgo(96),
    });
    createdPromiseIds.push(overduePromise.id);
    await admin
      .from("promise_notification_state")
      .upsert({
        promise_id: overduePromise.id,
        overdue_notified_at: hoursAgo(73),
        overdue_creator_notified_at: null,
        updated_at: new Date().toISOString(),
      });
    const cronOverdue = await callCronWithLabel("cron overdue");
    logResult("cron overdue", cronOverdue.ok, cronOverdue.status);
    const overdueRows = (await fetchNotificationsForPromise(overduePromise.id)).filter(
      (row) => row.type === "overdue"
    );
    const overduePass =
      overdueRows.length === 2 &&
      overdueRows.some(
        (row) =>
          row.user_id === executor.id &&
          row.dedupe_key === `overdue:${overduePromise.id}:executor:repeat`
      ) &&
      overdueRows.some(
        (row) => row.user_id === creator.id && row.dedupe_key === `overdue:${overduePromise.id}:creator`
      );
    recordScenario(
      results,
      "S8 Cron overdue",
      2,
      overdueRows,
      overduePass,
      overduePass ? undefined : "Expected overdue notifications for executor + creator"
    );

    // S9: Cron invite ignored after IGNORE_AFTER_HOURS
    const ignoredPromise = await createPromise(creatorToken, {
      title: "S9 Invite ignored",
      details: `S9 ${runId}`,
      conditionText: null,
      counterpartyContact: executorEmail,
      dueAt: null,
      executor: "other",
      visibility: "private",
    });
    createdPromiseIds.push(ignoredPromise.id);
    await admin
      .from("promises")
      .update({ invited_at: hoursAgo(96) })
      .eq("id", ignoredPromise.id);
    const cronIgnored = await callCronWithLabel("cron invite ignored");
    logResult("cron invite ignored", cronIgnored.ok, cronIgnored.status);
    const ignoredRows = (await fetchNotificationsForPromise(ignoredPromise.id)).filter(
      (row) => row.type === "invite_ignored" && row.user_id === creator.id
    );
    const ignoredPromiseRow = await fetchPromise(ignoredPromise.id);
    const ignoredPass =
      ignoredRows.length === 1 &&
      ignoredRows[0]?.dedupe_key === `invite_ignored:${ignoredPromise.id}` &&
      ignoredPromiseRow.status === "declined" &&
      ignoredPromiseRow.invite_status === "ignored";
    recordScenario(
      results,
      "S9 Cron invite ignored",
      1,
      ignoredRows,
      ignoredPass,
      ignoredPass ? undefined : "Invite ignored notification or status mismatch"
    );

    // S10a: Cron completion followup 24h
    const completionFollowupPromise = await createAcceptedPromise({
      creatorToken,
      executorToken,
      counterpartyEmail: executorEmail,
      title: "S10 Completion followup",
      dueAt: hoursFromNow(12),
    });
    createdPromiseIds.push(completionFollowupPromise.id);
    const completionFollowupComplete = await callApi(
      `/api/promises/${completionFollowupPromise.id}/complete`,
      executorToken
    );
    logResult("complete followup promise", completionFollowupComplete.ok, completionFollowupComplete.status);
    const completionFollowupState = await fetchNotificationState(completionFollowupPromise.id);
    await admin
      .from("promise_notification_state")
      .update({
        completion_notified_at: hoursAgo(25),
        completion_followups_count: 0,
      })
      .eq("promise_id", completionFollowupPromise.id);
    const cronFollowup24 = await callCronWithLabel("cron completion 24h");
    logResult("cron completion 24h", cronFollowup24.ok, cronFollowup24.status);
    const followup24Rows = (await fetchNotificationsForPromise(completionFollowupPromise.id)).filter(
      (row) => row.type === "completion_waiting" && row.user_id === creator.id
    );
    const followup24Dedupe = `completion_waiting:${completionFollowupPromise.id}:${completionFollowupState?.completion_cycle_id ?? 0}:completion24`;
    const followup24Pass =
      followup24Rows.some((row) => row.dedupe_key === followup24Dedupe) &&
      followup24Rows.some((row) => row.cta_url === `/promises/${completionFollowupPromise.id}/confirm`);
    recordScenario(
      results,
      "S10 Cron completion followup 24h",
      1,
      followup24Rows.filter((row) => row.dedupe_key === followup24Dedupe),
      followup24Pass,
      followup24Pass ? undefined : "Completion followup 24h missing"
    );

    // S10b: Cron completion followup 72h
    await admin
      .from("promise_notification_state")
      .update({
        completion_notified_at: hoursAgo(73),
        completion_followups_count: 1,
      })
      .eq("promise_id", completionFollowupPromise.id);
    const cronFollowup72 = await callCronWithLabel("cron completion 72h");
    logResult("cron completion 72h", cronFollowup72.ok, cronFollowup72.status);
    const followup72Rows = (await fetchNotificationsForPromise(completionFollowupPromise.id)).filter(
      (row) => row.type === "completion_waiting" && row.user_id === creator.id
    );
    const followup72Dedupe = `completion_waiting:${completionFollowupPromise.id}:${completionFollowupState?.completion_cycle_id ?? 0}:completion72`;
    const followup72Pass = followup72Rows.some((row) => row.dedupe_key === followup72Dedupe);
    recordScenario(
      results,
      "S10 Cron completion followup 72h",
      1,
      followup72Rows.filter((row) => row.dedupe_key === followup72Dedupe),
      followup72Pass,
      followup72Pass ? undefined : "Completion followup 72h missing"
    );

    // Skip reason checks: dedupe + per-deal cap + missing recipient
    const dedupePromise = await createAcceptedPromise({
      creatorToken,
      executorToken,
      counterpartyEmail: executorEmail,
      title: "Skip dedupe",
      dueAt: hoursFromNow(4),
    });
    createdPromiseIds.push(dedupePromise.id);
    await admin.from("notifications").insert({
      user_id: executor.id,
      promise_id: dedupePromise.id,
      type: "due_soon",
      title: "",
      body: "",
      cta_label: null,
      cta_url: `/promises/${dedupePromise.id}`,
      priority: "normal",
      dedupe_key: `due_soon:${dedupePromise.id}`,
    });
    await admin
      .from("promise_notification_state")
      .update({ due_soon_notified_at: null })
      .eq("promise_id", dedupePromise.id);
    const cronDedupe = await callCronWithLabel("cron dedupe skip");
    const dedupePass = Boolean(cronDedupe.body.skipped?.dedupe);
    recordScenario(
      results,
      "Skip dedupe recorded",
      0,
      [],
      dedupePass,
      dedupePass ? undefined : "Expected dedupe skip to be tracked"
    );

    const perDealPromise = await createPromise(creatorToken, {
      title: "Skip per-deal cap",
      details: `per-deal ${runId}`,
      conditionText: null,
      counterpartyContact: executorEmail,
      dueAt: null,
      executor: "other",
      visibility: "private",
    });
    createdPromiseIds.push(perDealPromise.id);
    await admin
      .from("promise_notification_state")
      .update({ invite_notified_at: hoursAgo(25), invite_followup_notified_at: null })
      .eq("promise_id", perDealPromise.id);
    await admin.from("notifications").insert({
      user_id: executor.id,
      promise_id: perDealPromise.id,
      type: "invite",
      title: "",
      body: "",
      cta_label: null,
      cta_url: `/p/invite/${(await fetchPromise(perDealPromise.id)).invite_token}`,
      priority: "normal",
      dedupe_key: `invite:${perDealPromise.id}`,
    });
    const cronPerDeal = await callCronWithLabel("cron per-deal cap skip");
    const perDealPass = Boolean(cronPerDeal.body.skipped?.per_deal_cap);
    recordScenario(
      results,
      "Skip per-deal cap recorded",
      0,
      [],
      perDealPass,
      perDealPass ? undefined : "Expected per_deal_cap skip to be tracked"
    );

    const missingRecipientPromise = await createPromise(creatorToken, {
      title: "Missing recipient",
      details: `missing ${runId}`,
      conditionText: null,
      counterpartyContact: `missing-${runId}@example.com`,
      dueAt: hoursFromNow(5),
      executor: "other",
      visibility: "private",
    });
    createdPromiseIds.push(missingRecipientPromise.id);
    await admin
      .from("promises")
      .update({
        invite_status: "accepted",
        counterparty_accepted_at: new Date().toISOString(),
        counterparty_id: null,
      })
      .eq("id", missingRecipientPromise.id);
    const cronMissing = await callCronWithLabel("cron missing recipient");
    const missingPass = Object.keys(cronMissing.body.missingRecipients ?? {}).length > 0;
    recordScenario(
      results,
      "Recipient unresolved logged",
      0,
      [],
      missingPass,
      missingPass ? undefined : "Expected missingRecipients to be reported"
    );

    console.log("\nScenario results:");
    console.table(
      results.map((row) => ({
        Scenario: row.scenario,
        Expected: row.expectedCount,
        Actual: row.actualCount,
        Types: row.types,
        Recipients: row.recipients,
        Result: row.pass ? "PASS" : "FAIL",
        Details: row.details ?? "",
      }))
    );

    const failed = results.filter((row) => !row.pass);
    if (failed.length) {
      console.log("\nFailures:");
      failed.forEach((row) => {
        console.log(`- ${row.scenario}: ${row.details ?? "Unknown failure"}`);
      });
      if (skipSnapshots.length) {
        console.log("\nCaptured skip reasons:");
        console.log(JSON.stringify(skipSnapshots.slice(-20), null, 2));
      }
      process.exitCode = 1;
    }
  } finally {
    if (createdPromiseIds.length) {
      await admin.from("notifications").delete().in("promise_id", createdPromiseIds);
      await admin.from("promise_notification_state").delete().in("promise_id", createdPromiseIds);
      await admin.from("promises").delete().in("id", createdPromiseIds);
    }
    if (createdUserIds.length) {
      await admin.from("profiles").delete().in("id", createdUserIds);
      for (const userId of createdUserIds) {
        await admin.auth.admin.deleteUser(userId);
      }
    }
  }
};

run().catch((error) => {
  console.error("Verification run failed:", error);
  process.exit(1);
});
