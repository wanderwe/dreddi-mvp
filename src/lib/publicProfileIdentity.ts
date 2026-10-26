type PublicProfileIdentityInput = {
  displayName?: string | null;
  handle?: string | null;
};

type PublicProfileIdentity = {
  title: string;
  subtitle?: string;
};

const normalizeValue = (value?: string | null) => value?.trim() ?? "";

// Early profiles were created with display_name = email, so treat any
// email-shaped name as missing to keep addresses off public surfaces.
export const isEmailLike = (value?: string | null) => /\S+@\S+\.\S+/.test(value ?? "");

export const toPublicDisplayName = (displayName?: string | null): string | null => {
  const normalized = normalizeValue(displayName);
  if (!normalized || isEmailLike(normalized)) return null;
  return normalized;
};

export const getPublicProfileIdentity = ({
  displayName,
  handle,
}: PublicProfileIdentityInput): PublicProfileIdentity => {
  const publicDisplayName = toPublicDisplayName(displayName) ?? "";
  const normalizedHandle = normalizeValue(handle);
  let title = "";
  let subtitle: string | undefined;

  if (publicDisplayName) {
    title = publicDisplayName;
  } else if (normalizedHandle) {
    title = `@${normalizedHandle}`;
  }

  if (publicDisplayName && normalizedHandle) {
    subtitle = `@${normalizedHandle}`;
  }

  if (subtitle && subtitle === title) {
    subtitle = undefined;
  }

  return { title, subtitle };
};
