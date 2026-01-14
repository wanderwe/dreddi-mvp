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
