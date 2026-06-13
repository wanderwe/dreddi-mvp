"use client";

import { useEffect, useState } from "react";
import { useAdminRpc } from "../useAdminRpc";

type UserRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  handle: string | null;
  created_at: string;
  reputation_score: number;
  agreements_count: number;
};

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const { data, loading, error } = useAdminRpc<UserRow[]>("admin_list_users", {
    p_limit: 100,
    p_offset: 0,
    p_search: debouncedSearch || null,
  });

  return (
    <>
      <h1 className="text-2xl font-semibold text-white">Users</h1>

      <input
        type="text"
        placeholder="Search by email, name, or handle"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mt-4 w-full max-w-sm rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
      />

      {loading ? <p className="mt-4 text-slate-200">Loading...</p> : null}
      {error ? <p className="mt-4 text-rose-400">{error}</p> : null}

      {data ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-slate-400">
              <tr>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Handle</th>
                <th className="px-4 py-2 font-medium">Joined</th>
                <th className="px-4 py-2 font-medium">Reputation</th>
                <th className="px-4 py-2 font-medium">Agreements</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {data.length === 0 ? (
                <tr>
                  <td className="px-4 py-3 text-slate-400" colSpan={6}>
                    No users found.
                  </td>
                </tr>
              ) : (
                data.map((user) => (
                  <tr key={user.id} className="text-slate-200">
                    <td className="px-4 py-2">{user.email}</td>
                    <td className="px-4 py-2">{user.display_name ?? "—"}</td>
                    <td className="px-4 py-2 text-slate-400">{user.handle ?? "—"}</td>
                    <td className="px-4 py-2 text-slate-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2">{user.reputation_score}</td>
                    <td className="px-4 py-2">{user.agreements_count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}
