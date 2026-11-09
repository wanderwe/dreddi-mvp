import { getStakePrefill } from "@/lib/quickDisputes/server";
import { withIdentity } from "@/lib/quickDisputes/http";

// What the new-promise form fills in to record a lost stake.
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withIdentity(req, (identity) => getStakePrefill(id, identity));
}
