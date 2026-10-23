// Ritar appikonerna: "K" i varm off-white på debt-platta (färger ur kvitt.css, ljust tema). Kör: npm run icons
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

const PLATE = '#B8370C';
const INK = '#F4F1EA';

// K ritad på ett 100×100-rutnät. scale = andel av ytan (maskable behöver säker zon).
function svg(size, scale, rounded = 0) {
  const s = size * scale;
  const o = (size - s) / 2;
  const p = (x, y) => `${(o + (x * s) / 100).toFixed(2)} ${(o + (y * s) / 100).toFixed(2)}`;
  const poly = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${p(x, y)}`).join('') + 'Z';
  const stem = poly([[26, 20], [43, 20], [43, 80], [26, 80]]);
  const upper = poly([[43, 52], [66, 20], [86, 20], [58, 58]]);
  const lower = poly([[50, 49], [88, 80], [67, 80], [43, 58]]);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${rounded}" fill="${PLATE}"/>
    <path d="${stem}${upper}${lower}" fill="${INK}"/>
  </svg>`;
}

const out = [
  ['apple-touch-icon.png', 180, 1.0],
  ['icon-192.png', 192, 1.0],
  ['icon-512.png', 512, 1.0],
  ['icon-maskable-512.png', 512, 0.78],
];

await mkdir('public', { recursive: true });
for (const [name, size, scale] of out) {
  await sharp(Buffer.from(svg(size, scale))).png().toFile(`public/${name}`);
}
await writeFile('public/favicon.svg', svg(64, 1.0, 14));
console.log('Ikoner klara.');
