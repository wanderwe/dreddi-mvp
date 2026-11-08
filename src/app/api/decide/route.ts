import { createDispute } from "@/lib/quickDisputes/server";
import { withIdentity } from "@/lib/quickDisputes/http";

// «Дредді розсуди»: side A starts a quick dispute with a question and their position.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  return withIdentity(req, (identity) => createDispute(identity, body));
}
