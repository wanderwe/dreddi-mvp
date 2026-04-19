import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ locale: string; handle: string }>;
};

export default async function LocalizedPublicProfilePassportAliasPage({ params }: Props) {
  const { locale, handle } = await params;
  redirect(`/${locale}/u/${encodeURIComponent(handle)}`);
}
