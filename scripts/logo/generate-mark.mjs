/**
 * The small-size CryptoBay mark: the same violet "C" and the same three
 * ascending candlesticks as the full artwork, with the sun, water and palm
 * dropped.
 *
 * Authored on a 24-unit grid so one grid unit is one device pixel at the size
 * the sidebar renders — every edge lands on a pixel boundary. The full artwork
 * was measured at 24px first: the candle bodies fused into a single blob and
 * the palm disappeared, so detail is dropped deliberately rather than scaled
 * away.
 *
 * Emits one <path> per shape (the ring's gradient comes from a linearGradient
 * rather than per-pixel colour) so the result is small enough to inline in the
 * React component — no extra request, no flash of a missing logo.
 */
import { writeFileSync } from "node:fs";

const G = 24;
const RING_TOP = "#7059fb";
const RING_BOT = "#8f3ad9";

const CANDLES = [
  { x: 6, top: 12, bot: 16, wickTop: 10, wickBot: 17, c: "#b163f8" },
  { x: 10, top: 10, bot: 15, wickTop: 8, wickBot: 16, c: "#4d7cf3" },
  // wickTop 7, not 6: at 6 the wick landed on the ring's top-right arc.
  { x: 14, top: 8, bot: 14, wickTop: 7, wickBot: 15, c: "#2ecdf2" },
];

const CX = 11.5;
const CY = 12;
const R_OUT = 9.6;
const R_IN = 6.6;
const GAP = 0.62; // radians either side of due-east: the C's opening

/** Turns a set of "x,y" pixel keys into a compact path of merged runs. */
function toPath(keys) {
  const rows = new Map();
  for (const key of keys) {
    const [x, y] = key.split(",").map(Number);
    if (!rows.has(y)) rows.set(y, new Set());
    rows.get(y).add(x);
  }
  const parts = [];
  for (const y of [...rows.keys()].sort((a, b) => a - b)) {
    const xs = [...rows.get(y)].sort((a, b) => a - b);
    let i = 0;
    while (i < xs.length) {
      let w = 1;
      while (xs[i + w] === xs[i] + w) w++;
      parts.push(`M${xs[i]} ${y}h${w}v1h-${w}z`);
      i += w;
    }
  }
  return parts.join("");
}

// ------------------------------------------------------------------- shapes
const ring = new Set();
for (let y = 0; y < G; y++) {
  for (let x = 0; x < G; x++) {
    const dx = x + 0.5 - CX;
    const dy = y + 0.5 - CY;
    const r = Math.hypot(dx, dy);
    if (r < R_IN || r > R_OUT) continue;
    if (Math.abs(Math.atan2(dy, dx)) < GAP) continue;
    ring.add(`${x},${y}`);
  }
}

const candlePaths = CANDLES.map((c) => {
  const cells = new Set();
  // 1-unit wick, 3-unit body — both exact pixels at 24px.
  for (let y = c.wickTop; y <= c.wickBot; y++) cells.add(`${c.x + 1},${y}`);
  for (let y = c.top; y <= c.bot; y++) {
    for (let x = c.x; x < c.x + 3; x++) cells.add(`${x},${y}`);
  }
  return { d: toPath(cells), fill: c.c };
});

// --------------------------------------------------------------------- emit
const radius = (G * 0.22).toFixed(1);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${G} ${G}" shape-rendering="crispEdges">
<defs>
<linearGradient id="cbRing" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${RING_TOP}"/><stop offset="1" stop-color="${RING_BOT}"/>
</linearGradient>
<clipPath id="cbClip"><rect width="${G}" height="${G}" rx="${radius}" ry="${radius}"/></clipPath>
</defs>
<g clip-path="url(#cbClip)">
<path fill="url(#cbRing)" d="${toPath(ring)}"/>
${candlePaths.map((c) => `<path fill="${c.fill}" d="${c.d}"/>`).join("\n")}
</g>
</svg>`;

const out = process.argv[2] ?? "public/icon.svg";
writeFileSync(out, svg);
console.log(`${out}  ${svg.length} bytes  `);
