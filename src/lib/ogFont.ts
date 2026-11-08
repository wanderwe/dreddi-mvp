// Shared by the OG image routes.
// The default image font has no Cyrillic, so Inter comes from Google Fonts: Geist, the site font, spaces
// Cyrillic words unevenly here. The whole font, not a cut to the drawn text. Loaded once per server instance.
const fontCache = new Map<number, Promise<ArrayBuffer>>();
export function loadFont(weight: number) {
  const cached = fontCache.get(weight);
  if (cached) return cached;
  const font = fetch(`https://fonts.googleapis.com/css2?family=Inter:wght@${weight}`)
    .then((res) => res.text())
    .then((css) => {
      const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
      if (!url) throw new Error("Font not found");
      return fetch(url).then((res) => res.arrayBuffer());
    });
  font.catch(() => fontCache.delete(weight));
  fontCache.set(weight, font);
  return font;
}
