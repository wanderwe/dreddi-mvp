import { NotificationCopy, NotificationLocale } from "./types";

export type InviteResponseType = "declined" | "ignored";

type InviteResponseCopyInput = {
  locale: NotificationLocale;
  response: InviteResponseType;
  actorName?: string | null;
  dealTitle?: string | null;
};

const fallbackNameByLocale: Record<NotificationLocale, string> = {
  en: "Someone",
  uk: "Хтось",
};

const fallbackDealByLocale: Record<NotificationLocale, string> = {
  en: "this deal",
  uk: "цю угоду",
};

const ctaLabelByLocale: Record<NotificationLocale, string> = {
  en: "Open deal",
  uk: "Відкрити угоду",
};

const titleByLocale: Record<NotificationLocale, Record<InviteResponseType, string>> = {
  en: {
    declined: "Invite declined",
    ignored: "Invite awaiting response",
  },
  uk: {
    declined: "Запрошення відхилено",
    ignored: "Запрошення без відповіді",
  },
};

export const resolveInviteActorName = (profile: {
  handle?: string | null;
  display_name?: string | null;
} | null | undefined) => {
  if (!profile) return null;
  const handle = profile.handle?.trim();
  if (handle) return `@${handle}`;
  const displayName = profile.display_name?.trim();
  if (displayName) return displayName;
  return null;
};

export const getInviteResponseCopy = ({
  locale,
  response,
  actorName,
  dealTitle,
}: InviteResponseCopyInput): NotificationCopy => {
  const actor = actorName?.trim() || fallbackNameByLocale[locale];
  const deal = dealTitle?.trim() || fallbackDealByLocale[locale];

  const body =
    response === "declined"
      ? locale === "uk"
        ? `${actor} відхилив(ла) запрошення до угоди: ${deal}`
        : `${actor} declined the invite to the deal: ${deal}`
      : locale === "uk"
        ? `${actor} поки що не відповів(ла) на запрошення до угоди: ${deal}`
        : `${actor} hasn't responded to the invite yet: ${deal}`;

  return {
    title: titleByLocale[locale][response],
    body,
    ctaLabel: ctaLabelByLocale[locale],
  };
};
