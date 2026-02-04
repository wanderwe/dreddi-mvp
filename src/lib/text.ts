export const stripTrailingPeriod = (text: string) => {
  const trimmed = text.trimEnd();

  if (!trimmed.endsWith(".")) {
    return text;
  }

  const withoutPeriod = trimmed.slice(0, -1);

  if (/[.!?]/.test(withoutPeriod)) {
    return text;
  }

  return withoutPeriod;
};

export const maskEmail = (email: string) => {
  const trimmed = email.trim();
  const atIndex = trimmed.indexOf("@");

  if (atIndex <= 0 || atIndex === trimmed.length - 1) {
    return trimmed;
  }

  const localPart = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);

  return `${localPart.slice(0, 3)}***@${domain}`;
};
