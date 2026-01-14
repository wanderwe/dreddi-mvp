export type LegalDocumentType = "privacy" | "terms";

type LegalDocumentRow = {
  title: string;
  content: string;
  updated_at: string;
  locale: string;
};

const LEGAL_CONTENT_DIR = "src/content/legal";

const LEGAL_DOCUMENTS: Record<LegalDocumentType, Record<string, { title: string; updatedAt: string }>> = {
  privacy: {
    en: {
      title: "Privacy Policy",
      updatedAt: "2025-01-15",
    },
    uk: {
      title: "Політика конфіденційності",
      updatedAt: "2025-01-15",
    },
  },
  terms: {
    en: {
      title: "Terms of Service",
      updatedAt: "2025-01-15",
    },
    uk: {
      title: "Умови користування",
      updatedAt: "2025-01-15",
    },
  },
};

export async function getLegalDocument(type: LegalDocumentType, locale: string) {
  const normalizedLocale = locale in LEGAL_DOCUMENTS[type] ? locale : "en";
  const entry = LEGAL_DOCUMENTS[type][normalizedLocale];

  if (!entry) {
    return {
      document: null,
      error: "Legal document not found.",
    } as const;
  }

  const { readFile } = await import("fs/promises");
  const path = await import("path");
  const filePath = path.join(process.cwd(), LEGAL_CONTENT_DIR, normalizedLocale, `${type}.md`);

  try {
    const content = await readFile(filePath, "utf-8");
    return {
      document: {
        title: entry.title,
        content,
        updated_at: entry.updatedAt,
        locale: normalizedLocale,
      } as LegalDocumentRow,
      error: null,
    } as const;
  } catch (error) {
    return {
      document: null,
      error: error instanceof Error ? error.message : "Failed to load legal document.",
    } as const;
  }
}
