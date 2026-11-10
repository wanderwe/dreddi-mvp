// Site positioning: "pledge" = promises to yourself and to others, the main version since 2026-10-31;
// "classic" = the earlier agreements version, kept for its texts and as a way back
// (NEXT_PUBLIC_POSITIONING=classic).
export type Positioning = "classic" | "pledge";
export const POSITIONING: Positioning =
  process.env.NEXT_PUBLIC_POSITIONING === "classic" ? "classic" : "pledge";

// Sign in with Apple stays hidden until the Apple provider is set up in Apple Developer and Supabase;
// turn it on with NEXT_PUBLIC_APPLE_SIGN_IN=true (on Vercel: set it and redeploy).
export const APPLE_SIGN_IN = process.env.NEXT_PUBLIC_APPLE_SIGN_IN === "true";
