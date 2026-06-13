export function StatCard({ label, value, small }: { label: string; value: number; small?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className={small ? "mt-1 text-xl font-semibold text-white" : "mt-1 text-3xl font-semibold text-white"}>
        {value}
      </p>
    </div>
  );
}
