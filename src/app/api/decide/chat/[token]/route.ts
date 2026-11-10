import { actOnChat, getChatView } from "@/lib/chatDisputes/server";
import { withIdentity } from "@/lib/quickDisputes/http";

// A verdict, with web search, can take a while.
export const maxDuration = 60;

// A chat dispute as this browser sees it, and taking a side, closing it, or asking for the verdict.
export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  return withIdentity(req, (identity) => getChatView(token, identity));
}

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Parameters<typeof actOnChat>[2];
  return withIdentity(req, (identity) => actOnChat(token, identity, body));
}
