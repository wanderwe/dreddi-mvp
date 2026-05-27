"use client";

import { useMemo, useState } from "react";

// ── Public types ───────────────────────────────────────────────────────────────
export type PublicParty = {
  id: string;
  name: string | null;
  isPublic: boolean;
};

export type PublicDeal = {
  id: string;
  from: string;
  to: string;
  status: "active" | "fulfilled" | null;
  label: string | null;
  isPublic: boolean;
};

type Props = {
  userId: string;
  userName: string;
  parties: PublicParty[];
  deals: PublicDeal[];
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

const STATUS: Record<
  "active" | "fulfilled" | "none",
  { stroke: string; opacity: number; dash: boolean }
> = {
  active:    { stroke: "#00d4aa", opacity: 0.75, dash: false },
  fulfilled: { stroke: "#34d399", opacity: 0.65, dash: false },
  none:      { stroke: "#475569", opacity: 0.38, dash: true  },
};

function edgeStyle(status: "active" | "fulfilled" | null) {
  return STATUS[status ?? "none"];
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function PublicProfileGraph({
  userId,
  userName,
  parties,
  deals,
}: Props) {
  const [hoveredDeal, setHoveredDeal] = useState<string | null>(null);

  // SVG coordinate space
  const W = 640, H = 370;
  const cx = W / 2, cy = H / 2;
  const R = Math.min(W, H) * 0.34;
  const USER_R = 30;
  const PARTY_R = 22;

  // Place each party on a circle around the user
  const positioned = useMemo(
    () =>
      parties.map((party, i) => {
        const angle = (i / Math.max(parties.length, 1)) * 2 * Math.PI - Math.PI / 2;
        const ux = Math.cos(angle);
        const uy = Math.sin(angle);
        return { ...party, x: cx + R * ux, y: cy + R * uy, ux, uy };
      }),
    [parties, cx, cy, R]
  );

  // Group deals by their connected party
  const dealsByParty = useMemo(() => {
    const map = new Map<string, PublicDeal[]>();
    for (const deal of deals) {
      const partyId =
        deal.from === userId || deal.from === "me" ? deal.to : deal.from;
      if (!map.has(partyId)) map.set(partyId, []);
      map.get(partyId)!.push(deal);
    }
    return map;
  }, [deals, userId]);

  return (
    <div
      className="w-full overflow-hidden rounded-2xl"
      style={{ background: "#0c1118" }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ display: "block" }}
        aria-label="Agreement network"
        role="img"
      >
        {/* ── Edges (deals) ── */}
        {positioned.map((party) => {
          const partyDeals = dealsByParty.get(party.id) ?? [];
          const total = partyDeals.length;

          return partyDeals.map((deal, di) => {
            const style = edgeStyle(deal.status);
            const isHover = hoveredDeal === deal.id;

            // Offset parallel edges so they don't overlap
            const spread = (di - (total - 1) / 2) * 10;
            // Perpendicular direction to the edge
            const px = -party.uy;
            const py = party.ux;

            const x1 = cx + px * spread;
            const y1 = cy + py * spread;
            const x2 = party.x + px * spread;
            const y2 = party.y + py * spread;

            // Midpoint + perpendicular label offset
            const lx = (x1 + x2) / 2 + px * 10;
            const ly = (y1 + y2) / 2 + py * 10 - 2;

            return (
              <g
                key={deal.id}
                onMouseEnter={() => setHoveredDeal(deal.id)}
                onMouseLeave={() => setHoveredDeal(null)}
                style={{ cursor: "default" }}
              >
                {/* Fat invisible hit area */}
                <line
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="transparent"
                  strokeWidth={18}
                />
                {/* Visible line */}
                <line
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={style.stroke}
                  strokeOpacity={isHover ? 1 : style.opacity}
                  strokeWidth={isHover ? 2 : 1.5}
                  strokeDasharray={style.dash ? "5 4" : undefined}
                />
                {/* Deal label */}
                {deal.isPublic && deal.label && (
                  <text
                    x={lx}
                    y={ly}
                    textAnchor="middle"
                    fill={style.stroke}
                    fillOpacity={isHover ? 0.9 : 0.42}
                    fontSize={9}
                    fontFamily="ui-sans-serif, system-ui, sans-serif"
                  >
                    {truncate(deal.label, 24)}
                  </text>
                )}
              </g>
            );
          });
        })}

        {/* ── Party nodes ── */}
        {positioned.map((party) => {
          const partyDeals = dealsByParty.get(party.id) ?? [];
          const primaryStatus = partyDeals[0]?.status ?? null;
          const style = edgeStyle(primaryStatus);
          const isPrivate = !party.isPublic;

          // Label anchor and position — place outside the node ring
          const textAnchor =
            Math.abs(party.ux) < 0.25
              ? "middle"
              : party.ux > 0
              ? "start"
              : "end";
          const labelX = cx + (R + PARTY_R + 11) * party.ux;
          const labelY = cy + (R + PARTY_R + 11) * party.uy;

          return (
            <g key={party.id}>
              {/* Active glow ring */}
              {!isPrivate && primaryStatus === "active" && (
                <circle
                  cx={party.x}
                  cy={party.y}
                  r={PARTY_R + 8}
                  fill="rgba(0,212,170,0.06)"
                  stroke="rgba(0,212,170,0.15)"
                  strokeWidth={1}
                />
              )}

              {/* Node circle */}
              <circle
                cx={party.x}
                cy={party.y}
                r={PARTY_R}
                fill={
                  isPrivate
                    ? "rgba(255,255,255,0.02)"
                    : "rgba(255,255,255,0.05)"
                }
                stroke={isPrivate ? "rgba(255,255,255,0.1)" : style.stroke}
                strokeOpacity={isPrivate ? 0.2 : 0.45}
                strokeWidth={1}
              />

              {/* Initials */}
              <text
                x={party.x}
                y={party.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={
                  isPrivate
                    ? "rgba(255,255,255,0.15)"
                    : "rgba(255,255,255,0.65)"
                }
                fontSize={10}
                fontWeight={600}
                fontFamily="ui-sans-serif, system-ui, sans-serif"
              >
                {party.isPublic && party.name ? initials(party.name) : "?"}
              </text>

              {/* Name label outside circle */}
              <text
                x={labelX}
                y={labelY}
                textAnchor={textAnchor}
                dominantBaseline="central"
                fill={
                  isPrivate
                    ? "rgba(255,255,255,0.18)"
                    : "rgba(255,255,255,0.55)"
                }
                fontSize={10}
                fontFamily="ui-sans-serif, system-ui, sans-serif"
              >
                {party.isPublic && party.name
                  ? truncate(party.name, 16)
                  : "Приватний"}
              </text>
            </g>
          );
        })}

        {/* ── Centre user node ── */}
        <circle
          cx={cx} cy={cy} r={USER_R + 11}
          fill="rgba(0,212,170,0.05)"
        />
        <circle
          cx={cx} cy={cy} r={USER_R}
          fill="rgba(0,212,170,0.13)"
          stroke="#00d4aa"
          strokeWidth={1.5}
        />
        <text
          x={cx} y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#00d4aa"
          fontSize={13}
          fontWeight={700}
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          {initials(userName)}
        </text>
        <text
          x={cx}
          y={cy + USER_R + 15}
          textAnchor="middle"
          fill="rgba(255,255,255,0.55)"
          fontSize={10}
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          {truncate(userName, 20)}
        </text>

        {/* ── Empty state ── */}
        {parties.length === 0 && (
          <text
            x={cx}
            y={cy + USER_R + 36}
            textAnchor="middle"
            fill="rgba(255,255,255,0.18)"
            fontSize={12}
            fontFamily="ui-sans-serif, system-ui, sans-serif"
          >
            Угод ще немає
          </text>
        )}
      </svg>

      {/* ── Legend ── */}
      <div className="flex items-center gap-5 border-t border-white/[0.06] px-5 py-2.5">
        <LegendItem color="#00d4aa" label="Активна" />
        <LegendItem color="#34d399" label="Виконана" />
        <LegendItem color="#475569" label="Приватна" dash />
      </div>
    </div>
  );
}

// ── Legend item ───────────────────────────────────────────────────────────────
function LegendItem({
  color,
  label,
  dash = false,
}: {
  color: string;
  label: string;
  dash?: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5 text-[10px] text-white/30">
      <svg width={20} height={2} style={{ overflow: "visible" }}>
        <line
          x1={0} y1={1} x2={20} y2={1}
          stroke={color}
          strokeWidth={1.5}
          strokeOpacity={0.7}
          strokeDasharray={dash ? "4 3" : undefined}
        />
      </svg>
      {label}
    </span>
  );
}
