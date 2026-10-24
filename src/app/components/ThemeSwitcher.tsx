"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { IconButton } from "@/app/components/ui/IconButton";
import { Tooltip } from "@/app/components/ui/Tooltip";
import { LIGHT_THEME_ENABLED } from "@/lib/features";
import { useT } from "@/lib/i18n/I18nProvider";
import {
  THEME_PREFERENCES,
  type ThemePreference,
  applyTheme,
  parseThemePreference,
  saveThemePreference,
} from "@/lib/theme";

// The header renders several switchers (desktop and mobile); this event keeps them in sync.
const THEME_CHANGE_EVENT = "dreddi-theme-change";

const subscribe = (onChange: () => void) => {
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, onChange);
};

const readPreference = (): ThemePreference =>
  parseThemePreference(document.documentElement.dataset.themePreference);

const ICONS: Record<ThemePreference, React.ReactNode> = {
  system: <Monitor className="h-4 w-4" aria-hidden />,
  light: <Sun className="h-4 w-4" aria-hidden />,
  dark: <Moon className="h-4 w-4" aria-hidden />,
};

function ThemeSwitcherButton() {
  const t = useT();
  const preference = useSyncExternalStore(subscribe, readPreference, () => "system" as const);

  // While following the system, react to the OS switching between light and dark.
  useEffect(() => {
    if (preference !== "system") return undefined;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const follow = () => applyTheme("system");
    media.addEventListener("change", follow);
    return () => media.removeEventListener("change", follow);
  }, [preference]);

  const cycle = () => {
    const next = THEME_PREFERENCES[(THEME_PREFERENCES.indexOf(preference) + 1) % THEME_PREFERENCES.length];
    saveThemePreference(next);
    applyTheme(next);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  };

  const label = t("nav.theme.current", { theme: t(`nav.theme.${preference}`) });

  return (
    <Tooltip label={label} placement="top-right">
      <IconButton onClick={cycle} ariaLabel={label} icon={ICONS[preference]} />
    </Tooltip>
  );
}

export function ThemeSwitcher() {
  return LIGHT_THEME_ENABLED ? <ThemeSwitcherButton /> : null;
}
