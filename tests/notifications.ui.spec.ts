/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

type NotificationRow = {
  id: string;
  read_at: string | null;
};

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const baseUrl = process.env.DREDDI_BASE_URL || "http://localhost:3000";

const hasEnv = Boolean(supabaseUrl && anonKey && serviceKey);

test.describe("notifications UI", () => {
  test.skip(!hasEnv, "Supabase env vars are required for UI notification tests.");

  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const password = `Password-${runId}!`;
  const creatorEmail = `ui-creator-${runId}@example.com`;
  const executorEmail = `ui-executor-${runId}@example.com`;

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anonClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let creatorId = "";
  let executorId = "";
  let creatorToken = "";
  let executorToken = "";
  let promiseId = "";
  let completionNotificationId = "";

  test.beforeAll(async () => {
    const creator = await admin.auth.admin.createUser({
      email: creatorEmail,
      password,
      email_confirm: true,
    });
    const executor = await admin.auth.admin.createUser({
      email: executorEmail,
      password,
      email_confirm: true,
    });

    if (!creator.data.user || !executor.data.user) {
      throw new Error("Failed to create UI test users");
    }

    creatorId = creator.data.user.id;
    executorId = executor.data.user.id;

    await admin.from("profiles").upsert([
      {
        id: creatorId,
        email: creatorEmail,
        handle: `ui-creator-${runId}`,
        display_name: "UI Creator",
        locale: "en",
        push_notifications_enabled: true,
        deadline_reminders_enabled: true,
        quiet_hours_enabled: false,
      },
      {
        id: executorId,
        email: executorEmail,
        handle: `ui-executor-${runId}`,
        display_name: "UI Executor",
        locale: "en",
        push_notifications_enabled: true,
        deadline_reminders_enabled: true,
        quiet_hours_enabled: false,
      },
    ]);

    const creatorSession = await anonClient.auth.signInWithPassword({
      email: creatorEmail,
      password,
    });
    const executorSession = await anonClient.auth.signInWithPassword({
      email: executorEmail,
      password,
    });

    creatorToken = creatorSession.data.session?.access_token ?? "";
    executorToken = executorSession.data.session?.access_token ?? "";

    const createRes = await fetch(`${baseUrl}/api/promises/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${creatorToken}`,
      },
      body: JSON.stringify({
        title: `UI promise ${runId}`,
        details: "UI notifications",
        conditionText: null,
        counterpartyContact: executorEmail,
        dueAt: null,
        executor: "other",
        visibility: "private",
      }),
    });

    if (!createRes.ok) {
      throw new Error(`Failed to create promise: ${createRes.status}`);
    }

    const createdPromise = (await createRes.json()) as { id: string };
    promiseId = createdPromise.id;

    const { data: promiseRow } = await admin
      .from("promises")
      .select("invite_token")
      .eq("id", promiseId)
      .maybeSingle();

    if (!promiseRow?.invite_token) {
      throw new Error("Missing invite token for UI promise");
    }

    await fetch(`${baseUrl}/api/invite/${promiseRow.invite_token}/accept`, {
      method: "POST",
      headers: { Authorization: `Bearer ${executorToken}` },
    });

    await fetch(`${baseUrl}/api/promises/${promiseId}/complete`, {
      method: "POST",
      headers: { Authorization: `Bearer ${executorToken}` },
    });

    const { data: completionRow } = await admin
      .from("notifications")
      .select("id")
      .eq("promise_id", promiseId)
      .eq("user_id", creatorId)
      .eq("type", "completion_waiting")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!completionRow?.id) {
      throw new Error("Missing completion_waiting notification for UI test");
    }

    completionNotificationId = completionRow.id;

    await admin.from("notifications").insert({
      user_id: creatorId,
      promise_id: promiseId,
      type: "invite_followup",
      title: "",
      body: "",
      cta_label: null,
      cta_url: `/promises/${promiseId}`,
      priority: "normal",
      dedupe_key: `invite_followup:${promiseId}:creator:ui-${runId}`,
      created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    });
  });

  test.afterAll(async () => {
    if (promiseId) {
      await admin.from("notifications").delete().eq("promise_id", promiseId);
      await admin.from("promise_notification_state").delete().eq("promise_id", promiseId);
      await admin.from("promises").delete().eq("id", promiseId);
    }

    if (creatorId) {
      await admin.from("profiles").delete().in("id", [creatorId, executorId]);
      await admin.auth.admin.deleteUser(creatorId);
      await admin.auth.admin.deleteUser(executorId);
    }
  });

  test("shows unread count, list order, CTA navigation, and read updates", async ({ page }: { page: any }) => {
    const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
    const storageKey = `sb-${projectRef}-auth-token`;
    const session = await anonClient.auth.signInWithPassword({
      email: creatorEmail,
      password,
    });

    const sessionData = session.data.session;
    if (!sessionData) {
      throw new Error("Missing session for UI test user");
    }

    await page.addInitScript(
      ({ key, value }: { key: string; value: string }) => {
        localStorage.setItem(key, value);
      },
      { key: storageKey, value: JSON.stringify(sessionData) }
    );

    await page.goto(baseUrl);

    const badge = page.locator('a[href="/notifications"] span').filter({ hasText: /\d+/ });
    await expect(badge).toHaveText("2");

    await page.goto(`${baseUrl}/notifications`);

    const cards = page.locator("main .space-y-3 > div");
    await expect(cards.first().locator("a")).toHaveAttribute(
      "href",
      `/promises/${promiseId}/confirm`
    );
    await expect(cards.nth(1).locator("a")).toHaveAttribute("href", `/promises/${promiseId}`);

    await expect(page.getByText("Mark as read").first()).toBeVisible();

    await cards.first().locator("a").click();
    await expect(page).toHaveURL(new RegExp(`/promises/${promiseId}/confirm`));

    await page.goto(`${baseUrl}/notifications`);

    await expect(badge).toHaveText("1");

    const { data: updated } = await admin
      .from("notifications")
      .select("id,read_at")
      .eq("id", completionNotificationId)
      .maybeSingle<NotificationRow>();

    expect(updated?.read_at).not.toBeNull();
  });
});
