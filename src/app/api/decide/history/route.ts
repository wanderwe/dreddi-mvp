import { JudgeError } from "@/lib/ai/askJudge";
import { listMine } from "@/lib/quickDisputes/server";
import { withIdentity } from "@/lib/quickDisputes/http";

// The signed-in user's saved quick disputes.
export async function GET(req: Request) {
  return withIdentity(req, async (identity) => {
    if (!identity.userId) throw new JudgeError("sign_in", 401);
    return { disputes: await listMine(identity.userId) };
  });
}
