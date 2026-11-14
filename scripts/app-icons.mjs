// App icons for the installable site (PWA) from the new logo, public/dreddi-logo.svg.
// Square and full-bleed: the phone rounds the corners itself. The maskable one keeps the D inside the
// central 80% circle, since Android may crop the icon to a circle or a squircle.
// Run: node scripts/app-icons.mjs
import { readFileSync, mkdirSync } from "node:fs";
import sharp from "sharp";

const source = readFileSync("public/dreddi-logo.svg", "utf8").replace(/ rx="14"/g, "");
const withGlyphScale = (scale) => source.replace("scale(0.8)", `scale(${scale})`);

const icons = [
  { file: "public/icons/icon-192.png", size: 192, svg: source },
  { file: "public/icons/icon-512.png", size: 512, svg: source },
  { file: "public/icons/icon-maskable-512.png", size: 512, svg: withGlyphScale(0.62) },
];

mkdirSync("public/icons", { recursive: true });
for (const icon of icons) {
  await sharp(Buffer.from(icon.svg), { density: 600 }).resize(icon.size, icon.size).png().toFile(icon.file);
  console.log(icon.file);
}
