// Ritar appikonerna: ordmärket "K●" på mörk platta. Färgerna kommer ur kvitt.css (mörkt tema).
// Kör: npm run icons
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

const PLATE = '#0B0B0C'; // --bg (mörkt)
const INK = '#F2EFE8'; // --text (mörkt)
const DOT = '#FF7A55'; // --debt (mörkt)

// K som en enda sammanhängande kontur (stam + två ben), 64 × 60 enheter.
const K = [[0, 0], [17, 0], [17, 26], [40, 0], [62, 0], [33, 31], [64, 60], [41, 60], [17, 35], [17, 60], [0, 60]];
const CAP = 60;
const DOT_R = CAP * 0.19; // punktens radie
// Punkten vilar på baslinjen och tangerar högra benets sneda kant, från (33,31) till (64,60).
// Avståndet från centrum till kanten ska vara radien: cx = 64 + r·(längd − dx)/dy ≈ 64 + 0,395·r.
const LEG = { dx: 31, dy: 29 };
const LEG_LEN = Math.hypot(LEG.dx, LEG.dy);
const DOT_CX = 64 + (DOT_R * (LEG_LEN - LEG.dx)) / LEG.dy;
const MARK_W = DOT_CX + DOT_R; // hela märkets bredd

// share = märkets bredd som andel av ikonen (maskable behöver större marginal).
function svg(size, share, radius = 0) {
  const k = (size * share) / MARK_W; // enheter -> pixlar
  const ox = (size - MARK_W * k) / 2;
  const oy = (size - CAP * k) / 2;
  const pts = K.map(([x, y]) => `${(ox + x * k).toFixed(2)},${(oy + y * k).toFixed(2)}`).join(' ');
  const cx = ox + DOT_CX * k;
  const cy = oy + (CAP - DOT_R) * k;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${radius}" fill="${PLATE}"/>
    <polygon points="${pts}" fill="${INK}"/>
    <circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${(DOT_R * k).toFixed(2)}" fill="${DOT}"/>
  </svg>`;
}

const out = [
  ['apple-touch-icon.png', 180, 0.56],
  ['icon-192.png', 192, 0.56],
  ['icon-512.png', 512, 0.56],
  ['icon-maskable-512.png', 512, 0.42],
];

await mkdir('public', { recursive: true });
for (const [name, size, share] of out) {
  await sharp(Buffer.from(svg(size, share))).png().toFile(`public/${name}`);
}
await writeFile('public/favicon.svg', svg(64, 0.56, 14));
console.log('Ikoner klara.');
