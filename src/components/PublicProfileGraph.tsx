"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useT } from "@/lib/i18n/I18nProvider";

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
  recentActivity: boolean;
  /** Pre-computed radians (0 = right, -π/2 = top) */
  angle: number;
  /** Ignored — component computes distance responsively */
  baseDist?: number;
}

export interface GraphEdge {
  partyId: string;
  count: number;
  fulfilled: number;
  disputed: number;
  /** Deals in progress (active + completed_by_promisor) */
  active: number;
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

type HoverInfo = { kind: "party"; party: Placed; edge: GraphEdge | null } | null;

// ── Design tokens ─────────────────────────────────────────────────────────────
const TEAL  = "0,212,170";
const ROSE  = "253,164,175"; // rose-300, matches disputed status in timeline & tooltip
const GREY  = "107,114,128";
const BG    = "#111318";

// ── Pure helpers ──────────────────────────────────────────────────────────────
function trunc(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + "…" : s;
}
function mkInitials(name: string) {
  const stripped = name.replace(/^@+/, "");
  return stripped.split(/\s+/).map(w => w[0]).filter(Boolean).join("").slice(0, 2).toUpperCase();
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
function edgeColor(edge: GraphEdge): string {
  // Blend teal→rose-300 by ratio AND absolute count (need 3+ disputed for full rose)
  const ratio = edge.count > 0 ? edge.disputed / edge.count : 0;
  const dr    = ratio * Math.min(edge.disputed / 3, 1);
  // teal(0,212,170) → rose-300(253,164,175)
  const r  = Math.round(253 * dr);
  const g  = Math.round(212 - 48 * dr);
  const b  = Math.round(170 + 5  * dr);
  return `${r},${g},${b}`;
}

function drawEdge(
  ctx: CanvasRenderingContext2D,
  sx: number, sy: number, ex: number, ey: number,
  edge: GraphEdge, isHov: boolean, tick: number,
) {
  const thick  = 0.8 + Math.min(edge.count, 5) * 0.55;
  const bright = 0.3 + (edge.fulfilled / Math.max(edge.count, 1)) * 0.4;
  const shimmer = edge.active > 0
    ? Math.sin(tick * 0.06) * 0.1 + bright
    : bright;
  const alpha = isHov ? Math.min(shimmer + 0.3, 0.95) : shimmer;
  const color = edgeColor(edge);

  // Glow
  if (edge.active > 0 || isHov) {
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey);
    ctx.strokeStyle = `rgba(${color},${isHov ? 0.1 : 0.05})`;
    ctx.lineWidth = (thick + 0.8) * 4;
    ctx.setLineDash([]);
    ctx.stroke();
  }
  // Line
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey);
  ctx.strokeStyle = `rgba(${color},${alpha})`;
  ctx.lineWidth = isHov ? thick + 0.8 : thick;
  ctx.setLineDash([]);
  ctx.stroke();
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function PublicProfileGraph({ userName, parties, edges, locale = "uk" }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const wrapRef      = useRef<HTMLDivElement>(null);
  const rafRef       = useRef<number>(0);
  const tickRef      = useRef<number>(0);
  const placedRef    = useRef<Placed[]>([]);
  const jittersRef   = useRef<number[]>([]);
  const hovRef       = useRef<HoverInfo>(null);
  const lastTouchRef = useRef<number>(0); // suppress synthesized click after touch

  const [tooltip,      setTooltip]      = useState<HoverInfo>(null);
  const [mousePos,     setMousePos]     = useState({ x: 0, y: 0 });
  const [containerW,   setContainerW]   = useState(640);
  const [pinnedInfo,   setPinnedInfo]   = useState<HoverInfo>(null);
  const [pinnedMouse,  setPinnedMouse]  = useState({ x: 0, y: 0 });

  // ── Compute placed nodes (responsive, stable jitter) ─────────────────────
  const computePlaced = useCallback((cw: number, ch: number): Placed[] => {
    const cx = cw / 2, cy = ch / 2;
    const compact = cw < 480;
    const visibleParties = compact ? parties.slice(0, 12) : parties;
    const baseDist = Math.min(cw, ch) * (compact ? 0.42 : 0.38);
    return visibleParties.map((party, i) => {
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
      const ch = Math.round(cw < 480 ? cw * 0.75 : cw * 0.52);
      canvas.style.width  = `${cw}px`;
      canvas.style.height = `${ch}px`;
      canvas.width  = cw * dpr;
      canvas.height = ch * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      placedRef.current = computePlaced(cw, ch);
      setContainerW(cw);
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
      const userR   = compact ? 20 : 26;

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

        // Unit vector center → party
        const dx = party.x - cx, dy = party.y - cy;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1) continue;
        const ux = dx / len, uy = dy / len;

        // Start at edge of center node, end at edge of party node
        const sx0 = cx     + ux * (userR  + 2);
        const sy0 = cy     + uy * (userR  + 2);
        const ex0 = party.x - ux * (party.r + 2);
        const ey0 = party.y - uy * (party.r + 2);

        const isHov = hov?.kind === "party" && hov.party.id === edge.partyId;
        drawEdge(ctx, sx0, sy0, ex0, ey0, edge, isHov, tick);
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

        // Initials / dash — use fixed base radius so font size never jumps
        const lbl = isPriv ? "—" : party.initials;
        ctx.font = `600 ${Math.floor(party.r * 0.6)}px ui-sans-serif,system-ui,sans-serif`;
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
            const lx = party.x + nx * (party.r + 11), ly = party.y + ny * (party.r + 11);
            ctx.font = "10px ui-sans-serif,system-ui,sans-serif";
            ctx.fillStyle = isHov ? "rgba(255,255,255,0.82)" : "rgba(255,255,255,0.38)";
            ctx.textAlign = nx > 0.25 ? "left" : nx < -0.25 ? "right" : "center";
            ctx.textBaseline = "middle";
            ctx.fillText(name, lx, ly);
          }
        }
      }

      // ── Center user node ────────────────────────────────────────────────────
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
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    const cx = cw / 2, cy = ch / 2;
    const deadR = (cw < 480 ? 20 : 26) + 6;

    // Dead zone: center node area triggers nothing
    if ((x - cx) ** 2 + (y - cy) ** 2 <= deadR ** 2) return null;

    for (const p of placed) {
      if ((x - p.x) ** 2 + (y - p.y) ** 2 <= (p.r + 6) ** 2) {
        const edge = edges.find(e => e.partyId === p.id) ?? null;
        return { kind: "party", party: p, edge };
      }
    }
    for (const edge of edges) {
      const party = placed.find(p => p.id === edge.partyId);
      if (!party) continue;
      if (distToSeg(x, y, cx, cy, party.x, party.y) < 12)
        return { kind: "party", party, edge };
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
        info?.kind === "party" && info.party.isPublic ? "pointer" : "default";
    }
  }, [toCanvasCoords, findHover]);

  const onMouseLeave = useCallback(() => {
    hovRef.current = null;
    setTooltip(null);
    if (canvasRef.current) canvasRef.current.style.cursor = "default";
    // Keep pinned tooltip visible after mouse leaves
  }, []);

  const onClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // Ignore synthesized click that follows touchstart (handled by onTouchStart)
    if (Date.now() - lastTouchRef.current < 500) return;
    const coords = toCanvasCoords(e);
    if (!coords) return;
    const info = findHover(coords.x, coords.y);
    if (!info) return;
    // Desktop: single click → open profile directly
    if (info.kind === "party" && info.party.isPublic && info.party.username) {
      window.open(`/${locale}/u/${encodeURIComponent(info.party.username)}`, "_blank");
    }
  }, [toCanvasCoords, findHover, locale]);

  const onTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    lastTouchRef.current = Date.now(); // mark touch so onClick is suppressed
    const touch = e.touches[0];
    if (!touch) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const info = findHover(x, y);

    if (!info) { setPinnedInfo(null); return; }

    // Second tap on same node → navigate
    if (pinnedInfo?.kind === "party" && info.kind === "party" && pinnedInfo.party.id === info.party.id) {
      if (info.party.isPublic && info.party.username) {
        window.open(`/${locale}/u/${encodeURIComponent(info.party.username)}`, "_blank");
      }
      setPinnedInfo(null);
      return;
    }

    e.preventDefault();
    const wRect = wrapRef.current?.getBoundingClientRect();
    if (wRect) setPinnedMouse({ x: touch.clientX - wRect.left, y: touch.clientY - wRect.top });
    setPinnedInfo(info);
  }, [findHover, pinnedInfo, locale]);

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
        onTouchStart={onTouchStart}
      />

      {(pinnedInfo ?? tooltip) && (
        <HoverTooltip
          info={pinnedInfo ?? tooltip}
          mouse={pinnedInfo ? pinnedMouse : mousePos}
          containerW={containerW}
          userName={userName}
          isPinned={Boolean(pinnedInfo)}
          locale={locale}
          onDismiss={() => setPinnedInfo(null)}
        />
      )}

      {/* Legend */}
      <Legend />
    </div>
  );
}

