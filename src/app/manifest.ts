import type { MetadataRoute } from "next";
import { THEME_COLORS } from "@/lib/theme";

// Lets a phone install the site as an app (home screen icon, opens without the browser bar).
// One manifest for both languages: the start page sends each visitor to their own locale.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Dreddi",
    short_name: "Dreddi",
    // The site description from the link previews ([locale]/layout.tsx), already agreed.
    description:
      "Тримай слово перед іншими й перед собою. Фіксуй обіцянки і ставки в суперечках. Кожна виконана додає до репутації, якій довіряють.",
    lang: "uk",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: THEME_COLORS.light,
    theme_color: THEME_COLORS.light,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
