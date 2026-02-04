type PublicProfileIdentityInput = {
  displayName?: string | null;
  handle?: string | null;
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
}: PublicProfileIdentityInput): PublicProfileIdentity => {
  const normalizedDisplayName = normalizeValue(displayName);
  const normalizedHandle = normalizeValue(handle);
  let title = "";
  let subtitle: string | undefined;

  if (normalizedDisplayName) {
    title = normalizedDisplayName;
  } else if (normalizedHandle) {
    title = `@${normalizedHandle}`;
  }

  if (normalizedDisplayName && normalizedHandle) {
    subtitle = `@${normalizedHandle}`;
  }

  if (subtitle && subtitle === title) {
    subtitle = undefined;
  }

  return { title, subtitle, maskedEmail: maskedEmail || undefined };
};
