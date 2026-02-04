import { createClient } from "@supabase/supabase-js";

const baseUrl = process.env.DREDDI_BASE_URL || "http://localhost:3000";
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const cronSecret = process.env.NOTIFICATIONS_CRON_SECRET;

const creatorEmail = process.env.DREDDI_CREATOR_EMAIL || "creator@example.com";
const executorEmail = process.env.DREDDI_EXECUTOR_EMAIL || "executor@example.com";
const testPassword = process.env.DREDDI_TEST_PASSWORD || "Password123!";

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

const findUserByEmail = async (email: string) => {
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) throw new Error(`listUsers failed: ${error.message}`);
  return data.users.find((u) => (u.email || "").toLowerCase() === email.toLowerCase()) || null;
};

const ensureUser = async (args: {
  email: string;
  password: string;
  handle: string;
  displayName: string;
}) => {
  let user = await findUserByEmail(args.email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: args.email,
      password: args.password,
      email_confirm: true,
    });
    if (error || !data.user) {
      throw new Error(`createUser failed for ${args.email}: ${error?.message}`);
    }
    user = data.user;
  }

  const profilePayload = {
    id: user.id,
    email: args.email,
    handle: args.handle,
    display_name: args.displayName,
    locale: "en",
    push_notifications_enabled: true,
    deadline_reminders_enabled: true,
    quiet_hours_enabled: false,
  };

  const { error: profileError } = await admin.from("profiles").upsert(profilePayload);
  if (profileError) {
    throw new Error(`profile upsert failed: ${profileError.message}`);
  }

  return user;
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
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body: json };
};

const fetchPromise = async (id: string) => {
  const { data, error } = await admin
    .from("promises")
    .select("id,invite_token,counterparty_id,creator_id,status")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`promise fetch failed: ${error.message}`);
  if (!data) throw new Error(`promise not found: ${id}`);
  return data;
};

const logResult = (label: string, result: { ok: boolean; status: number; body: unknown }) => {
  console.log(`${label}:`, result.status, result.ok ? "OK" : "FAIL", result.body);
};

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
const hoursFromNow = (hours: number) =>
  new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

const run = async () => {
  console.log("Seeding users...");
  await ensureUser({
    email: creatorEmail,
    password: testPassword,
    handle: "creator-dev",
    displayName: "Creator Dev",
  });
  await ensureUser({
    email: executorEmail,
    password: testPassword,
    handle: "executor-dev",
    displayName: "Executor Dev",
  });

  const creatorToken = await signIn(creatorEmail, testPassword);
  const executorToken = await signIn(executorEmail, testPassword);

  console.log("Creating promises...");
  const dueSoon = await callApi("/api/promises/create", creatorToken, {
    title: "Verify: due soon",
    details: "Promise with due_at in 6h.",
    conditionText: null,
    counterpartyContact: executorEmail,
    dueAt: hoursFromNow(6),
    executor: "other",
    visibility: "private",
  });
  logResult("create dueSoon", dueSoon);

  const overdue = await callApi("/api/promises/create", creatorToken, {
    title: "Verify: overdue",
    details: "Promise overdue by 4 days.",
    conditionText: null,
    counterpartyContact: executorEmail,
    dueAt: hoursAgo(96),
    executor: "other",
    visibility: "private",
  });
  logResult("create overdue", overdue);

  const pendingInvite = await callApi("/api/promises/create", creatorToken, {
    title: "Verify: pending invite",
    details: "Promise to test invite followups/ignore.",
    conditionText: "Send evidence",
    counterpartyContact: executorEmail,
    dueAt: null,
    executor: "other",
    visibility: "private",
  });
  logResult("create pending", pendingInvite);

  if (!dueSoon.ok || !overdue.ok || !pendingInvite.ok) {
    throw new Error("Failed to create promises; aborting.");
  }

  const dueSoonPromise = await fetchPromise((dueSoon.body as { id: string }).id);
  const overduePromise = await fetchPromise((overdue.body as { id: string }).id);
  const pendingPromise = await fetchPromise((pendingInvite.body as { id: string }).id);

  console.log("Accepting invites for dueSoon and overdue...");
  logResult(
    "accept dueSoon",
    await callApi(`/api/invite/${dueSoonPromise.invite_token}/accept`, executorToken)
  );
  logResult(
    "accept overdue",
    await callApi(`/api/invite/${overduePromise.invite_token}/accept`, executorToken)
  );

  console.log("Adjusting timestamps for followups...");
  await admin
    .from("promise_notification_state")
    .update({ invite_notified_at: hoursAgo(25), updated_at: new Date().toISOString() })
    .eq("promise_id", pendingPromise.id);

  console.log("Running cron (invite followup, due soon, overdue)...");
  logResult("cron 1", await callCron());

  console.log("Adjusting pending invite to trigger ignore...");
  await admin
    .from("promises")
    .update({ invited_at: hoursAgo(96) })
    .eq("id", pendingPromise.id);

  logResult("cron 2", await callCron());

  console.log("Completing dueSoon + overdue promises...");
  logResult(
    "complete dueSoon",
    await callApi(`/api/promises/${dueSoonPromise.id}/complete`, executorToken)
  );
  logResult(
    "complete overdue",
    await callApi(`/api/promises/${overduePromise.id}/complete`, executorToken)
  );

  console.log("Backdating completion for followups...");
  const completionBackdate = hoursAgo(25);
  await admin
    .from("promises")
    .update({ completed_at: completionBackdate })
    .eq("id", dueSoonPromise.id);
  await admin
    .from("promise_notification_state")
    .update({
      completion_notified_at: completionBackdate,
      completion_cycle_started_at: completionBackdate,
      completion_followups_count: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("promise_id", dueSoonPromise.id);

  logResult("cron 3", await callCron());

  console.log("Triggering 72h completion followup...");
  const completionBackdate72 = hoursAgo(73);
  await admin
    .from("promise_notification_state")
    .update({
      completion_notified_at: completionBackdate72,
      completion_followups_count: 1,
      updated_at: new Date().toISOString(),
    })
    .eq("promise_id", dueSoonPromise.id);

  logResult("cron 4", await callCron());

  console.log("Confirming and disputing to produce outcome notifications...");
  logResult(
    "confirm dueSoon",
    await callApi(`/api/promises/${dueSoonPromise.id}/confirm`, creatorToken)
  );
  logResult(
    "dispute overdue",
    await callApi(`/api/promises/${overduePromise.id}/dispute`, creatorToken)
  );

  console.log("Notifications snapshot:");
  const { data: notifications, error } = await admin
    .from("notifications")
    .select("id,user_id,promise_id,type,dedupe_key,created_at,delivered_at,read_at,cta_url")
    .in("promise_id", [dueSoonPromise.id, overduePromise.id, pendingPromise.id])
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`notification fetch failed: ${error.message}`);
  }

  console.table(notifications || []);
};

run().catch((error) => {
  console.error("Verification run failed:", error);
  process.exit(1);
});
