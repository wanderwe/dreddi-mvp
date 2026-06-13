"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAdminRpc } from "./useAdminRpc";
import { StatCard } from "./components";

type DailyPoint = { day: string; count: number };

type DashboardStats = {
  total_users: number;
  total_agreements: number;
  total_feedback: number;
  agreements_by_status: Record<string, number>;
  new_users_daily: DailyPoint[];
  new_agreements_daily: DailyPoint[];
  promise_groups_count: number;
  promises_in_groups_count: number;
  invite_status_counts: Record<string, number>;
  email_send_status_counts_30d: Record<string, number>;
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  completed_by_promisor: "Completed by promisor",
  confirmed: "Fulfilled",
  disputed: "Disputed",
};

const STATUS_ORDER = [
  "active",
  "completed_by_promisor",
  "confirmed",
  "disputed",
] as const;

const INVITE_STATUS_LABELS: Record<string, string> = {
  awaiting_acceptance: "Awaiting acceptance",
  awaiting_creator_confirmation: "Pending counter-condition",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
  cancelled_by_creator: "Cancelled by creator",
};

const INVITE_STATUS_ORDER = [
  "awaiting_acceptance",
  "awaiting_creator_confirmation",
  "accepted",
  "declined",
  "expired",
  "cancelled_by_creator",
] as const;

export default function AdminDashboardPage() {
  const { data: stats, loading, error } = useAdminRpc<DashboardStats>("admin_dashboard_stats", {
    days_back: 30,
  });

  if (loading) return <p className="text-slate-200">Loading...</p>;

  if (error) {
    return (
      <>
        <h1 className="text-2xl font-semibold text-white">Admin dashboard</h1>
        <p className="mt-4 text-rose-400">{error}</p>
      </>
    );
  }

  if (!stats) return null;

  const usersSeries = fillSeries(stats.new_users_daily, 30);
  const agreementsSeries = fillSeries(stats.new_agreements_daily, 30);

  return (
    <>
      <h1 className="text-2xl font-semibold text-white">Admin dashboard</h1>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total users" value={stats.total_users} />
        <StatCard label="Total agreements" value={stats.total_agreements} />
        <StatCard label="Feedback messages" value={stats.total_feedback} />
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-medium text-white">New users (last 30 days)</h2>
        <div className="mt-4 h-64 rounded-xl border border-white/10 bg-white/5 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={usersSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" />
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #ffffff1a" }} />
              <Line type="monotone" dataKey="count" stroke="#52c16a" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium text-white">New agreements (last 30 days)</h2>
        <div className="mt-4 h-64 rounded-xl border border-white/10 bg-white/5 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={agreementsSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" />
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #ffffff1a" }} />
              <Line type="monotone" dataKey="count" stroke="#497bff" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium text-white">Agreements by status</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {STATUS_ORDER.map((status) => (
            <StatCard
              key={status}
              label={STATUS_LABELS[status] ?? status}
              value={stats.agreements_by_status[status] ?? 0}
              small
            />
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium text-white">Invites by status</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {INVITE_STATUS_ORDER.map((status) => (
            <StatCard
              key={status}
              label={INVITE_STATUS_LABELS[status] ?? status}
              value={stats.invite_status_counts[status] ?? 0}
              small
            />
          ))}
        </div>
      </section>
    </>
  );
}

// Fills in missing days within the requested window so the chart has a continuous x-axis.
function fillSeries(points: DailyPoint[], days: number): DailyPoint[] {
  const byDay = new Map(points.map((p) => [p.day, p.count]));
  const result: DailyPoint[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({ day: key.slice(5), count: byDay.get(key) ?? 0 });
  }
  return result;
}
