export const COMMITMENTS_ENABLED =
  process.env.NEXT_PUBLIC_FEATURE_COMMITMENTS === "true";

// Site positioning (decision 2026-10-29): "classic" = agreements with friends, partners and clients;
// "pledge" = public promises (companies' and your own). Classic stays the default and the way back.
export type Positioning = "classic" | "pledge";
export const POSITIONING: Positioning =
  process.env.NEXT_PUBLIC_POSITIONING === "pledge" ? "pledge" : "classic";
