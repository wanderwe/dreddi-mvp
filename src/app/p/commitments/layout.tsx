import { redirect } from "next/navigation";
import { COMMITMENTS_ENABLED } from "@/lib/features";

export default function PublicCommitmentsLayout({ children }: { children: React.ReactNode }) {
  if (!COMMITMENTS_ENABLED) redirect("/");
  return <>{children}</>;
}
