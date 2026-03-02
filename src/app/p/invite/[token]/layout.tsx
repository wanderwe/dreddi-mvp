import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n/getLocale";
import { lookupInvitePreview } from "@/lib/invitePreview";

const OG_IMAGE_URL = "https://dreddi.com/og.png";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dreddi.com";

const INVITE_METADATA_COPY = {
  en: {
    fallbackTitle: "Invite",
    description: "Invitation to an agreement. Confirm participation in Dreddi.",
    locale: "en_US",
  },
  uk: {
    fallbackTitle: "Запрошення",
    description: "Запрошення до угоди. Підтвердьте участь у Dreddi.",
    locale: "uk_UA",
  },
};

export async function generateMetadata(ctx: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await ctx.params;
  const locale = await getLocale();
  const copy = INVITE_METADATA_COPY[locale] ?? INVITE_METADATA_COPY.en;
  const invitePreview = await lookupInvitePreview(token);
  const agreementTitle = invitePreview?.title ?? copy.fallbackTitle;
  const pageTitle = `${agreementTitle} — Dreddi`;
  const canonicalUrl = new URL(`/p/invite/${encodeURIComponent(token)}`, SITE_URL).toString();

  return {
    title: pageTitle,
    description: copy.description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: agreementTitle,
      description: copy.description,
      type: "website",
      url: canonicalUrl,
      locale: copy.locale,
      images: [
        {
          url: OG_IMAGE_URL,
          width: 1200,
          height: 630,
          alt: "Dreddi",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: agreementTitle,
      description: copy.description,
      images: [OG_IMAGE_URL],
    },
  };
}

export default function InviteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
