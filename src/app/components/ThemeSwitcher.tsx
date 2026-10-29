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

// Shared by the guest header button and the segment in profile settings.
export function useThemeToggle() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => DEFAULT_THEME);

  const set = (next: Theme) => {
    saveTheme(next);
    applyTheme(next);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  };

  return { theme, set, toggle: () => set(theme === "dark" ? "light" : "dark") };
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

const THEMES: Theme[] = ["light", "dark"];

// Light | Dark segment in the profile settings header (signed-in users); icons only on narrow screens.
export function ThemeSegment({ className = "" }: { className?: string }) {
  const t = useT();
  const { theme, set } = useThemeToggle();

  if (!LIGHT_THEME_ENABLED) return null;

  return (
    <div
      role="radiogroup"
      aria-label={t("nav.theme.options.label")}
      className={`inline-flex shrink-0 rounded-lg border border-tone-white/10 p-0.5 ${className}`}
    >
      {THEMES.map((option) => {
        const active = theme === option;
        const label = t(`nav.theme.options.${option}`);
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            onClick={() => set(option)}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300/40 ${
              active ? "bg-tone-white/10 text-tone-white" : "text-tone-400 hover:text-tone-200"
            }`}
          >
            {ICONS[option]}
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
