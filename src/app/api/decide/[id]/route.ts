import { act, getView } from "@/lib/quickDisputes/server";
import { withIdentity } from "@/lib/quickDisputes/http";

// A verdict, with web search, can take a while.
export const maxDuration = 60;

// One side's view of a quick dispute, and their actions in it.
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withIdentity(req, (identity) => getView(id, identity));
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Parameters<typeof act>[2];
  return withIdentity(req, (identity) => act(id, identity, body));
}
