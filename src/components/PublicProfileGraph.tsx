"use client";

import { useMemo, useState, useRef, useEffect, useCallback } from "react";

// ── Public API types ───────────────────────────────────────────────────────────
export type PublicParty = {
  id: string;
  name: string | null;
  isPublic: boolean;
};

export type PublicDeal = {
  id: string;
  from: string;
  to: string;
  /** "disputed" is supported — map from PromiseUiStatus before passing in */
  status: "active" | "fulfilled" | "disputed" | null;
  label: string | null;
  isPublic: boolean;
};

type Props = {
  userId: string;
  userName: string;
  parties: PublicParty[];
  deals: PublicDeal[];
};

// ── Internal ──────────────────────────────────────────────────────────────────
type PositionedParty = PublicParty & { x: number; y: number; ux: number; uy: number };

type Relationship = {
  party: PositionedParty;
  total: number;
  fulfilled: number;
  disputed: number;
  active: number;
  publicCount: number;
  recentLabel: string | null;
};

// ── Design tokens ─────────────────────────────────────────────────────────────
const TEAL     = "#00d4aa";
const TEAL_RGB = "0,212,170";
const AMBER    = "#f59e0b";
const BG       = "#0c1118";
const SVG_W    = 640;

// ── Pure helpers ──────────────────────────────────────────────────────────────
function initials(name: string) {
  return name.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
}
function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

/** Edge stroke color: teal → amber based on dispute ratio */
function relColor(rel: Relationship): string {
  if (rel.total === 0) return "#475569";
  const r = rel.disputed / rel.total;
  if (r >= 0.5) return AMBER;
  if (r > 0.2) {
    const t = (r - 0.2) / 0.3;
    return `rgb(${Math.round(0 + 245 * t)},${Math.round(212 - 54 * t)},${Math.round(170 - 159 * t)})`;
  }
  return TEAL;
}

/** Edge stroke width: 1.5 px base + 0.5 px per extra deal, capped at 4.5 */
function relWidth(total: number) {
  return Math.min(1.5 + (total - 1) * 0.5, 4.5);
}

/** Edge dash: fully private → dashed, mostly private → long-dash, public → solid */
function relDash(rel: Relationship): string | undefined {
  if (rel.publicCount === 0) return "7 5";
  if (rel.publicCount < rel.total / 2) return "12 5";
  return undefined;
}

