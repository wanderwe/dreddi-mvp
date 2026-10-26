export type Theme = "light" | "dark";

// Light is the default for everyone; the OS colour scheme is deliberately not followed.
export const DEFAULT_THEME: Theme = "light";

// Same name for localStorage and the cookie; the cookie lets the server render the saved theme.
export const THEME_STORAGE_KEY = "dreddi-theme";

// Browser UI colour (mobile address bar) per theme; matches --surface-page in globals.css.
export const THEME_COLORS: Record<Theme, string> = {
  light: "#f6f8fb",
  dark: "#070a10",
};

// Embeds live on other people's sites and stay dark until they get their own theme option.
export const isThemeExcludedPath = (pathname: string | null) => /(^|\/)embed(\/|$)/.test(pathname ?? "");

// Anything other than an explicit "dark" (nothing saved, or the old "system" value) is light.
export const parseTheme = (value: string | null | undefined): Theme =>
  value === "dark" ? "dark" : DEFAULT_THEME;

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[theme]);
}

export function saveTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage can be blocked; the cookie below still carries the choice.
  }
  document.cookie = `${THEME_STORAGE_KEY}=${theme}; path=/; max-age=31536000; samesite=lax`;
}

// Runs in <head> before the first paint, so a visitor whose choice is only in localStorage never sees a flash.
// Kept dependency-free and in sync with parseTheme/applyTheme above.
export const themeInitScript = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var p=null;try{p=localStorage.getItem(k)}catch(e){}if(!p){var m=document.cookie.match(new RegExp('(?:^|; )'+k+'=([^;]+)'));p=m&&m[1]}var t=p==='dark'?'dark':${JSON.stringify(DEFAULT_THEME)};document.documentElement.dataset.theme=t;var c=${JSON.stringify(THEME_COLORS)};var mc=document.querySelector('meta[name="theme-color"]');if(mc)mc.setAttribute('content',c[t])}catch(e){}})();`;
