import { maskEmail } from "@/lib/text";

type PublicProfileIdentityInput = {
  displayName?: string | null;
  handle?: string | null;
  email?: string | null;
};

type PublicProfileIdentity = {
  title: string;
  subtitle?: string;
  maskedEmail?: string;
};

const normalizeValue = (value?: string | null) => value?.trim() ?? "";

export const getPublicProfileIdentity = ({
  displayName,
  handle,
  email,
}: PublicProfileIdentityInput): PublicProfileIdentity => {
  const normalizedDisplayName = normalizeValue(displayName);
  const normalizedHandle = normalizeValue(handle);
  const normalizedEmail = normalizeValue(email);
  const displayNameLooksLikeEmail = normalizedDisplayName.includes("@");
  const fallbackEmail = normalizedEmail || (displayNameLooksLikeEmail ? normalizedDisplayName : "");
  const maskedEmail = fallbackEmail ? maskEmail(fallbackEmail) : "";
  const cleanedDisplayName = displayNameLooksLikeEmail ? "" : normalizedDisplayName;

  let title = "";
  let subtitle: string | undefined;

  if (normalizedHandle) {
    title = `@${normalizedHandle}`;
    subtitle = cleanedDisplayName || undefined;
  } else if (cleanedDisplayName) {
    title = cleanedDisplayName;
  } else if (maskedEmail) {
    title = maskedEmail;
  }

  if (!subtitle && !normalizedHandle && maskedEmail && title !== maskedEmail) {
    subtitle = maskedEmail;
  }

  if (subtitle && subtitle === title) {
    subtitle = undefined;
  }

  return { title, subtitle, maskedEmail: maskedEmail || undefined };
};
