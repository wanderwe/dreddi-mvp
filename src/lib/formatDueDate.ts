export type FormatDueDateOptions = {
  includeYear?: boolean;
  includeTime?: boolean;
};

export const formatDueDate = (
  value: string | null,
  locale: string,
  options: FormatDueDateOptions = {}
) => {
  if (!value) return null;

  const { includeYear = true, includeTime = false } = options;

  const dateOptions: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };

  if (includeYear) {
    dateOptions.year = "numeric";
  }

  try {
    const date = new Date(value);
    const dateText = new Intl.DateTimeFormat(locale, dateOptions).format(date);
    if (!includeTime) {
      return dateText;
    }
    const timeText = new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
    return `${dateText}, ${timeText}`;
  } catch {
    return value;
  }
};
