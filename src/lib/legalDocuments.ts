import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type LegalDocumentType = "privacy" | "terms";

type LegalDocumentRow = {
  title: string;
  content: string;
  updated_at: string;
  locale: string;
};

const hasSupabaseConfig = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function getLegalDocument(type: LegalDocumentType, locale: string) {
  if (!hasSupabaseConfig()) {
    return {
      document: null,
      error: "Supabase is not configured for legal documents.",
    } as const;
  }

  const supabase = supabaseAdmin();

  const fetchForLocale = async (targetLocale: string) =>
    supabase
      .from("legal_documents")
      .select("title, content, updated_at, locale")
      .eq("type", type)
      .eq("locale", targetLocale)
      .maybeSingle();

  const { data, error } = await fetchForLocale(locale);

  if (error) {
    return {
      document: null,
      error: error.message,
    } as const;
  }

  if (data) {
    return {
      document: data as LegalDocumentRow,
      error: null,
    } as const;
  }

  if (locale !== "en") {
    const { data: fallbackData, error: fallbackError } = await fetchForLocale("en");
    if (fallbackError) {
      return {
        document: null,
        error: fallbackError.message,
      } as const;
    }
    if (fallbackData) {
      return {
        document: fallbackData as LegalDocumentRow,
        error: null,
      } as const;
    }
  }

  return {
    document: null,
    error: "Legal document not found.",
  } as const;
}
