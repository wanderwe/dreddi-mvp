import { notFound } from "next/navigation";
import { JudgeLab } from "@/app/lab/judge/JudgeLab";

// Lab prototype: exists only when LAB_ENABLED=true (never set on Vercel), checked per request.
export const dynamic = "force-dynamic";

export default function JudgeLabPage() {
  if (process.env.LAB_ENABLED !== "true") notFound();
  return <JudgeLab />;
}
