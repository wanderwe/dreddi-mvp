import { listMine } from "@/lib/quickDisputes/server";
import { withIdentity } from "@/lib/quickDisputes/http";

// A page of the quick disputes of the signed-in user and of this browser: ?offset=0&limit=20.
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const number = (key: string) => {
    const raw = params.get(key);
    const value = raw === null || raw === "" ? NaN : Number(raw);
    return Number.isFinite(value) ? value : undefined;
  };
  return withIdentity(req, async (identity) => listMine(identity, { offset: number("offset"), limit: number("limit") }));
}
