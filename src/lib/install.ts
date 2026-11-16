// Asking people to install Dreddi on the phone (PWA), only after something useful happened: they created
// a promise or saw a verdict. Closing the banner hides it for good.

const USEFUL_KEY = "dreddi:install-useful";
const DISMISSED_KEY = "dreddi:install-dismissed";

const read = (key: string) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string) => {
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // Private mode or blocked storage: the banner just won't come.
  }
};

export const markUseful = () => {
  if (typeof window === "undefined" || read(USEFUL_KEY)) return;
  write(USEFUL_KEY);
  window.dispatchEvent(new Event("dreddi-useful"));
};
export const wasUseful = () => read(USEFUL_KEY) === "1";
export const dismissInstall = () => write(DISMISSED_KEY);
export const installDismissed = () => read(DISMISSED_KEY) === "1";

export const isInstalled = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

// Safari on iPhone: the only browser there with «На початковий екран» we can point to. In-app browsers
// (Telegram, Instagram) and Chrome on iPhone are left out.
export const isIosSafari = () => {
  const ua = navigator.userAgent;
  return /iPhone|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|Telegram|Instagram|FBAN|FBAV/.test(ua);
};

// Chrome on Android offers installing through this event; the inline script in the root layout keeps it,
// since it can fire before React is up.
export type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
export const savedInstallPrompt = () =>
  (window as Window & { __dreddiInstallPrompt?: InstallPromptEvent }).__dreddiInstallPrompt ?? null;

export const installPromptScript = `window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__dreddiInstallPrompt=e;window.dispatchEvent(new Event("dreddi-installable"))});`;
