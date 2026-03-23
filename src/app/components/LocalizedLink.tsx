"use client";

import Link, { LinkProps } from "next/link";
import { ComponentProps } from "react";
import { useLocale } from "@/lib/i18n/I18nProvider";
import { localizePath } from "@/lib/i18n/routing";

type Props = Omit<ComponentProps<typeof Link>, "href"> & {
  href: LinkProps["href"];
};

export function LocalizedLink({ href, ...props }: Props) {
  const locale = useLocale();

  if (typeof href === "string" && href.startsWith("/")) {
    return <Link href={localizePath(href, locale)} {...props} />;
  }

  return <Link href={href} {...props} />;
}
