// Sign in with Apple stays hidden until the Apple provider is set up in Apple Developer and Supabase;
// turn it on with NEXT_PUBLIC_APPLE_SIGN_IN=true (on Vercel: set it and redeploy).
export const APPLE_SIGN_IN = process.env.NEXT_PUBLIC_APPLE_SIGN_IN === "true";
