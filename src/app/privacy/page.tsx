import { LegalDocumentPage } from "@/app/components/LegalDocumentPage";

export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  return <LegalDocumentPage type="privacy" />;
}
