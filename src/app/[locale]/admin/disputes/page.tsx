"use client";

import { useState } from "react";
import { useAdminRpc } from "../useAdminRpc";

type DisputeRow = {
  id: string;
  title: string;
  disputed_at: string | null;
  disputed_code: string | null;
  dispute_reason: string | null;
  due_at: string | null;
  creator_email: string | null;
  creator_handle: string | null;
  counterparty_email: string | null;
  counterparty_handle: string | null;
};

export default function AdminDisputesPage() {
  const { data, loading, error } = useAdminRpc<DisputeRow[]>("admin_list_disputes", {
    p_limit: 100,
    p_offset: 0,
  });

  const [activeReason, setActiveReason] = useState<string | null>(null);

  return (
    <>
      <h1 className="text-2xl font-semibold text-white">Disputes</h1>

      {loading ? <p className="mt-4 text-slate-200">Loading...</p> : null}
      {error ? <p className="mt-4 text-rose-400">{error}</p> : null}

      {data ? (
        data.length === 0 ? (
          <p className="mt-4 text-slate-400">No disputed agreements.</p>
        ) : (
          <div className="mt-6 space-y-3">
            {data.map((row) => (
              <div key={row.id} className="flex flex-col rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-white">{row.title}</h2>
                  <div className="flex items-center gap-2">
                    {row.dispute_reason ? (
                      <button
                        type="button"
                        onClick={() => setActiveReason(row.dispute_reason)}
                        title="Show dispute message"
                        className="cursor-pointer rounded-full bg-white/10 p-1 text-slate-300 transition hover:bg-white/20 hover:text-white"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                          <path
                            fillRule="evenodd"
                            d="M2 4.75A2.75 2.75 0 0 1 4.75 2h10.5A2.75 2.75 0 0 1 18 4.75v7.5A2.75 2.75 0 0 1 15.25 15H9.06l-3.4 2.55A.75.75 0 0 1 4.5 16.95V15h-.25A2.75 2.75 0 0 1 2 12.25v-7.5Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    ) : null}
                    {row.disputed_code ? (
                      <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-xs font-medium text-rose-300">
                        {row.disputed_code}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="mt-2 text-xs text-slate-400">
                  Disputed: {row.disputed_at ? new Date(row.disputed_at).toLocaleString() : "—"}
                  {row.due_at ? ` · Due: ${new Date(row.due_at).toLocaleString()}` : ""}
                </div>
                <div className="mt-auto pt-2 text-xs text-slate-400">
                  Creator: {row.creator_handle ?? row.creator_email ?? "—"}
                  {" · "}
                  Counterparty: {row.counterparty_handle ?? row.counterparty_email ?? "—"}
                </div>
              </div>
            ))}
          </div>
        )
      ) : null}

      {activeReason ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setActiveReason(null)}
        >
          <div
            className="max-w-lg rounded-xl border border-white/10 bg-slate-900 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-white">Dispute reason</h3>
            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-200">{activeReason}</p>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveReason(null)}
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
