"use client";

import { useState } from "react";
import { useAdminRpc } from "../useAdminRpc";

type FeedbackRow = {
  id: string;
  created_at: string;
  category: string;
  message: string;
  page_url: string;
  locale: string;
  allow_contact: boolean;
  user_email: string | null;
  user_handle_or_name: string | null;
};

export default function AdminFeedbackPage() {
  const { data, loading, error } = useAdminRpc<FeedbackRow[]>("admin_list_feedback", {
    p_limit: 100,
    p_offset: 0,
  });

  const [activeMessage, setActiveMessage] = useState<string | null>(null);

  return (
    <>
      <h1 className="text-2xl font-semibold text-white">Feedback</h1>

      {loading ? <p className="mt-4 text-slate-200">Loading...</p> : null}
      {error ? <p className="mt-4 text-rose-400">{error}</p> : null}

      {data ? (
        data.length === 0 ? (
          <p className="mt-4 text-slate-400">No feedback yet.</p>
        ) : (
          <div className="mt-6 space-y-3">
            {data.map((row) => (
              <div key={row.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span>{new Date(row.created_at).toLocaleString()}</span>
                    <span>{row.locale}</span>
                    <span className="truncate">{row.page_url}</span>
                  </div>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-slate-200">
                    {row.category}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveMessage(row.message)}
                  className="mt-2 block w-full cursor-pointer truncate text-left text-sm text-slate-100 hover:text-white hover:underline"
                >
                  {row.message}
                </button>
                <div className="mt-2 text-xs text-slate-400">
                  {row.user_handle_or_name ?? "Anonymous"}
                  {row.user_email ? ` · ${row.user_email}` : ""}
                  {row.allow_contact ? " · OK to contact" : ""}
                </div>
              </div>
            ))}
          </div>
        )
      ) : null}

      {activeMessage ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setActiveMessage(null)}
        >
          <div
            className="max-w-lg rounded-xl border border-white/10 bg-slate-900 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-white">Feedback message</h3>
            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-200">{activeMessage}</p>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveMessage(null)}
                className="cursor-pointer rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/20"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
