"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type InviteInfo = {
  id: string;
  title: string;
  due_at: string | null;
  creator_handle: string | null;
  creator_display_name: string | null;
  counterparty_id: string | null;
};

function formatDue(dueAt: string | null) {
  if (!dueAt) return "No deadline";
  const d = new Date(dueAt);
  return `Due: ${d.toLocaleString()}`;
}

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;

  const router = useRouter();

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean>(false);

  async function load() {
    if (!token) return;

    setError(null);

    // просто перевіряємо чи є сесія (для UI)
    const { data: s } = await supabase.auth.getSession();
    setSignedIn(Boolean(s.session));

    // Дістаємо дані інвайту через API (server-side safe)
    const res = await fetch(`/api/invite/${token}`, { cache: "no-store" });
    const j = await res.json();

    if (!res.ok) {
      setError(j?.error ?? "Invite not found or expired.");
      setInfo(null);
      return;
    }

    setInfo(j as InviteInfo);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function accept() {
    if (!token) return;

    setBusy(true);
    setError(null);

    const { data: s } = await supabase.auth.getSession();
    if (!s.session) {
      // відправляємо на логін і повертаємо назад сюди
      router.push(`/login?next=${encodeURIComponent(`/p/invite/${token}`)}`);
      setBusy(false);
      return;
    }

    const accessToken = s.session.access_token;

    const res = await fetch(`/api/invite/${token}/accept`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const j = await res.json();
    setBusy(false);

    if (!res.ok) {
      setError(j?.error ?? "Accept failed.");
      return;
    }

    // успіх: перезавантажимо дані і перекинемо на promises
    await load();
    router.push("/promises");
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-neutral-400 hover:text-white">
          ← Home
        </Link>
        <div className="text-sm text-neutral-400">{signedIn ? "Signed in" : "Not signed in"}</div>
      </div>

      <div className="space-y-2">
        <div className="text-3xl font-semibold">Dreddi invite</div>
        {error && <div className="text-red-400">{error}</div>}
      </div>

      {!info ? (
        !error && <div className="text-neutral-400">Loading invite…</div>
      ) : (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 space-y-4">
          <div className="text-xl font-semibold">{info.title}</div>
          <div className="text-sm text-neutral-400">{formatDue(info.due_at)}</div>

          <div className="text-sm text-neutral-400">
            Created by{" "}
            <span className="text-neutral-200">
              {info.creator_handle ? `@${info.creator_handle}` : info.creator_display_name ?? "Unknown"}
            </span>
          </div>

          {info.counterparty_id ? (
            <div className="text-emerald-300 text-sm">Already accepted ✅</div>
          ) : (
            <button
              disabled={busy}
              onClick={accept}
              className="rounded-xl bg-white text-neutral-950 font-medium px-4 py-2 disabled:opacity-60"
            >
              Accept promise
            </button>
          )}
        </div>
      )}
    </div>
  );
}
