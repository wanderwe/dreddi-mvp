import { maskEmail } from "@/lib/text";

type PublicProfileIdentityInput = {
  displayName?: string | null;
  handle?: string | null;
  email?: string | null;
};

type PublicProfileIdentity = {
  title: string;
  subtitle?: string;
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
  const fallbackEmail =
    normalizedEmail || (normalizedDisplayName.includes("@") ? normalizedDisplayName : "");
  const maskedEmail = fallbackEmail ? maskEmail(fallbackEmail) : "";
  const displayNameIsEmail =
    normalizedDisplayName &&
    fallbackEmail &&
    normalizedDisplayName.toLowerCase() === fallbackEmail.toLowerCase();

  let title = "";
  let subtitle: string | undefined;
  let source: "displayName" | "handle" | "email" = "email";

  if (normalizedDisplayName && displayNameIsEmail && maskedEmail) {
    title = maskedEmail;
    source = "displayName";
  } else if (normalizedDisplayName) {
    title = normalizedDisplayName;
    source = "displayName";
  } else if (normalizedHandle) {
    title = `@${normalizedHandle}`;
    source = "handle";
  } else if (maskedEmail) {
    title = maskedEmail;
    source = "email";
  }

  if (source === "displayName") {
    subtitle = normalizedHandle ? `@${normalizedHandle}` : maskedEmail || undefined;
  } else if (source === "handle") {
    subtitle = maskedEmail || undefined;
  }

  if (subtitle && subtitle === title) {
    subtitle = undefined;
  }

  return { title, subtitle };
};
