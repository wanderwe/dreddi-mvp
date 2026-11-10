import { createChatDispute } from "@/lib/chatDisputes/server";
import { withIdentity } from "@/lib/quickDisputes/http";

// «Хто правий?» for a chat: the creator states the situation and two positions, and gets the link.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  return withIdentity(req, (identity) => createChatDispute(identity, body));
}
