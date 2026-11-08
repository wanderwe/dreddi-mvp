import { listMine } from "@/lib/quickDisputes/server";
import { withIdentity } from "@/lib/quickDisputes/http";

// The quick disputes of the signed-in user and of this browser.
export async function GET(req: Request) {
  return withIdentity(req, async (identity) => ({ disputes: await listMine(identity) }));
}
