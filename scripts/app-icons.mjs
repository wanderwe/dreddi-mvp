// App icons and iPhone launch images for the installable site (PWA), from the new logo,
// public/dreddi-logo.svg.
// - icon-192/512: rounded corners on a transparent background. Samsung Internet shows this one on its
//   launch screen (with the name under it), and a square one got a white plate around it.
// - icon-maskable-512: square and full-bleed, the D inside the central 80% circle: Android 12+ crops it
//   to the phone's icon shape itself.
// - public/splash/*: iPhone launch screens (Apple wants one image per screen size): the icon with
//   «Dreddi» under it on the light page colour, like Samsung's.
// - src/app/favicon.ico: the browser-tab icon from src/app/icon.svg (the light theme's mark), 16, 32 and
//   48 px, as PNGs inside an .ico (every current browser reads that).
// Run: node scripts/app-icons.mjs
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const logo = readFileSync("public/dreddi-logo.svg", "utf8");
const square = logo.replace(/ rx="14"/g, "");
const withGlyphScale = (svg, scale) => svg.replace("scale(0.8)", `scale(${scale})`);
const render = (svg, size, file) =>
  sharp(Buffer.from(svg), { density: 600 }).resize(size, size).png().toFile(file).then(() => console.log(file));

mkdirSync("public/icons", { recursive: true });
await render(logo, 192, "public/icons/icon-192.png");
await render(logo, 512, "public/icons/icon-512.png");
await render(withGlyphScale(square, 0.62), 512, "public/icons/icon-maskable-512.png");

// iPhone screens in CSS points and pixel ratio, portrait. The list in src/app/layout.tsx is built
// from this same file name pattern.
export const SPLASH_SCREENS = [
  [440, 956, 3], // 16 Pro Max
  [402, 874, 3], // 16 Pro
  [430, 932, 3], // 14–16 Pro Max, 15–16 Plus
  [393, 852, 3], // 14–16 Pro, 15–16
  [428, 926, 3], // 12–13 Pro Max, 14 Plus
  [390, 844, 3], // 12–14, 12–13 Pro
  [375, 812, 3], // X, XS, 11 Pro, 12–13 mini
  [414, 896, 3], // XS Max, 11 Pro Max
  [414, 896, 2], // XR, 11
  [375, 667, 2], // 8, SE 2 and 3
];

const BACKGROUND = "#f6f8fb"; // THEME_COLORS.light
const TEXT = "#1e293b";

mkdirSync("public/splash", { recursive: true });
for (const [width, height, ratio] of SPLASH_SCREENS) {
  const w = width * ratio;
  const h = height * ratio;
  const icon = Math.round(96 * ratio);
  const top = Math.round(h / 2 - icon * 0.75);
  const iconPng = await sharp(Buffer.from(logo), { density: 600 }).resize(icon, icon).png().toBuffer();
  const label = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${Math.round(40 * ratio)}">
      <text x="50%" y="${Math.round(28 * ratio)}" text-anchor="middle" font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
        font-size="${Math.round(24 * ratio)}" font-weight="500" fill="${TEXT}">Dreddi</text>
    </svg>`
  );
  const file = `public/splash/apple-splash-${w}x${h}.png`;
  await sharp({ create: { width: w, height: h, channels: 4, background: BACKGROUND } })
    .composite([
      { input: iconPng, left: Math.round((w - icon) / 2), top },
      { input: label, left: 0, top: top + icon + Math.round(20 * ratio) },
    ])
    .png({ compressionLevel: 9 })
    .toFile(file);
  console.log(file);
}

// favicon.ico: an ICO header and directory, then the PNG images as they are.
const tabIcon = readFileSync("src/app/icon.svg");
const sizes = [16, 32, 48];
const pngs = await Promise.all(sizes.map((size) => sharp(tabIcon, { density: 600 }).resize(size, size).png().toBuffer()));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((size, i) => {
  const entry = 6 + 16 * i;
  header.writeUInt8(size, entry);
  header.writeUInt8(size, entry + 1);
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(pngs[i].length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += pngs[i].length;
});
writeFileSync("src/app/favicon.ico", Buffer.concat([header, ...pngs]));
console.log("src/app/favicon.ico");
