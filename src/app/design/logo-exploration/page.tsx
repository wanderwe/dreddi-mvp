import type { ReactNode } from "react";
import { DreddiLogo } from "@/app/components/DreddiLogo";

const sizes = [
  { label: "Favicon", px: 16 },
  { label: "Small", px: 24 },
  { label: "Header", px: 40 },
  { label: "Embed", px: 64 },
];

type IconProps = { className?: string };

function Frame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-slate-950 p-3 shadow-[0_0_0_1px_rgba(148,163,184,0.08)] ${className}`}>
      {children}
    </div>
  );
}

function WitnessGlyph({ className = "h-14 w-14" }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-label="Witness direction">
      <rect x="4" y="4" width="56" height="56" rx="16" fill="#050912" />
      <rect x="4" y="4" width="56" height="56" rx="16" stroke="#9AE6C7" strokeOpacity="0.18" />
      <path d="M12 32c5.5-8.6 12-13 20-13s14.5 4.4 20 13c-5.5 8.6-12 13-20 13s-14.5-4.4-20-13Z" fill="none" stroke="#B8F5DE" strokeWidth="2.5" />
      <circle cx="32" cy="32" r="5" fill="#99FFD0" />
      <circle cx="32" cy="32" r="10" fill="none" stroke="#6EE7B7" strokeOpacity="0.45" />
    </svg>
  );
}

function ConvergenceGlyph({ className = "h-14 w-14" }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-label="Agreement convergence direction">
      <rect x="4" y="4" width="56" height="56" rx="16" fill="#060B14" />
      <rect x="4" y="4" width="56" height="56" rx="16" stroke="#93C5FD" strokeOpacity="0.22" />
      <path d="M14 22c8 0 10 6 14 10 2.5 2.5 5.5 4 10 4" fill="none" stroke="#A5F3D0" strokeWidth="3" strokeLinecap="round" />
      <path d="M50 22c-8 0-10 6-14 10-2.5 2.5-5.5 4-10 4" fill="none" stroke="#BFDBFE" strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="38" r="4" fill="#E2FEF2" />
      <path d="M28 47h8" stroke="#8CF0C5" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function TimelineGlyph({ className = "h-14 w-14" }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-label="Timeline state direction">
      <rect x="4" y="4" width="56" height="56" rx="16" fill="#050A13" />
      <rect x="4" y="4" width="56" height="56" rx="16" stroke="#7DD3FC" strokeOpacity="0.2" />
      <path d="M14 38c5-9 11-13 18-13 7 0 11 6 18 6" fill="none" stroke="#7DD3FC" strokeOpacity="0.4" strokeWidth="2.5" />
      <path d="M14 40h36" stroke="#A7F3D0" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="20" cy="40" r="3" fill="#67E8F9" />
      <circle cx="32" cy="40" r="3" fill="#99FFD0" />
      <circle cx="44" cy="40" r="3" fill="#DCFCE7" />
    </svg>
  );
}


function DiamondWitnessGlyph({ className = "h-14 w-14" }: IconProps) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-label="Diamond witness direction">
      <defs>
        <linearGradient id="diamond-witness-shell" x1="26" y1="18" x2="176" y2="186" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3EF6C2" stopOpacity="0.86" />
          <stop offset="0.52" stopColor="#53A6FF" stopOpacity="0.8" />
          <stop offset="1" stopColor="#111318" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id="diamond-witness-stroke" x1="34" y1="28" x2="166" y2="170" gradientUnits="userSpaceOnUse">
          <stop stopColor="#65FFD4" />
          <stop offset="1" stopColor="#7DB9FF" />
        </linearGradient>
      </defs>
      <rect width="200" height="200" rx="44" fill="#111318" />
      <rect width="200" height="200" rx="44" fill="url(#diamond-witness-shell)" opacity="0.72" />
      <path d="M100 20 L178 100 L100 180 L22 100 Z" fill="none" stroke="url(#diamond-witness-stroke)" strokeWidth="7" strokeLinejoin="round" />
      <path d="M62 100 Q100 72 138 100 Q100 128 62 100 Z" fill="none" stroke="url(#diamond-witness-stroke)" strokeWidth="6" strokeLinejoin="round" />
      <circle cx="100" cy="100" r="16" fill="none" stroke="url(#diamond-witness-stroke)" strokeWidth="6" />
      <circle cx="100" cy="100" r="7" fill="#f0b429" />
    </svg>
  );
}

const candidates = [
  { key: "current", name: "Current / utility-arrow", glyph: <DreddiLogo showText={false} markClassName="h-14 w-14" /> },
  { key: "witness", name: "Witness / observable state", glyph: <WitnessGlyph /> },
  { key: "convergence", name: "Agreement convergence", glyph: <ConvergenceGlyph /> },
  { key: "timeline", name: "Timeline / live-state", glyph: <TimelineGlyph /> },
  { key: "diamond-witness", name: "Diamond witness (user concept)", glyph: <DiamondWitnessGlyph /> },
];

export default function LogoExplorationPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.18em] text-emerald-300/80">Temporary local exploration</p>
          <h1 className="text-3xl font-semibold">Dreddi icon exploration — public accountability direction</h1>
          <p className="max-w-3xl text-sm text-slate-300">
            Experimental concepts only. Production branding remains unchanged. These options focus on calm infrastructure,
            observable trust, and public accountability signals.
          </p>
        </header>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {candidates.map((candidate) => (
            <Frame key={candidate.key} className="space-y-4">
              <div className="text-sm text-slate-200">{candidate.name}</div>
              <div className="rounded-xl bg-slate-900/70 p-4">{candidate.glyph}</div>
              <div className="grid grid-cols-4 gap-2">
                {sizes.map((size) => (
                  <div key={size.label} className="flex flex-col items-center gap-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900">
                      <div style={{ width: size.px, height: size.px }}>{candidate.glyph}</div>
                    </div>
                    <span className="text-[10px] text-slate-400">{size.label}</span>
                  </div>
                ))}
              </div>
            </Frame>
          ))}
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <Frame>
            <h2 className="mb-3 text-sm text-slate-300">Header / navigation context</h2>
            <div className="rounded-2xl border border-white/10 bg-[#0B1220] p-5">
              <div className="flex items-center justify-between">
                <DreddiLogo markClassName="h-11 w-11" />
                <WitnessGlyph className="h-11 w-11" />
              </div>
            </div>
          </Frame>
          <Frame>
            <h2 className="mb-3 text-sm text-slate-300">Embeddable trust object context</h2>
            <div className="rounded-2xl border border-emerald-300/20 bg-slate-900 p-5">
              <div className="flex items-start justify-between gap-4">
                <ConvergenceGlyph className="h-10 w-10" />
                <div className="flex-1 text-sm text-slate-200">
                  <div className="font-medium">Public commitment #A-0182</div>
                  <div className="mt-1 text-xs text-slate-400">Watched by 61 • status observed across timeline</div>
                </div>
                <TimelineGlyph className="h-10 w-10" />
              </div>
            </div>
          </Frame>
        </section>
      </div>
    </main>
  );
}
