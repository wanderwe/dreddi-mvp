"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ── Public API types ───────────────────────────────────────────────────────────
export interface GraphParty {
  id: string;
  username: string;
  display_name: string | null;
  initials: string;
  isPublic: boolean;
  dealCount: number;
  fulfilled: number;
  disputed: number;
  publicDeals: number;
  privateDeals: number;
  recentActivity: boolean;
  /** Pre-computed radians (0 = right, -π/2 = top) */
  angle: number;
  /** Ignored — component computes distance responsively */
  baseDist?: number;
}

export interface GraphEdge {
  partyId: string;
  type: "collab" | "dispute";
  count: number;
  fulfilled: number;
  /** 0.0 – 1.0 fraction of public deals */
  pubRatio: number;
  recentActivity: boolean;
  /** Whose perspective: "me" = profile user filed it; "counterparty" = they filed it */
  disputedBy: "me" | "counterparty" | null;
}

type Props = {
  userName: string;
  parties: GraphParty[];
  edges: GraphEdge[];
  locale?: string;
};

// ── Internal types ─────────────────────────────────────────────────────────────
type Placed = GraphParty & { x: number; y: number; r: number };

type HoverInfo =
  | { kind: "node"; party: Placed }
  | { kind: "collab"; edge: GraphEdge; party: Placed }
  | { kind: "dispute"; edge: GraphEdge; party: Placed }
  | null;

// ── Design tokens ─────────────────────────────────────────────────────────────
const TEAL  = "0,212,170";
const AMBER = "240,180,41";
const GREY  = "107,114,128";
const BG    = "#111318";

// ── Pure helpers ──────────────────────────────────────────────────────────────
function trunc(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + "…" : s;
}
function mkInitials(name: string) {
  return name.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
}
function nodeR(dealCount: number) {
  return 9 + Math.min(dealCount, 5) * 1.4;
}
function distToSeg(
  px: number, py: number,
  x1: number, y1: number, x2: number, y2: number,
) {
  const dx = x2 - x1, dy = y2 - y1;
  const lsq = dx * dx + dy * dy;
  if (lsq === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lsq));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

// ── Canvas drawing ─────────────────────────────────────────────────────────────
function drawArrow(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
  color: string, alpha: number, width: number,
) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return;
  const ux = dx / len, uy = dy / len;
  const ex = x2 - ux * 9, ey = y2 - uy * 9;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(ex, ey);
  ctx.strokeStyle = `rgba(${color},${alpha})`;
  ctx.lineWidth = width;
  ctx.setLineDash([]);
  ctx.stroke();
  // Arrowhead
  const ax = ex - ux * 8 + uy * 4, ay = ey - uy * 8 - ux * 4;
  const bx = ex - ux * 8 - uy * 4, by = ey - uy * 8 + ux * 4;
  ctx.beginPath();
  ctx.moveTo(x2 - ux * 5, y2 - uy * 5);
  ctx.lineTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.closePath();
  ctx.fillStyle = `rgba(${color},${alpha})`;
  ctx.fill();
}

