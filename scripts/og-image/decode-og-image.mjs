import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const base64Path = path.join(import.meta.dirname, 'og.png.b64');
const outputPath = path.join(repoRoot, 'og.png');

const base64 = fs.readFileSync(base64Path, 'utf8').replace(/\s+/g, '');
const buffer = Buffer.from(base64, 'base64');
fs.writeFileSync(outputPath, buffer);

console.log(`Wrote ${outputPath}`);
