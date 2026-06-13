"use client";

import { useEffect, useState } from "react";
import { supabaseOptional as supabase } from "@/lib/supabaseClient";

type AdminUser = {
  id: string;
  email: string | null;
  display_name: string | null;
  handle: string | null;
  created_at: string;
};

export default function AdminAdminsPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const loadAdmins = async () => {
    if (!supabase) return;
    setLoading(true);
    setError(null);

    const { data: userData } = await supabase.auth.getUser();
    setCurrentUserId(userData.user?.id ?? null);

    const { data, error: rpcError } = await supabase.rpc("admin_list_admins");
    if (rpcError) {
      setError(rpcError.message);
    } else {
      setAdmins((data ?? []) as AdminUser[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadAdmins();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !email.trim()) return;
    setSubmitting(true);
    setError(null);

    const { error: rpcError } = await supabase.rpc("admin_add_admin", {
      p_email: email.trim(),
    });

    if (rpcError) {
      setError(rpcError.message);
    } else {
      setEmail("");
      await loadAdmins();
    }
    setSubmitting(false);
  };

  const handleRemove = async (id: string, email: string | null) => {
    if (!supabase) return;
    if (!window.confirm(`Remove admin access for ${email ?? "this user"}?`)) return;
    setSubmitting(true);
    setError(null);

    const { error: rpcError } = await supabase.rpc("admin_remove_admin", {
      p_user_id: id,
    });

    if (rpcError) {
      setError(rpcError.message);
    } else {
      await loadAdmins();
    }
    setSubmitting(false);
  };

  return (
    <>
      <h1 className="text-2xl font-semibold text-white">Admins</h1>

      <form onSubmit={handleAdd} className="mt-6 flex gap-2">
        <input
          type="email"
          required
          placeholder="user@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
        />
        <button
          type="submit"
          disabled={submitting}
          className="cursor-pointer rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add admin
        </button>
      </form>

      {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}

      <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-slate-400">
            <tr>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Added</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {loading ? (
              <tr>
                <td className="px-4 py-3 text-slate-400" colSpan={4}>
                  Loading...
                </td>
              </tr>
            ) : admins.length === 0 ? (
              <tr>
                <td className="px-4 py-3 text-slate-400" colSpan={4}>
                  No admins yet.
                </td>
              </tr>
            ) : (
              admins.map((admin) => (
                <tr key={admin.id} className="text-slate-200">
                  <td className="px-4 py-2">{admin.email}</td>
                  <td className="px-4 py-2">{admin.display_name ?? admin.handle ?? "—"}</td>
                  <td className="px-4 py-2 text-slate-400">
                    {new Date(admin.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {admin.id !== currentUserId ? (
                      <button
                        type="button"
                        onClick={() => handleRemove(admin.id, admin.email)}
                        disabled={submitting}
                        className="cursor-pointer text-xs font-medium text-rose-400 transition hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Remove
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500">You</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
