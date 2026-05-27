"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ── Constants ────────────────────────────────────────────────────────────────
const ACCENT = "#00d4aa";
const ACCENT_RGB = "0, 212, 170";
const NODE_R = 20;
const NODE_COUNT = 9;
const CANVAS_H = 300;
const FEED_MAX = 5;
const DOT_DURATION = 1400; // ms for dot to travel

// ── Simulated data ────────────────────────────────────────────────────────────
const PARTIES = [
  "Олексій М.", "Вікторія К.", "Дмитро С.", "Наталія П.",
  "Артем Г.",   "Юлія Р.",    "Максим Д.", "Тетяна В.",
  "Іван Ш.",    "Оксана Б.",  "Сергій Л.", "Аліна Ф.",
  "Богдан Т.",  "Соломія Є.", "Роман К.",
];

const TITLES = [
  "Ремонт покрівлі до 20 червня",
  "Повернення боргу 15 000 грн",
  "Доставка меблів у неділю",
  "Дизайн логотипу за 2 тижні",
  "Оренда авто на вихідні",
  "Встановлення кондиціонера",
  "Виплата гонорару за проєкт",
  "Здати звітність у строк",
  "Ремонт ноутбука за тиждень",
  "Підготовка договору оренди",
  "Переклад документів за 3 дні",
  "Закупівля матеріалів до п'ятниці",
  "Передача ключів після оплати",
  "Підписання акту виконаних робіт",
];

// ── Types ─────────────────────────────────────────────────────────────────────
type NodeData = {
  x: number; y: number;
  vx: number; vy: number;
  label: string;
  initials: string;
  ripple: number;   // 0 = idle, 0..1 = animating
  flash: number;    // 0..1 glow intensity
};

type Connection = {
  id: number;
  aIdx: number; bIdx: number;
  dotT: number;         // 0..1 dot progress
  opacity: number;
  born: number;
};

type FeedItem = {
  id: number;
  title: string;
  partyA: string;
  partyB: string;
  status: "active" | "confirmed";
  fresh: boolean;
};

let _id = 0;
const uid = () => ++_id;
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const rand = (a: number, b: number) => a + Math.random() * (b - a);

