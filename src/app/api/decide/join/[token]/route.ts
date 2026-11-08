import { joinDispute, previewInvite } from "@/lib/quickDisputes/server";
import { withIdentity } from "@/lib/quickDisputes/http";

// The invite link: side B sees the question and side A's position, then joins with their own.
export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  return withIdentity(req, (identity) => previewInvite(token, identity));
}

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  return withIdentity(req, (identity) => joinDispute(token, identity, body));
}
