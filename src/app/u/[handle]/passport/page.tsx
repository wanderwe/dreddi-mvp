import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ handle: string }>;
};

export default async function PublicProfilePassportAliasPage({ params }: Props) {
  const { handle } = await params;
  redirect(`/u/${encodeURIComponent(handle)}`);
}
