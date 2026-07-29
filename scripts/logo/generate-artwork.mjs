/**
 * Generates the CryptoBay pixel-art mark as SVG.
 *
 * Redraw of the pasted reference: violet "C" ring enclosing three ascending
 * candlesticks, a magenta sun, a shoreline and a palm tree, on a transparent
 * canvas. Emitted as a pixel grid of <rect>s so it stays crisp at any
 * multiple of the grid — 64 units divides 512 (x8) and 192 (x3) exactly.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const G = 64;

// ---------------------------------------------------------------- palette
const RING_TOP = "#7059fb";
const RING_BOT = "#8f3ad9";
const SUN_TOP = "#ff3d93";
const SUN_BOT = "#d4197a";
const PALM = "#221a4d";

const WATER = [
  // Flat bands, only lightly inset: the ring clip supplies the curve at the
  // ends, so insetting much per row turns the water into a lens.
  { dy: 0, inset: 2, c: "#2a2050" },
  { dy: 1, inset: 0, c: "#40306f" },
  { dy: 2, inset: 1, c: "#1e1739" },
  { dy: 3, inset: 4, c: "#2b2154" },
  { dy: 4, inset: 8, c: "#191331" },
];
const WATER_TOP = 43;

// The left candle stays violet rather than resolving to magenta: it sits
// directly above the pink sun, and sharing that hue fused the two shapes.
const CANDLES = [
  // Body x/width, body top/bottom, wick top/bottom, colour top -> bottom.
  { x: 24, w: 7, top: 24, bot: 32, wickTop: 20, wickBot: 35, c1: "#c07af9", c2: "#9243e6" },
  { x: 33, w: 7, top: 21, bot: 34, wickTop: 17, wickBot: 38, c1: "#5b86f7", c2: "#2b5fe0" },
  { x: 42, w: 7, top: 17, bot: 32, wickTop: 13, wickBot: 36, c1: "#2ed2f4", c2: "#1786db" },
];

// ---------------------------------------------------------------- helpers
const px = new Map(); // "x,y" -> colour; later writes win

function set(x, y, colour) {
  if (x < 0 || y < 0 || x >= G || y >= G) return;
  px.set(`${x},${y}`, colour);
}

function lerp(a, b, t) {
  const parse = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  const k = Math.max(0, Math.min(1, t));
  const m = (u, v) => Math.round(u + (v - u) * k);
  return `#${[m(r1, r2), m(g1, g2), m(b1, b2)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

// ---------------------------------------------------------------- the ring
const CX = 30;
const CY = 32;
const R_OUT = 25.5;
const R_IN = 18.5;
const GAP = 0.6; // radians either side of due-east — the C's opening

/** Ring, interior and open-gap tests, shared with the water clip below. */
function ringBand(x, y) {
  const dx = x + 0.5 - CX;
  const dy = y + 0.5 - CY;
  const r = Math.hypot(dx, dy);
  const inGap = Math.abs(Math.atan2(dy, dx)) < GAP;
  return { r, inGap, dx, dy };
}

for (let y = 0; y < G; y++) {
  for (let x = 0; x < G; x++) {
    const { r, inGap, dx, dy } = ringBand(x, y);
    if (r < R_IN || r > R_OUT || inGap) continue;
    // Diagonal gradient: cool violet top-left to purple bottom-right.
    set(x, y, lerp(RING_TOP, RING_BOT, (dx / R_OUT + dy / R_OUT + 2) / 4));
  }
}

// -------------------------------------------------------------- shoreline
// Drawn before the candles so their wicks pass in front of the water.
for (const band of WATER) {
  const y = WATER_TOP + band.dy;
  for (let x = 0; x < G; x++) {
    const { r, inGap } = ringBand(x, y);
    // Inside the ring only; the gap lets one band spill out to the right.
    if (r > R_IN && !(inGap && r <= R_OUT)) continue;
    if (x < CX - (R_IN - band.inset) || x > CX + (R_IN - band.inset)) continue;
    set(x, y, band.c);
  }
}

