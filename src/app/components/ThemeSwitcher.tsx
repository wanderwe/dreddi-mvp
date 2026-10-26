"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { IconButton } from "@/app/components/ui/IconButton";
import { Tooltip } from "@/app/components/ui/Tooltip";
import { LIGHT_THEME_ENABLED } from "@/lib/features";
import { useT } from "@/lib/i18n/I18nProvider";
import { DEFAULT_THEME, type Theme, applyTheme, parseTheme, saveTheme } from "@/lib/theme";

// The header renders several switchers (desktop and mobile); this event keeps them in sync.
const THEME_CHANGE_EVENT = "dreddi-theme-change";

const subscribe = (onChange: () => void) => {
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, onChange);
};

const readTheme = (): Theme => parseTheme(document.documentElement.dataset.theme);

const ICONS: Record<Theme, React.ReactNode> = {
  light: <Sun className="h-4 w-4" aria-hidden />,
  dark: <Moon className="h-4 w-4" aria-hidden />,
};

// Shared by the header button and the profile settings switch.
export function useThemeToggle() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => DEFAULT_THEME);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    saveTheme(next);
    applyTheme(next);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  };

  return { theme, toggle };
}

function ThemeSwitcherButton() {
  const t = useT();
  const { theme, toggle } = useThemeToggle();

  const label = t("nav.theme.current", { theme: t(`nav.theme.${theme}`) });

  return (
    <Tooltip label={label} placement="top-right">
      <IconButton onClick={toggle} ariaLabel={label} icon={ICONS[theme]} />
    </Tooltip>
  );
}

export function ThemeSwitcher() {
  return LIGHT_THEME_ENABLED ? <ThemeSwitcherButton /> : null;
}