function makeInitials(label: string) {
  return label.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

// ── Component ─────────────────────────────────────────────────────────────────
export function LiveAgreementNetwork() {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const nodesRef    = useRef<NodeData[]>([]);
  const connsRef    = useRef<Connection[]>([]);
  const rafRef      = useRef<number>(0);
  const nextSpawnRef = useRef<number>(0);
  const feedRef     = useRef<FeedItem[]>([]);

  const [feed, setFeed] = useState<FeedItem[]>([]);

  // ── Spawn one agreement ──────────────────────────────────────────────────
  const spawn = useCallback(() => {
    const nodes = nodesRef.current;
    if (nodes.length < 2) return;

    let a = Math.floor(Math.random() * nodes.length);
    let b: number;
    do { b = Math.floor(Math.random() * nodes.length); } while (b === a);

    const status: "active" | "confirmed" = Math.random() > 0.35 ? "active" : "confirmed";

    connsRef.current.push({ id: uid(), aIdx: a, bIdx: b, dotT: 0, opacity: 1, born: Date.now() });

    nodes[a].ripple = 0.01; nodes[a].flash = 1;
    nodes[b].ripple = 0.01; nodes[b].flash = 1;

    const item: FeedItem = {
      id: uid(), title: pick(TITLES),
      partyA: nodes[a].label, partyB: nodes[b].label,
      status, fresh: true,
    };
    const next = [item, ...feedRef.current].slice(0, FEED_MAX);
    feedRef.current = next;
    setFeed([...next]);

    setTimeout(() => {
      feedRef.current = feedRef.current.map(f => f.id === item.id ? { ...f, fresh: false } : f);
      setFeed([...feedRef.current]);
    }, 500);
  }, []);

  // ── Canvas init + loop ───────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
    let cw = 0, ch = CANVAS_H;

    const resize = () => {
      cw = canvas.parentElement?.clientWidth ?? 600;
      canvas.style.width  = `${cw}px`;
      canvas.style.height = `${ch}px`;
      canvas.width  = cw * dpr;
      canvas.height = ch * dpr;
      ctx.scale(dpr, dpr);
    };

    // Init nodes
    const parties = [...PARTIES].sort(() => Math.random() - 0.5).slice(0, NODE_COUNT);
    const initNodes = (): void => {
      nodesRef.current = parties.map(label => ({
        x: rand(NODE_R + 30, (cw || 600) - NODE_R - 30),
        y: rand(NODE_R + 20, ch - NODE_R - 20),
        vx: rand(-0.25, 0.25),
        vy: rand(-0.25, 0.25),
        label,
        initials: makeInitials(label),
        ripple: 0,
        flash: 0,
      }));
    };

    resize();
    initNodes();
    nextSpawnRef.current = Date.now() + rand(800, 1200);

    const ro = new ResizeObserver(() => { resize(); });
    ro.observe(canvas.parentElement ?? canvas);

    // ── Draw loop ────────────────────────────────────────────────────────
    const FADE_HOLD = 2200;     // ms connection stays full opacity
    const FADE_DUR  = 5000;     // ms to fade to 0

    const draw = () => {
      ctx.clearRect(0, 0, cw, ch);
      const now = Date.now();
      const nodes = nodesRef.current;

      // Spawn?
      if (now >= nextSpawnRef.current) {
        spawn();
        nextSpawnRef.current = now + rand(2000, 3200);
      }

      // ── Update nodes ──
      for (const n of nodes) {
        n.vx += rand(-0.018, 0.018);
        n.vy += rand(-0.018, 0.018);
        const spd = Math.hypot(n.vx, n.vy);
        if (spd > 0.45) { n.vx *= 0.45 / spd; n.vy *= 0.45 / spd; }
        if (spd < 0.04) { n.vx += rand(-0.04, 0.04); n.vy += rand(-0.04, 0.04); }
        n.x += n.vx; n.y += n.vy;
        const pad = NODE_R + 12;
        if (n.x < pad)      { n.x = pad;      n.vx =  Math.abs(n.vx); }
        if (n.x > cw - pad) { n.x = cw - pad; n.vx = -Math.abs(n.vx); }
        if (n.y < pad)      { n.y = pad;       n.vy =  Math.abs(n.vy); }
        if (n.y > ch - pad) { n.y = ch - pad;  n.vy = -Math.abs(n.vy); }
        if (n.ripple > 0)  { n.ripple = Math.min(1, n.ripple + 0.022); if (n.ripple >= 1) n.ripple = 0; }
        if (n.flash  > 0)  { n.flash  = Math.max(0, n.flash  - 0.016); }
      }

      // ── Update connections ──
      connsRef.current = connsRef.current.filter(c => {
        const age = now - c.born;
        c.dotT = Math.min(1, age / DOT_DURATION);
        if (age > FADE_HOLD) c.opacity = Math.max(0, 1 - (age - FADE_HOLD) / FADE_DUR);
        return c.opacity > 0.01;
      });

      // ── Draw connections ──
      for (const c of connsRef.current) {
        const a = nodes[c.aIdx], b = nodes[c.bIdx];
        if (!a || !b) continue;

        // Dashed line
        ctx.save();
        ctx.globalAlpha = c.opacity * 0.55;
        ctx.strokeStyle = ACCENT;
        ctx.lineWidth   = 1;
        ctx.setLineDash([4, 7]);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // Travelling dot
        if (c.dotT < 1) {
          const px = a.x + (b.x - a.x) * c.dotT;
          const py = a.y + (b.y - a.y) * c.dotT;

          // Glow halo
          const g = ctx.createRadialGradient(px, py, 0, px, py, 10);
          g.addColorStop(0, `rgba(${ACCENT_RGB}, ${c.opacity * 0.7})`);
          g.addColorStop(1, "transparent");
          ctx.save(); ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(px, py, 10, 0, Math.PI * 2); ctx.fill(); ctx.restore();

          // Core dot
          ctx.save();
          ctx.globalAlpha = c.opacity;
          ctx.fillStyle = "#ffffff";
          ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
      }

      // ── Draw ripples ──
      for (const n of nodes) {
        if (n.ripple <= 0) continue;
        const r   = NODE_R + n.ripple * 28;
        const alp = (1 - n.ripple) * 0.5;
        ctx.save();
        ctx.globalAlpha = alp;
        ctx.strokeStyle = ACCENT;
        ctx.lineWidth   = 1.5;
        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }

      // ── Draw nodes ──
      for (const n of nodes) {
        const f = n.flash;

        // Outer glow when active
        if (f > 0.05) {
          const g = ctx.createRadialGradient(n.x, n.y, NODE_R * 0.5, n.x, n.y, NODE_R * 2.8);
          g.addColorStop(0, `rgba(${ACCENT_RGB}, ${f * 0.22})`);
          g.addColorStop(1, "transparent");
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(n.x, n.y, NODE_R * 2.8, 0, Math.PI * 2); ctx.fill();
        }

        // Fill
        ctx.beginPath(); ctx.arc(n.x, n.y, NODE_R, 0, Math.PI * 2);
        ctx.fillStyle = f > 0.08
          ? `rgba(${ACCENT_RGB}, ${0.1 + f * 0.18})`
          : "rgba(255,255,255,0.05)";
        ctx.fill();

        // Border
        ctx.strokeStyle = f > 0.08
          ? `rgba(${ACCENT_RGB}, ${0.45 + f * 0.55})`
          : "rgba(255,255,255,0.18)";
        ctx.lineWidth = f > 0.08 ? 1.5 : 1;
        ctx.stroke();

        // Initials
        ctx.fillStyle  = f > 0.08 ? ACCENT : "rgba(255,255,255,0.55)";
        ctx.font       = `600 11px ui-sans-serif, system-ui, sans-serif`;
        ctx.textAlign  = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(n.initials, n.x, n.y);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, [spawn]);

  return (
    <div className="w-full overflow-hidden rounded-2xl" style={{ background: "#0c1118" }}>
      {/* Canvas */}
      <div className="relative w-full" style={{ height: CANVAS_H }}>
        <canvas ref={canvasRef} className="absolute inset-0" />
        {/* Subtle vignette */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse at center, transparent 55%, #0c1118 100%)" }}
        />
      </div>

      {/* Live feed */}
      <div className="border-t border-white/[0.07] px-4 pt-3 pb-4" style={{ minHeight: 120 }}>
        <p className="mb-2.5 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/30">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: ACCENT, boxShadow: `0 0 6px ${ACCENT}` }}
          />
          Live · Публічні угоди
        </p>

        <div className="flex flex-col gap-1">
          {feed.map(item => (
            <FeedRow key={item.id} item={item} />
          ))}
          {feed.length === 0 && (
            <p className="text-xs text-white/20">Очікування угод…</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Feed row ──────────────────────────────────────────────────────────────────
function FeedRow({ item }: { item: FeedItem }) {
  return (
    <div
      className="flex items-center gap-2 rounded-lg px-2 py-1.5"
      style={{
        animation: item.fresh ? "lan-feed-in 0.38s cubic-bezier(0.22,1,0.36,1) both" : undefined,
        background: item.fresh ? "rgba(0,212,170,0.04)" : "transparent",
        transition: "background 0.6s",
      }}
    >
      <span className="min-w-0 flex-1 truncate text-[13px] leading-tight text-white/80">
        {item.title}
      </span>
      <span className="hidden shrink-0 text-[11px] text-white/35 sm:block">
        {item.partyA}&thinsp;→&thinsp;{item.partyB}
      </span>
      <span
        className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
        style={
          item.status === "confirmed"
            ? { background: "rgba(52,211,153,0.12)", color: "#6ee7b7" }
            : { background: `rgba(${ACCENT_RGB},0.12)`, color: ACCENT }
        }
      >
        {item.status === "confirmed" ? "Виконано" : "Активна"}
      </span>
    </div>
  );
}
