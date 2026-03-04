import { createClient } from "@supabase/supabase-js";

const baseUrl = process.env.DREDDI_BASE_URL || "http://localhost:3000";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const email = process.env.TEST_USER_EMAIL || "";
const password = process.env.TEST_USER_PASSWORD || "";

if (!supabaseUrl || !anonKey || !email || !password) {
  console.error(
    "Missing env. Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, TEST_USER_EMAIL, TEST_USER_PASSWORD"
  );
  process.exit(1);
}

const client = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data, error } = await client.auth.signInWithPassword({ email, password });

if (error || !data.session?.access_token) {
  throw new Error(`signIn failed: ${error?.message}`);
}

const response = await fetch(`${baseUrl}/api/notifications/email/test`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${data.session.access_token}`,
  },
});

const body = await response.json().catch(() => ({}));
if (!response.ok) {
  throw new Error(`email test failed: ${response.status} ${JSON.stringify(body)}`);
}

console.log("Email test response:", JSON.stringify(body, null, 2));