function drawCollabEdge(
  ctx: CanvasRenderingContext2D,
  sx: number, sy: number, ex: number, ey: number,
  edge: GraphEdge, isHov: boolean, tick: number,
) {
  const thick  = 0.8 + Math.min(edge.count, 5) * 0.55;
  const bright = 0.25 + (edge.fulfilled / Math.max(edge.count, 1)) * 0.45;
  const shimmer = edge.recentActivity
    ? Math.sin(tick * 0.06) * 0.12 + bright
    : bright;
  const alpha = isHov ? Math.min(shimmer + 0.3, 0.95) : shimmer;

  if (edge.pubRatio > 0) {
    if (edge.recentActivity || isHov) {
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey);
      ctx.strokeStyle = `rgba(${TEAL},${isHov ? 0.08 : 0.04})`;
      ctx.lineWidth = (thick + 0.8) * 4;
      ctx.setLineDash([]);
      ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey);
    ctx.strokeStyle = `rgba(${TEAL},${alpha * edge.pubRatio})`;
    ctx.lineWidth = isHov ? thick + 0.8 : thick;
    ctx.setLineDash([]);
    ctx.stroke();
  }

  if (edge.pubRatio < 1) {
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey);
    ctx.strokeStyle = `rgba(${GREY},${isHov ? 0.55 : 0.3})`;
    ctx.lineWidth = 0.8;
    ctx.setLineDash([3, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function PublicProfileGraph({ userName, parties, edges, locale = "uk" }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const wrapRef    = useRef<HTMLDivElement>(null);
  const rafRef     = useRef<number>(0);
  const tickRef    = useRef<number>(0);
  const placedRef  = useRef<Placed[]>([]);
  const jittersRef = useRef<number[]>([]);
  const hovRef     = useRef<HoverInfo>(null);

  const [tooltip,  setTooltip]  = useState<HoverInfo>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // ── Compute placed nodes (responsive, stable jitter) ─────────────────────
  const computePlaced = useCallback((cw: number, ch: number): Placed[] => {
    const cx = cw / 2, cy = ch / 2;
    const baseDist = Math.min(cw, ch) * 0.38;
    return parties.map((party, i) => {
      const jitter = jittersRef.current[i] ?? 0;
      const dist = Math.max(24, baseDist - Math.min(party.dealCount, 4) * 5 + jitter);
      return {
        ...party,
        x: cx + Math.cos(party.angle) * dist,
        y: cy + Math.sin(party.angle) * dist,
        r: nodeR(party.dealCount),
      };
    });
  }, [parties]);

  // ── Canvas setup + draw loop ───────────────────────────────────────────────
  useEffect(() => {
    // Stable jitter per party set
    if (jittersRef.current.length !== parties.length) {
      jittersRef.current = parties.map(() => (Math.random() - 0.5) * 18);
    }

    const canvas = canvasRef.current;
    const wrap   = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio ?? 1, 2);

    const resize = () => {
      const cw = wrap.clientWidth || 640;
      const ch = Math.round(cw * 0.52);
      canvas.style.width  = `${cw}px`;
      canvas.style.height = `${ch}px`;
      canvas.width  = cw * dpr;
      canvas.height = ch * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      placedRef.current = computePlaced(cw, ch);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    // Draw loop
    const draw = () => {
      tickRef.current++;
      const tick   = tickRef.current;
      const cw     = canvas.clientWidth  || 640;
      const ch     = canvas.clientHeight || 332;
      const cx     = cw / 2, cy = ch / 2;
      const placed = placedRef.current;
      const hov    = hovRef.current;
      const compact = cw < 480;

      ctx.clearRect(0, 0, cw, ch);

      // Ambient centre glow
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(cw, ch) * 0.36);
      bg.addColorStop(0, `rgba(${TEAL},0.06)`);
      bg.addColorStop(1, "transparent");
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.arc(cx, cy, Math.min(cw, ch) * 0.36, 0, Math.PI * 2); ctx.fill();

      // ── Edges ──────────────────────────────────────────────────────────────
      for (const edge of edges) {
        const party = placed.find(p => p.id === edge.partyId);
        if (!party) continue;

        const isHov = Boolean(
          (hov?.kind === "collab"   && hov.edge.partyId === edge.partyId && edge.type === "collab") ||
          (hov?.kind === "dispute"  && hov.edge.partyId === edge.partyId && edge.type === "dispute") ||
          (hov?.kind === "node"     && hov.party.id === edge.partyId)
        );

        if (edge.type === "collab") {
          drawCollabEdge(ctx, cx, cy, party.x, party.y, edge, isHov, tick);
        } else {
          // Dispute arrow offset 5px parallel
          const dx = party.x - cx, dy = party.y - cy;
          const len = Math.sqrt(dx * dx + dy * dy);
          const ux = dx / len, uy = dy / len;
          const ox = -uy * 5, oy =  ux * 5;
          let [sx, sy, ex, ey] = [cx + ox, cy + oy, party.x + ox, party.y + oy];
          if (edge.disputedBy === "counterparty") {
            [sx, sy, ex, ey] = [ex, ey, sx, sy];
          }
          drawArrow(ctx, sx, sy, ex, ey, AMBER, isHov ? 0.9 : 0.55, isHov ? 2 : 1.2);
        }
      }

      // ── Party nodes ────────────────────────────────────────────────────────
      for (const party of placed) {
        const isHov  = Boolean(hov && "party" in hov && hov.party.id === party.id);
        const isPriv = !party.isPublic;
        const fRatio = party.dealCount > 0 ? party.fulfilled / party.dealCount : 0;
        const pulse  = party.recentActivity ? Math.sin(tick * 0.05) * 0.08 + 0.94 : 1;
        const r      = party.r * pulse;

        // Glow (public only)
        if (!isPriv) {
          const ga = 0.05 + fRatio * 0.04 + (isHov ? 0.08 : 0);
          const gr = r + 6 + fRatio * 4;
          const g  = ctx.createRadialGradient(party.x, party.y, r * 0.5, party.x, party.y, gr);
          g.addColorStop(0, `rgba(${TEAL},${ga})`);
          g.addColorStop(1, "transparent");
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(party.x, party.y, gr, 0, Math.PI * 2); ctx.fill();
        }

        // Fill
        ctx.beginPath(); ctx.arc(party.x, party.y, r, 0, Math.PI * 2);
        ctx.fillStyle = isPriv
          ? "rgba(255,255,255,0.02)"
          : `rgba(${TEAL},${isHov ? 0.18 : 0.08 + fRatio * 0.08})`;
        ctx.fill();

        // Border
        if (isPriv) {
          ctx.setLineDash([3, 4]);
          ctx.strokeStyle = `rgba(${GREY},0.4)`;
          ctx.lineWidth = 1;
        } else {
          ctx.setLineDash([]);
          ctx.strokeStyle = `rgba(${TEAL},${isHov ? 0.8 : 0.35 + fRatio * 0.25})`;
          ctx.lineWidth = isHov ? 1.5 : 1;
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Initials / dash
        const lbl = isPriv ? "—" : party.initials;
        ctx.font = `600 ${Math.round(r * 0.6)}px ui-sans-serif,system-ui,sans-serif`;
        ctx.fillStyle = isPriv
          ? `rgba(${GREY},0.5)`
          : `rgba(${TEAL},${isHov ? 1 : 0.8})`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(lbl, party.x, party.y);

        // Name label (outside circle, non-private, non-compact)
        if (!isPriv && !compact) {
          const name = party.display_name
            ? trunc(party.display_name, 14)
            : party.username ? trunc(party.username, 14) : null;
          if (name) {
            const dx = party.x - cx, dy = party.y - cy;
            const len = Math.sqrt(dx * dx + dy * dy);
            const nx = len > 0 ? dx / len : 0, ny = len > 0 ? dy / len : 1;
            const lx = party.x + nx * (r + 11), ly = party.y + ny * (r + 11);
            ctx.font = "10px ui-sans-serif,system-ui,sans-serif";
            ctx.fillStyle = isHov ? "rgba(255,255,255,0.82)" : "rgba(255,255,255,0.38)";
            ctx.textAlign = nx > 0.25 ? "left" : nx < -0.25 ? "right" : "center";
            ctx.textBaseline = "middle";
            ctx.fillText(name, lx, ly);
          }
        }
      }

      // ── Center user node ────────────────────────────────────────────────────
      const userR = compact ? 20 : 26;
      const cg = ctx.createRadialGradient(cx, cy, userR * 0.4, cx, cy, userR + 14);
      cg.addColorStop(0, `rgba(${TEAL},0.08)`); cg.addColorStop(1, "transparent");
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.arc(cx, cy, userR + 14, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, userR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${TEAL},0.14)`; ctx.fill();
      ctx.strokeStyle = `rgba(${TEAL},1)`; ctx.lineWidth = 1.5; ctx.setLineDash([]); ctx.stroke();
      ctx.font = `700 ${compact ? 11 : 13}px ui-sans-serif,system-ui,sans-serif`;
      ctx.fillStyle = `rgba(${TEAL},1)`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(mkInitials(userName), cx, cy);
      if (!compact) {
        ctx.font = "10px ui-sans-serif,system-ui,sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.textBaseline = "top";
        ctx.fillText(trunc(userName, 20), cx, cy + userR + 7);
      }

      // Empty state
      if (placed.length === 0) {
        ctx.font = "11px ui-sans-serif,system-ui,sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("Угод ще немає", cx, cy + userR + 38);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, [parties, edges, computePlaced, userName]);

  // ── Mouse & click handlers ────────────────────────────────────────────────
  const toCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = canvasRef.current?.getBoundingClientRect();
    return r ? { x: e.clientX - r.left, y: e.clientY - r.top } : null;
  }, []);

  const findHover = useCallback((x: number, y: number): HoverInfo => {
    const placed = placedRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const cx = canvas.clientWidth / 2, cy = canvas.clientHeight / 2;

    for (const p of placed) {
      if ((x - p.x) ** 2 + (y - p.y) ** 2 <= (p.r + 6) ** 2) {
        return { kind: "node", party: p };
      }
    }
    for (const edge of edges) {
      const party = placed.find(p => p.id === edge.partyId);
      if (!party) continue;
      if (edge.type === "dispute") {
        const dx = party.x - cx, dy = party.y - cy;
        const len = Math.sqrt(dx * dx + dy * dy);
        const ox = -dy / len * 5, oy = dx / len * 5;
        if (distToSeg(x, y, cx + ox, cy + oy, party.x + ox, party.y + oy) < 10)
          return { kind: "dispute", edge, party };
      } else {
        if (distToSeg(x, y, cx, cy, party.x, party.y) < 12)
          return { kind: "collab", edge, party };
      }
    }
    return null;
  }, [edges]);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = toCanvasCoords(e);
    if (!coords) return;
    const rect = wrapRef.current?.getBoundingClientRect();
    if (rect) setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    const info = findHover(coords.x, coords.y);
    hovRef.current = info;
    setTooltip(info);
    if (canvasRef.current) {
      canvasRef.current.style.cursor =
        info?.kind === "node" && info.party.isPublic ? "pointer" : "default";
    }
  }, [toCanvasCoords, findHover]);

  const onMouseLeave = useCallback(() => {
    hovRef.current = null;
    setTooltip(null);
    if (canvasRef.current) canvasRef.current.style.cursor = "default";
  }, []);

  const onClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = toCanvasCoords(e);
    if (!coords) return;
    const info = findHover(coords.x, coords.y);
    if (info?.kind === "node" && info.party.isPublic && info.party.username) {
      window.open(`/${locale}/u/${info.party.username}`, "_blank");
    }
  }, [toCanvasCoords, findHover, locale]);

  return (
    <div
      ref={wrapRef}
      className="relative w-full select-none overflow-hidden rounded-2xl"
      style={{ background: BG }}
    >
      <canvas
        ref={canvasRef}
        className="block w-full"
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
      />

      {tooltip && (
        <HoverTooltip
          info={tooltip}
          mouse={mousePos}
          containerW={wrapRef.current?.clientWidth ?? 640}
          userName={userName}
        />
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-white/[0.06] px-5 py-2.5">
        <LegendItem kind="solid"  color={`rgba(${TEAL},0.7)`}   label="Публічні / виконані" />
        <LegendItem kind="dashed" color={`rgba(${GREY},0.5)`}   label="Приватні" />
        <LegendItem kind="arrow"  color={`rgba(${AMBER},0.75)`} label="Оскаржено (напрямок важливий)" />
        <LegendItem kind="node"                                  label="Розмір = кількість угод" />
      </div>
    </div>
  );
}

// ── Hover tooltip ─────────────────────────────────────────────────────────────
function HoverTooltip({
  info,
  mouse,
  containerW,
  userName,
}: {
  info: HoverInfo;
  mouse: { x: number; y: number };
  containerW: number;
  userName: string;
}) {
  if (!info) return null;
  const W = 212;
  let left = mouse.x + 14;
  let top  = mouse.y - 28;
  if (left + W > containerW - 4) left = mouse.x - W - 14;
  if (top < 4) top = mouse.y + 10;

  let content: React.ReactNode = null;

  if (info.kind === "node") {
    const p = info.party;
    const name   = p.display_name ?? p.username ?? "—";
    content = (
      <>
        <p className="mb-2 truncate text-[11px] font-semibold text-white/90">{name}</p>
        <div className="space-y-1 text-[10px] text-white/48">
          <p>{p.dealCount} угод разом</p>
          {p.fulfilled > 0 && <p className="text-emerald-300/80">✓ {p.fulfilled} виконано</p>}
          {p.disputed  > 0 && <p style={{ color: `rgba(${AMBER},1)` }}>⚡ {p.disputed} оскаржено</p>}
          {p.recentActivity && <p style={{ color: `rgba(0,212,170,1)` }}>● активна нещодавно</p>}
        </div>
      </>
    );
  } else if (info.kind === "collab") {
    const { edge, party } = info;
    const name   = party.display_name ?? party.username ?? "—";
    const donePct = edge.count > 0 ? Math.round((edge.fulfilled / edge.count) * 100) : 0;
    content = (
      <>
        <p className="mb-1.5 text-[10px] text-white/35">{trunc(userName, 11)} ↔ {trunc(name, 11)}</p>
        <div className="space-y-1 text-[10px] text-white/48">
          <p className="font-semibold text-white/80">{edge.count} угод</p>
          {edge.fulfilled > 0 && (
            <p className="text-emerald-300/80">✓ {edge.fulfilled} виконано ({donePct}%)</p>
          )}
          {edge.recentActivity && <p style={{ color: "rgba(0,212,170,1)" }}>● є активна угода</p>}
        </div>
      </>
    );
  } else if (info.kind === "dispute") {
    const { edge, party } = info;
    const name    = party.display_name ?? party.username ?? "—";
    const whoDisp = edge.disputedBy === "me"
      ? trunc(userName, 11)
      : trunc(name, 11);
    content = (
      <>
        <p className="mb-1.5 text-[11px] font-semibold" style={{ color: `rgba(${AMBER},1)` }}>
          ⚡ Спір
        </p>
        <div className="space-y-1 text-[10px] text-white/48">
          <p>{whoDisp} оскаржив результат угоди</p>
          <p className="text-white/28">{trunc(userName, 11)} ↔ {trunc(name, 11)}</p>
        </div>
      </>
    );
  }

  return (
    <div
      className="pointer-events-none absolute z-10 rounded-xl border border-white/10 bg-[#111318]/95 p-3 shadow-xl backdrop-blur-sm"
      style={{ left, top, width: W }}
    >
      {content}
    </div>
  );
}

// ── Legend item ───────────────────────────────────────────────────────────────
function LegendItem({
  kind,
  color,
  label,
}: {
  kind: "solid" | "dashed" | "arrow" | "node";
  color?: string;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1.5 text-[10px] text-white/28">
      {kind === "solid"  && (
        <svg width={18} height={2} style={{ overflow: "visible", flexShrink: 0 }}>
          <line x1={0} y1={1} x2={18} y2={1} stroke={color} strokeWidth={1.5} />
        </svg>
      )}
      {kind === "dashed" && (
        <svg width={18} height={2} style={{ overflow: "visible", flexShrink: 0 }}>
          <line x1={0} y1={1} x2={18} y2={1} stroke={color} strokeWidth={1} strokeDasharray="4 3" />
        </svg>
      )}
      {kind === "arrow"  && (
        <svg width={20} height={8} style={{ overflow: "visible", flexShrink: 0 }}>
          <line x1={0} y1={4} x2={13} y2={4} stroke={color} strokeWidth={1.2} />
          <polygon points="20,4 12,1 12,7" fill={color} />
        </svg>
      )}
      {kind === "node"   && (
        <svg width={10} height={10} style={{ flexShrink: 0 }}>
          <circle cx={5} cy={5} r={4} fill="none"
            stroke="rgba(0,212,170,0.5)" strokeWidth={1} />
        </svg>
      )}
      {label}
    </span>
  );
}
