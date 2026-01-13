export type FormatDueDateOptions = {
  includeYear?: boolean;
};

export const formatDueDate = (
  value: string | null,
  locale: string,
  options: FormatDueDateOptions = {}
) => {
  if (!value) return null;

  const { includeYear = true } = options;
  const formatOptions: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };

  if (includeYear) {
    formatOptions.year = "numeric";
  }

  try {
    return new Intl.DateTimeFormat(locale, formatOptions).format(new Date(value));
  } catch {
    return value;
  }
};
