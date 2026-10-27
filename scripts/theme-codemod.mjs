// Rewrites hardcoded Tailwind colour classes to the theme ramps defined in src/app/globals.css,
// so a file follows the light theme while the dark theme stays pixel-identical.
// See docs/light-theme-plan.md.
//
//   node scripts/theme-codemod.mjs [--dry] <file> [<file> ...]
//
// Rules:
// - slate-*, white, black -> tone-*; neutral-* -> ntone-* (any property). Exception: text-slate-950
//   stays — it is the dark text on solid emerald buttons and must remain dark in both themes.
// - emerald-* -> accent-*, red-* -> danger-*, rose-* -> alert-*, amber-* -> warn-*, sky-* -> info-*,
//   cyan-* -> aqua-*, blue-* -> azure-*, for every property except bg-*: solid buttons and tinted
//   backgrounds read fine on both themes.
// Variant prefixes (hover:, sm:, ...) and opacity modifiers (/10, /[0.03]) are kept as written.
// After running: switch knobs (`rounded-full bg-white shadow` + translate-x) must stay white in both
// themes — change their `bg-tone-white` back to `bg-white` by hand.
import fs from "node:fs";

const RAMPS = { emerald: "accent", red: "danger", rose: "alert", amber: "warn", sky: "info", cyan: "aqua", blue: "azure" };
const PROPS =
  "bg|text|border(?:-[trblxy])?|from|via|to|ring|ring-offset|fill|stroke|shadow|divide|outline|placeholder|decoration|caret";
const CLASS = new RegExp(
  `(?<![\\w-])((?:[a-z0-9-]+:)*)(${PROPS})-(white|black|slate|neutral|emerald|red|rose|amber|sky|cyan|blue)((?:-\\d{2,3})?)((?:\\/\\[?[\\d.]+\\]?)?)(?![\\w-])`,
  "g",
);

export function rewrite(source) {
  let count = 0;
  const out = source.replace(CLASS, (match, variants, prop, color, shade, opacity) => {
    let next;
    if (color === "white" || color === "black") next = `tone-${color}`;
    else if (color === "slate") {
      if (prop === "text" && shade === "-950") return match;
      next = `tone${shade}`;
    } else if (color === "neutral") {
      next = `ntone${shade}`;
    } else {
      if (prop === "bg") return match;
      next = `${RAMPS[color]}${shade}`;
    }
    count += 1;
    return `${variants}${prop}-${next}${opacity}`;
  });
  return { out, count };
}

const args = process.argv.slice(2);
const dry = args.includes("--dry");
let total = 0;
for (const file of args.filter((a) => a !== "--dry")) {
  const source = fs.readFileSync(file, "utf8");
  const { out, count } = rewrite(source);
  total += count;
  if (!dry && out !== source) fs.writeFileSync(file, out);
  console.log(`${String(count).padStart(4)}  ${file}`);
}
console.log(`${String(total).padStart(4)}  total${dry ? " (dry run)" : ""}`);
