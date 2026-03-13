"use client";

import { useEffect, useState } from "react";

export function WhyProgress({ title }: { title: string }) {
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
      className={`fixed inset-x-0 top-0 z-30 transition-opacity duration-200 ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-hidden={!visible}
    >
      <div className="mx-auto w-full max-w-3xl px-6">
        <div className="border-b border-white/10 bg-slate-950/70 px-3 py-2.5 backdrop-blur sm:px-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-300">{title}</p>
          <div className="mt-2 h-px w-full bg-white/10">
            <div
              className="h-full bg-emerald-300/80 transition-[width] duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
