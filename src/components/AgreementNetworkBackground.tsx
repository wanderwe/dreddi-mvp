"use client";

import { useEffect, useRef, useCallback } from "react";

interface Node {
  x: number; y: number;
  vx: number; vy: number;
  r: number; phase: number;
  active: number;
}

interface Edge {
  ai: number; bi: number;
  progress: number;
  settled: boolean;
  settledAge: number;
  alpha: number;
}

interface Ripple {
  x: number; y: number;
  r: number; alpha: number;
}

const TEAL = "0,212,170";
const NODE_COUNT = 22;
const MAX_EDGES = 40;
const SPAWN_MS = 1800;

function rnd(a: number, b: number) { return a + Math.random() * (b - a); }

export default function AgreementNetworkBackground({
  className = "",
}: {
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{
    nodes: Node[]; edges: Edge[]; ripples: Ripple[];
    tick: number; lastSpawn: number; raf: number;
    w: number; h: number;
  } | null>(null);

  const spawnEdge = useCallback(() => {
    const s = stateRef.current;
    if (!s) return;
    const { nodes, edges, ripples } = s;
    const ai = Math.floor(rnd(0, nodes.length));
    let bi = Math.floor(rnd(0, nodes.length));
    while (bi === ai) bi = Math.floor(rnd(0, nodes.length));
    edges.push({ ai, bi, progress: 0, settled: false, settledAge: 0, alpha: 1 });
    if (edges.length > MAX_EDGES) edges.splice(0, 1);
    nodes[ai].active = 90;
    nodes[bi].active = 90;
    ripples.push({ x: nodes[ai].x, y: nodes[ai].y, r: 0, alpha: 0.7 });
    ripples.push({ x: nodes[bi].x, y: nodes[bi].y, r: 0, alpha: 0.5 });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      if (stateRef.current) {
        stateRef.current.w = rect.width;
        stateRef.current.h = rect.height;
      }
    };

    resize();
    window.addEventListener("resize", resize);

    const W = canvas.width, H = canvas.height;

    const nodes: Node[] = Array.from({ length: NODE_COUNT }, () => ({
      x: rnd(40, W - 40), y: rnd(40, H - 40),
      vx: rnd(-0.22, 0.22), vy: rnd(-0.22, 0.22),
      r: rnd(3, 7), phase: rnd(0, Math.PI * 2),
      active: 0,
    }));

    stateRef.current = {
      nodes, edges: [], ripples: [],
      tick: 0, lastSpawn: Date.now() - 800,
      raf: 0, w: W, h: H,
    };

    for (let i = 0; i < 8; i++) {
      const ai = Math.floor(rnd(0, nodes.length));
      let bi = Math.floor(rnd(0, nodes.length));
      while (bi === ai) bi = Math.floor(rnd(0, nodes.length));
      stateRef.current.edges.push({
        ai, bi, progress: 1, settled: true,
        settledAge: Math.floor(rnd(0, 80)), alpha: rnd(0.15, 0.45),
      });
    }

    function frame() {
      const s = stateRef.current!;
      s.tick++;
      const { tick, nodes, edges, ripples, w, h } = s;
      ctx.clearRect(0, 0, w, h);

      nodes.forEach((n) => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 24 || n.x > w - 24) n.vx *= -1;
        if (n.y < 24 || n.y > h - 24) n.vy *= -1;
        if (n.active > 0) n.active--;
      });

      edges.forEach((e) => {
        if (!e.settled) {
          e.progress = Math.min(1, e.progress + 0.008);
          if (e.progress >= 1) e.settled = true;
        } else {
          e.settledAge++;
          if (e.settledAge > 240) e.alpha = Math.max(0, e.alpha - 0.003);
        }
        const a = nodes[e.ai], b = nodes[e.bi];
        const tx = a.x + (b.x - a.x) * e.progress;
        const ty = a.y + (b.y - a.y) * e.progress;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(tx, ty);
        ctx.strokeStyle = `rgba(${TEAL},${(e.settled ? 0.14 : 0.42) * e.alpha})`;
        ctx.lineWidth = e.settled ? 0.7 : 1;
        ctx.stroke();
        if (!e.settled) {
          ctx.beginPath();
          ctx.arc(tx, ty, 2.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${TEAL},${e.alpha * 0.9})`;
          ctx.fill();
        }
      });
      for (let i = edges.length - 1; i >= 0; i--) {
        if (edges[i].alpha <= 0) edges.splice(i, 1);
      }

      ripples.forEach((r) => {
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${TEAL},${r.alpha})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
        r.r += 1.1; r.alpha -= 0.016;
      });
      for (let i = ripples.length - 1; i >= 0; i--) {
        if (ripples[i].alpha <= 0) ripples.splice(i, 1);
      }

      nodes.forEach((n) => {
        const isActive = n.active > 0;
        const pulse = isActive ? Math.sin(tick * 0.08 + n.phase) * 0.18 + 0.85 : 1;
        const r = n.r * pulse;
        if (isActive) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + 10, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${TEAL},0.05)`;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + 4, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${TEAL},0.18)`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = isActive ? `rgba(${TEAL},0.9)` : `rgba(${TEAL},0.3)`;
        ctx.fill();
      });

      const now = Date.now();
      const interval = tick < 30 ? 400 : SPAWN_MS + rnd(-500, 500);
      if (now - s.lastSpawn > interval) {
        s.lastSpawn = now;
        spawnEdge();
      }
      s.raf = requestAnimationFrame(frame);
    }

    stateRef.current.raf = requestAnimationFrame(frame);
    return () => {
      if (stateRef.current) cancelAnimationFrame(stateRef.current.raf);
      window.removeEventListener("resize", resize);
    };
  }, [spawnEdge]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
}
