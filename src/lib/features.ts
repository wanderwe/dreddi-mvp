export const COMMITMENTS_ENABLED =
  process.env.NEXT_PUBLIC_FEATURE_COMMITMENTS === "true";

// Light theme is being built page by page; until every page is converted the site stays dark-only.
export const LIGHT_THEME_ENABLED =
  process.env.NEXT_PUBLIC_FEATURE_LIGHT_THEME === "true";
