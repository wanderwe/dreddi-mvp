const envFlag = process.env.NEXT_PUBLIC_SHOW_BETA_UI ?? process.env.NEXT_PUBLIC_BETA;

const parseBooleanFlag = (value: string | undefined, defaultValue: boolean): boolean => {
  if (value === undefined) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return defaultValue;
};

export const productFlags = {
  showBetaUi: parseBooleanFlag(envFlag, false),
} as const;