// -------------------------------------------------------------------- sun
const SUN_CX = 27;
const SUN_BASE = WATER_TOP - 1; // flat bottom rests on the horizon
const SUN_R = 6;
for (let y = SUN_BASE - Math.ceil(SUN_R); y <= SUN_BASE; y++) {
  for (let x = Math.floor(SUN_CX - SUN_R); x <= Math.ceil(SUN_CX + SUN_R); x++) {
    const dx = x + 0.5 - SUN_CX;
    const dy = y + 0.5 - (SUN_BASE + 1);
    if (Math.hypot(dx, dy) > SUN_R) continue;
    set(x, y, lerp(SUN_TOP, SUN_BOT, (y - (SUN_BASE - SUN_R)) / SUN_R));
  }
}

// ------------------------------------------------------------ candlesticks
for (const c of CANDLES) {
  const span = c.wickBot - c.wickTop;
  const at = (y) => lerp(c.c1, c.c2, (y - c.wickTop) / span);
  // 2px wick on a 7px body: thin enough to read as a wick at the grid's scale.
  const wickX = c.x + 2;
  for (let y = c.wickTop; y <= c.wickBot; y++) {
    set(wickX, y, at(y));
    set(wickX + 1, y, at(y));
  }
  for (let y = c.top; y <= c.bot; y++) {
    for (let x = c.x; x < c.x + c.w; x++) set(x, y, at(y));
  }
}

// ------------------------------------------------------------------- palm
// Drawn as arcs rather than a hand-typed grid: 1px diagonals broke into
// disconnected dots at this scale, so each frond is walked as a curve and
// stamped 2px thick. Sits over the ring's lower-right arc, where the trunk
// silhouettes against the violet.
const PALM_CX = 49;
const PALM_CY = 38; // crown, where the fronds meet the trunk

/** Fronds: launch angle (radians, screen coords) and length. */
const FRONDS = [
  [Math.PI * 1.14, 9],
  [Math.PI * 1.28, 8.5],
  [Math.PI * 1.42, 7],
  [Math.PI * 1.60, 7],
  [Math.PI * 1.74, 8.5],
  [Math.PI * 1.88, 9.5],
];
const DROOP = 0.055; // pulls the tips back down, which is what reads as a palm

for (const [angle, length] of FRONDS) {
  for (let t = 0; t <= length; t += 0.4) {
    const x = Math.round(PALM_CX + Math.cos(angle) * t);
    const y = Math.round(PALM_CY + Math.sin(angle) * t + DROOP * t * t);
    set(x, y, PALM);
    // Thicken downward so a frond never thins to a single stray pixel.
    set(x, y + 1, PALM);
  }
}

// Trunk: leans left as it descends, landing on the ring's lower-right arc.
for (let t = 0; t <= 11; t += 0.4) {
  const x = Math.round(PALM_CX - 0.16 * t - 0.028 * t * t);
  const y = Math.round(PALM_CY + t);
  set(x, y, PALM);
  set(x + 1, y, PALM);
}

// ------------------------------------------------------------------- emit
// Run-length merge along x: a few hundred rects instead of ~2400.
const rects = [];
for (let y = 0; y < G; y++) {
  let x = 0;
  while (x < G) {
    const colour = px.get(`${x},${y}`);
    if (!colour) {
      x++;
      continue;
    }
    let w = 1;
    while (px.get(`${x + w},${y}`) === colour) w++;
    rects.push(`<rect x="${x}" y="${y}" width="${w}" height="1" fill="${colour}"/>`);
    x += w;
  }
}

const radius = (G * 0.22).toFixed(2);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${G} ${G}" width="${G}" height="${G}" shape-rendering="crispEdges">
<defs><clipPath id="cb-clip"><rect width="${G}" height="${G}" rx="${radius}" ry="${radius}"/></clipPath></defs>
<g clip-path="url(#cb-clip)">
${rects.join("")}
</g>
</svg>`;

const out = process.argv[2] ?? "public/brand/logo.svg";
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, svg);
console.log(`${out}  ${rects.length} rects  ${svg.length} bytes`);
