export const COMMITMENTS_ENABLED =
  process.env.NEXT_PUBLIC_FEATURE_COMMITMENTS === "true";

// Light theme is being built page by page; until every page is converted the site stays dark-only.
export const LIGHT_THEME_ENABLED =
  process.env.NEXT_PUBLIC_FEATURE_LIGHT_THEME === "true";

// Site positioning (decision 2026-10-29): "classic" = agreements with friends, partners and clients;
// "pledge" = public promises (companies' and your own). Classic stays the default and the way back.
export type Positioning = "classic" | "pledge";
export const POSITIONING: Positioning =
  process.env.NEXT_PUBLIC_POSITIONING === "pledge" ? "pledge" : "classic";
