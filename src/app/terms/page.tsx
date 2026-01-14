import { LegalDocumentPage } from "@/app/components/LegalDocumentPage";

export const dynamic = "force-dynamic";

export default async function TermsPage() {
  return <LegalDocumentPage type="terms" />;
}