/** Base opacity before hover */
function relOpacity(rel: Relationship) {
  if (rel.publicCount === 0) return 0.28;
  if (rel.active > 0) return 0.62;
  return 0.48;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function PublicProfileGraph({ userId, userName, parties, deals }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(SVG_W);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Responsive container width
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width ?? el.clientWidth;
      if (w > 0) setContainerW(w);
    });
    ro.observe(el);
    setContainerW(el.clientWidth || SVG_W);
    return () => ro.disconnect();
  }, []);

  const compact = containerW < 480;
  const H       = compact ? 252 : 328;
  const cx      = SVG_W / 2;
  const cy      = H / 2;
  const R       = compact ? 82 : 112;
  const USER_R  = compact ? 22 : 27;
  const PARTY_R = compact ? 15 : 19;

  // Aggregate deals → one relationship per party
  const rels = useMemo<Relationship[]>(() => {
    type Acc = { total: number; fulfilled: number; disputed: number; active: number; publicCount: number; labels: string[] };
    const map = new Map<string, Acc>();

    for (const d of deals) {
      const pid = (d.from === userId || d.from === "me") ? d.to : d.from;
      if (!pid) continue;
      if (!map.has(pid)) map.set(pid, { total: 0, fulfilled: 0, disputed: 0, active: 0, publicCount: 0, labels: [] });
      const a = map.get(pid)!;
      a.total++;
      if (d.status === "fulfilled") a.fulfilled++;
      else if (d.status === "disputed") a.disputed++;
      else if (d.status === "active")  a.active++;
      if (d.isPublic) a.publicCount++;
      if (d.label)    a.labels.push(d.label);
    }

    // Sort by deal count desc, cap at 14 nodes
    return [...parties]
      .filter(p => (map.get(p.id)?.total ?? 0) > 0)
      .sort((a, b) => (map.get(b.id)?.total ?? 0) - (map.get(a.id)?.total ?? 0))
      .slice(0, 14)
      .map((party, i, arr) => {
        const angle = (i / Math.max(arr.length, 1)) * 2 * Math.PI - Math.PI / 2;
        const ux = Math.cos(angle), uy = Math.sin(angle);
        const a = map.get(party.id)!;
        return {
          party: { ...party, x: cx + R * ux, y: cy + R * uy, ux, uy },
          total:       a.total,
          fulfilled:   a.fulfilled,
          disputed:    a.disputed,
          active:      a.active,
          publicCount: a.publicCount,
          recentLabel: a.labels[0] ?? null,
        };
      });
  }, [parties, deals, userId, cx, cy, R]);

  const hovered = rels.find(r => r.party.id === hoveredId) ?? null;

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  return (
    <div
      ref={wrapRef}
      className="relative w-full select-none overflow-hidden rounded-2xl"
      style={{ background: BG }}
      onMouseMove={onMouseMove}
      onMouseLeave={() => setHoveredId(null)}
    >
      <svg
        viewBox={`0 0 ${SVG_W} ${H}`}
        className="w-full"
        style={{ display: "block" }}
        role="img"
        aria-label="Agreement network"
      >
        <defs>
          <radialGradient id="ppg-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor={`rgba(${TEAL_RGB},0.07)`} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        {/* Ambient center glow */}
        <ellipse cx={cx} cy={cy} rx={R * 0.72} ry={R * 0.58} fill="url(#ppg-bg)" />

        {/* ── Edges ── */}
        {rels.map(rel => {
          const { party, total, active } = rel;
          const isHov  = hoveredId === party.id;
          const color  = relColor(rel);
          const width  = relWidth(total);
          const dash   = relDash(rel);
          const opBase = relOpacity(rel);
          const mx = (cx + party.x) / 2;
          const my = (cy + party.y) / 2;

          return (
            <g key={`e-${party.id}`}>
              {/* Soft glow layer — active or hovered */}
              {(active > 0 || isHov) && (
                <line
                  x1={cx} y1={cy} x2={party.x} y2={party.y}
                  stroke={color}
                  strokeOpacity={isHov ? 0.22 : 0.1}
                  strokeWidth={width * 5}
                  strokeLinecap="round"
                  style={{ filter: "blur(5px)", pointerEvents: "none" }}
                />
              )}

              {/* Invisible hit area */}
              <line
                x1={cx} y1={cy} x2={party.x} y2={party.y}
                stroke="transparent" strokeWidth={24}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHoveredId(party.id)}
              />

              {/* Visible edge */}
              <line
                x1={cx} y1={cy} x2={party.x} y2={party.y}
                stroke={color}
                strokeOpacity={isHov ? Math.min(opBase + 0.35, 0.95) : opBase}
                strokeWidth={isHov ? width * 1.4 : width}
                strokeLinecap="round"
                strokeDasharray={dash}
                style={{ pointerEvents: "none", transition: "stroke-opacity .18s, stroke-width .18s" }}
              />

              {/* Deal-count badge — only when > 1 */}
              {total > 1 && (
                <g style={{ pointerEvents: "none" }}>
                  <circle cx={mx} cy={my} r={9}
                    fill={BG}
                    stroke={color}
                    strokeOpacity={isHov ? 0.65 : 0.28}
                    strokeWidth={1}
                  />
                  <text
                    x={mx} y={my}
                    textAnchor="middle" dominantBaseline="central"
                    fill={color} fillOpacity={isHov ? 0.9 : 0.48}
                    fontSize={8} fontWeight={700}
                    fontFamily="ui-sans-serif, system-ui, sans-serif"
                  >
                    {total}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* ── Party nodes ── */}
        {rels.map(rel => {
          const { party } = rel;
          const isHov    = hoveredId === party.id;
          const isPriv   = !party.isPublic;
          const color    = relColor(rel);
          const anchor   = Math.abs(party.ux) < 0.28 ? "middle" : party.ux > 0 ? "start" : "end";
          const lR       = R + PARTY_R + (compact ? 7 : 11);
          const lx       = cx + lR * party.ux;
          const ly       = cy + lR * party.uy;
          const showLbl  = !compact || isHov;

          return (
            <g
              key={`n-${party.id}`}
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHoveredId(party.id)}
            >
              {isHov && (
                <circle cx={party.x} cy={party.y} r={PARTY_R + 9}
                  fill={`rgba(${TEAL_RGB},0.07)`}
                  stroke={`rgba(${TEAL_RGB},0.22)`}
                  strokeWidth={1}
                  style={{ pointerEvents: "none" }}
                />
              )}

              <circle
                cx={party.x} cy={party.y} r={PARTY_R}
                fill={isPriv ? "rgba(255,255,255,0.02)" : isHov ? `rgba(${TEAL_RGB},0.13)` : "rgba(255,255,255,0.05)"}
                stroke={isPriv ? "rgba(255,255,255,0.12)" : color}
                strokeOpacity={isPriv ? 0.2 : isHov ? 0.75 : 0.38}
                strokeWidth={isHov ? 1.5 : 1}
                style={{ pointerEvents: "none", transition: "stroke-opacity .18s" }}
              />

              <text
                x={party.x} y={party.y}
                textAnchor="middle" dominantBaseline="central"
                fill={isPriv ? "rgba(255,255,255,0.18)" : isHov ? color : "rgba(255,255,255,0.6)"}
                fontSize={compact ? 9 : 10} fontWeight={600}
                fontFamily="ui-sans-serif, system-ui, sans-serif"
                style={{ pointerEvents: "none", transition: "fill .18s" }}
              >
                {party.isPublic && party.name ? initials(party.name) : "?"}
              </text>

              {showLbl && (
                <text
                  x={lx} y={ly}
                  textAnchor={anchor} dominantBaseline="central"
                  fill={isPriv ? "rgba(255,255,255,0.18)" : isHov ? "rgba(255,255,255,0.82)" : "rgba(255,255,255,0.4)"}
                  fontSize={compact ? 9 : 10}
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                  style={{ pointerEvents: "none", transition: "fill .18s" }}
                >
                  {party.isPublic && party.name ? truncate(party.name, compact ? 10 : 16) : "Приватний"}
                </text>
              )}
            </g>
          );
        })}

        {/* ── Centre user node ── */}
        <circle cx={cx} cy={cy} r={USER_R + 11} fill={`rgba(${TEAL_RGB},0.06)`} />
        <circle cx={cx} cy={cy} r={USER_R}
          fill={`rgba(${TEAL_RGB},0.14)`} stroke={TEAL} strokeWidth={1.5}
        />
        <text
          x={cx} y={cy}
          textAnchor="middle" dominantBaseline="central"
          fill={TEAL} fontSize={compact ? 11 : 13} fontWeight={700}
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          style={{ pointerEvents: "none" }}
        >
          {initials(userName)}
        </text>
        {!compact && (
          <text
            x={cx} y={cy + USER_R + 15}
            textAnchor="middle"
            fill="rgba(255,255,255,0.42)" fontSize={10}
            fontFamily="ui-sans-serif, system-ui, sans-serif"
            style={{ pointerEvents: "none" }}
          >
            {truncate(userName, 20)}
          </text>
        )}

        {rels.length === 0 && (
          <text
            x={cx} y={cy + USER_R + 38}
            textAnchor="middle"
            fill="rgba(255,255,255,0.18)" fontSize={11}
            fontFamily="ui-sans-serif, system-ui, sans-serif"
          >
            Угод ще немає
          </text>
        )}
      </svg>

      {/* ── Hover tooltip ── */}
      {hovered && (
        <RelTooltip rel={hovered} mouse={mouse} containerW={containerW} />
      )}

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-white/[0.06] px-5 py-2.5">
        <LegendItem color={TEAL}  label="Публічні угоди" />
        <LegendItem color={TEAL}  label="Приватні" dash />
        <LegendItem color={AMBER} label="Є суперечки" />
      </div>
    </div>
  );
}

// ── Relationship tooltip ───────────────────────────────────────────────────────
function RelTooltip({
  rel,
  mouse,
  containerW,
}: {
  rel: Relationship;
  mouse: { x: number; y: number };
  containerW: number;
}) {
  const W_TIP = 200;
  const OX = 14, OY = -28;
  let left = mouse.x + OX;
  let top  = mouse.y + OY;
  if (left + W_TIP > containerW - 4) left = mouse.x - W_TIP - OX;
  if (top < 4) top = mouse.y + 10;

  const priv = rel.total - rel.publicCount;
  const { party, total, fulfilled, active, disputed, publicCount, recentLabel } = rel;

  return (
    <div
      className="pointer-events-none absolute z-10 rounded-xl border border-white/10 bg-[#0c1118]/95 p-3 shadow-xl backdrop-blur-sm"
      style={{ left, top, width: W_TIP }}
    >
      <p className="mb-2 truncate text-[11px] font-semibold text-white/88">
        {party.isPublic && party.name ? party.name : "Приватна сторона"}
      </p>
      <div className="space-y-1 text-[10px] text-white/48">
        <Row label="Угод" value={total} valueClass="text-white/72 font-medium" />
        {fulfilled > 0 && <Row label="Виконано" value={fulfilled} valueClass="text-emerald-300/80 font-medium" />}
        {active    > 0 && <Row label="Активні"  value={active}    valueClass="font-medium" valueStyle={{ color: "#00d4aa" }} />}
        {disputed  > 0 && <Row label="Суперечки" value={disputed} valueClass="font-medium" valueStyle={{ color: "#f59e0b" }} />}
        {total > 0 && (
          <Row
            label="Публічні / Приватні"
            value={`${publicCount} / ${priv}`}
            valueClass="text-white/55"
          />
        )}
        {recentLabel && (
          <p className="mt-2 truncate border-t border-white/[0.08] pt-2 italic text-white/30">
            &ldquo;{truncate(recentLabel, 26)}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  valueClass,
  valueStyle,
}: {
  label: string;
  value: string | number;
  valueClass?: string;
  valueStyle?: React.CSSProperties;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span>{label}</span>
      <span className={valueClass} style={valueStyle}>{value}</span>
    </div>
  );
}

// ── Legend item ───────────────────────────────────────────────────────────────
function LegendItem({ color, label, dash = false }: { color: string; label: string; dash?: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-[10px] text-white/30">
      <svg width={18} height={2} style={{ overflow: "visible", flexShrink: 0 }}>
        <line
          x1={0} y1={1} x2={18} y2={1}
          stroke={color} strokeWidth={1.5} strokeOpacity={0.6}
          strokeDasharray={dash ? "5 3" : undefined}
        />
      </svg>
      {label}
    </span>
  );
}
