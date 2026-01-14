const baseUrl = process.env.DREDDI_BASE_URL || "http://localhost:3000";
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const counterparty = process.env.DREDDI_COUNTERPARTY || "test@example.com";

if (!accessToken) {
  console.error("Missing SUPABASE_ACCESS_TOKEN in env.");
  process.exit(1);
}

const payload = {
  title: `Smoke promise ${new Date().toISOString()}`,
  details: "Smoke test deal created by script.",
  counterpartyContact: counterparty,
  dueAt: null,
  executor: "me",
  visibility: "private",
};

const res = await fetch(`${baseUrl}/api/promises/create`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  },
  body: JSON.stringify(payload),
});

const body = await res.json().catch(() => ({}));

if (!res.ok) {
  console.error("Create promise failed:", res.status, body);
  process.exit(1);
}

console.log("Promise created:", body);
