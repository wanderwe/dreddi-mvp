export type Theme = "light" | "dark";
export type ThemePreference = Theme | "system";

export const THEME_PREFERENCES: ThemePreference[] = ["system", "light", "dark"];

// Same name for localStorage and the cookie; the cookie lets the server render the saved theme.
export const THEME_STORAGE_KEY = "dreddi-theme";

// Browser UI colour (mobile address bar) per theme; matches --surface-page in globals.css.
export const THEME_COLORS: Record<Theme, string> = {
  light: "#f6f8fb",
  dark: "#070a10",
};

// Embeds live on other people's sites and stay dark until they get their own theme option.
export const isThemeExcludedPath = (pathname: string | null) => /(^|\/)embed(\/|$)/.test(pathname ?? "");

export const parseThemePreference = (value: string | null | undefined): ThemePreference =>
  value === "light" || value === "dark" ? value : "system";

export const resolveTheme = (preference: ThemePreference): Theme => {
  if (preference !== "system") return preference;
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export function applyTheme(preference: ThemePreference) {
  const theme = resolveTheme(preference);
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.themePreference = preference;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[theme]);
}

export function saveThemePreference(preference: ThemePreference) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Storage can be blocked; the cookie below still carries the choice.
  }
  document.cookie = `${THEME_STORAGE_KEY}=${preference}; path=/; max-age=31536000; samesite=lax`;
}

// Runs in <head> before the first paint, so a light-theme visitor never sees a dark flash.
// Kept dependency-free and in sync with resolveTheme/applyTheme above.
export const themeInitScript = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var p=null;try{p=localStorage.getItem(k)}catch(e){}if(!p){var m=document.cookie.match(new RegExp('(?:^|; )'+k+'=([^;]+)'));p=m&&m[1]}if(p!=='light'&&p!=='dark')p='system';var t=p==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):p;var d=document.documentElement;d.dataset.theme=t;d.dataset.themePreference=p;var c=${JSON.stringify(THEME_COLORS)};var mc=document.querySelector('meta[name="theme-color"]');if(mc)mc.setAttribute('content',c[t])}catch(e){}})();`;
