// Ritar ikonerna ur en SVG. Kör: npm run icons
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

const BG = '#0B0B0C';
const INK = '#F1EEE8';
const EVIL = '#FF7D5A';
const GOOD = '#5CCB95';

// Våg i balans, lätt lutad åt vänster (skuld). scale = andel av ytan som mönstret får (maskable behöver marginal).
function svg(size, scale) {
  const s = size * scale;
  const o = (size - s) / 2;
  const u = s / 100;
  const px = (x) => o + x * u;
  const py = (y) => o + y * u;
  const a = -9 * (Math.PI / 180);
  const cx = 50, cy = 38, half = 36;
  const lx = cx - half * Math.cos(a), ly = cy - half * Math.sin(a);
  const rx = cx + half * Math.cos(a), ry = cy + half * Math.sin(a);
  const pan = (x, y, color) => `
    <line x1="${px(x)}" y1="${py(y)}" x2="${px(x - 9)}" y2="${py(y + 20)}" stroke="${INK}" stroke-opacity=".55" stroke-width="${u * 0.8}"/>
    <line x1="${px(x)}" y1="${py(y)}" x2="${px(x + 9)}" y2="${py(y + 20)}" stroke="${INK}" stroke-opacity=".55" stroke-width="${u * 0.8}"/>
    <path d="M ${px(x - 11)} ${py(y + 20)} H ${px(x + 11)} Q ${px(x + 9)} ${py(y + 27)} ${px(x)} ${py(y + 27)} Q ${px(x - 9)} ${py(y + 27)} ${px(x - 11)} ${py(y + 20)} Z" fill="${color}" fill-opacity=".22" stroke="${color}" stroke-width="${u * 1.6}" stroke-linejoin="round"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="${BG}"/>
    <path d="M ${px(cx - 2)} ${py(cy + 3)} L ${px(cx - 5)} ${py(84)} L ${px(cx + 5)} ${py(84)} L ${px(cx + 2)} ${py(cy + 3)} Z" fill="${INK}" fill-opacity=".14" stroke="${INK}" stroke-opacity=".5" stroke-width="${u * 0.6}"/>
    <rect x="${px(cx - 17)}" y="${py(83)}" width="${u * 34}" height="${u * 2.4}" rx="${u * 1.2}" fill="${INK}" fill-opacity=".5"/>
    <line x1="${px(lx)}" y1="${py(ly)}" x2="${px(rx)}" y2="${py(ry)}" stroke="${INK}" stroke-width="${u * 2.6}" stroke-linecap="round"/>
    ${pan(lx, ly, EVIL)}
    ${pan(rx, ry, GOOD)}
    <circle cx="${px(cx)}" cy="${py(cy)}" r="${u * 3.6}" fill="${BG}" stroke="${INK}" stroke-width="${u * 1.4}"/>
    <circle cx="${px(cx)}" cy="${py(cy)}" r="${u * 1.1}" fill="${INK}"/>
  </svg>`;
}

const out = [
  ['apple-touch-icon.png', 180, 0.88],
  ['icon-192.png', 192, 0.88],
  ['icon-512.png', 512, 0.88],
  ['icon-maskable-512.png', 512, 0.62],
];

await mkdir('public', { recursive: true });
for (const [name, size, scale] of out) {
  await sharp(Buffer.from(svg(size, scale))).png().toFile(`public/${name}`);
}
await writeFile('public/favicon.svg', svg(64, 0.92));
console.log('Ikoner klara.');
