"use client";

import { useEffect, useState } from "react";

export function WhyProgress() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const nextProgress = scrollHeight > 0 ? Math.min((scrollTop / scrollHeight) * 100, 100) : 0;

      setProgress(nextProgress);
      setVisible(scrollTop > 80);
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);

    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  return (
    <div
      className={`sticky top-0 z-20 -mx-6 mb-8 border-b border-white/10 bg-slate-950/70 px-6 py-2.5 backdrop-blur transition-opacity duration-200 ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-hidden={!visible}
    >
      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-300">Why Dreddi Exists</p>
      <div className="mt-2 h-px w-full bg-white/10">
        <div className="h-full bg-emerald-300/80 transition-[width] duration-150" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