// ── Hover tooltip ─────────────────────────────────────────────────────────────
function HoverTooltip({
  info,
  mouse,
  containerW,
  userName,
  isPinned,
  locale,
  onDismiss,
}: {
  info: HoverInfo;
  mouse: { x: number; y: number };
  containerW: number;
  userName: string;
  isPinned: boolean;
  locale: string;
  onDismiss: () => void;
}) {
  const t = useT();
  if (!info) return null;
  const W = Math.min(212, containerW - 8);
  let left = mouse.x + 14;
  let top  = mouse.y - 28;
  if (left + W > containerW - 4) left = mouse.x - W - 14;
  left = Math.max(4, left);
  if (top < 4) top = mouse.y + 10;

  let content: React.ReactNode = null;

  if (info.kind === "party") {
    const { party: p, edge } = info;
    const name     = p.display_name ?? p.username ?? "—";
    const active   = edge?.active   ?? Math.max(0, p.dealCount - p.fulfilled - p.disputed);
    const disputed = edge?.disputed ?? p.disputed;
    const whoDisp  = disputed > 0 && edge?.disputedBy
      ? (edge.disputedBy === "me" ? trunc(userName.replace(/^@+/, ""), 12) : trunc(name, 12))
      : null;
    content = (
      <>
        <p className="mb-2 truncate text-[11px] font-semibold text-white/90">{name}</p>
        <div className="mb-2 border-b border-white/10 pb-2">
          <span className="text-[17px] font-semibold text-white">{p.dealCount}</span>
          <span className="ml-1.5 text-[10px] text-white/40">{t("publicProfile.graph.tooltip.dealsTotal")}</span>
        </div>
        <div className="space-y-1 text-[10px] text-white/55">
          {active > 0 && (
            <p className="flex items-center gap-1.5 text-white/75">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/50 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white/60" />
              </span>
              {active} {t("publicProfile.graph.tooltip.active")}
            </p>
          )}
          {p.fulfilled > 0 && (
            <p className="text-emerald-300/80">✓ {p.fulfilled} {t("publicProfile.graph.tooltip.fulfilled")}</p>
          )}
          {disputed > 0 && (
            <p className="text-rose-300/85">
              ● {disputed} {t("publicProfile.graph.tooltip.disputed")}
              {whoDisp ? ` · ${whoDisp}` : ""}
            </p>
          )}
        </div>
      </>
    );
  }

  const canNavigate = info.kind === "party" && info.party.isPublic && info.party.username;

  return (
    <div
      className={`absolute z-10 rounded-xl border border-white/10 bg-[#111318]/95 p-3 shadow-xl backdrop-blur-sm ${isPinned ? "pointer-events-auto" : "pointer-events-none"}`}
      style={{ left, top, width: W }}
    >
      {isPinned && (
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full text-white/30 transition hover:text-white/70"
          aria-label="Close"
        >
          ×
        </button>
      )}
      {content}
      {isPinned && canNavigate && (
        <a
          href={`/${locale}/u/${encodeURIComponent((info as { party: { username: string } }).party.username)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2.5 flex items-center gap-1 text-[10px] text-emerald-300/60 transition hover:text-emerald-300 md:hidden"
        >
          → {t("publicProfile.graph.tooltip.openProfile")}
        </a>
      )}
    </div>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────
function Legend() {
  const t = useT();
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-white/[0.06] px-5 py-2.5">
      <LegendItem kind="solid" color={`rgba(${TEAL},0.7)`}  label={t("publicProfile.graph.legend.fulfilled")} />
      <LegendItem kind="solid" color={`rgba(${ROSE},0.75)`} label={t("publicProfile.graph.legend.disputed")} />
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
