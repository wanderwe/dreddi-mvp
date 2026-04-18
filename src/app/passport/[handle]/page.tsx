import type { Metadata } from "next";
import PassportPageClient from "@/app/passport/[handle]/PassportPageClient";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const safeHandle = decodeURIComponent(handle ?? "");
  const title = `${safeHandle ? `@${safeHandle} — ` : ""}Dreddi Reputation Passport`;

  return {
    title,
    description: "Based on confirmed outcomes, not reviews.",
    openGraph: {
      title,
      description: "Based on confirmed outcomes, not reviews.",
      type: "profile",
    },
  };
}

export default function PassportPage() {
  return <PassportPageClient />;
}
