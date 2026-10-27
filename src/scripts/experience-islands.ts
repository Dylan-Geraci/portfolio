// Experience islands: the Experience log laid out as a vertical sea, newest at the top.
// Each job is a pixel island, schools are landmarks on the shore, and the lifeguard rows
// between them. Docking at a stop opens its card.
//
// The cards are server-rendered (Experience.astro) and read as a plain list without JS.
// This script draws the map around them and adds body.isea-on to switch it on.

import { LIFEGUARD, LIFTER, eachOutlineCell } from "./sprites";

/* ========================================
   Sprites
   '.' empty, k ink, a accent, s sand, w paper. A 1px ink outline is added at draw time.
   o (ink) and b (accent) are thin details, like oars, that skip the outline.
   ======================================== */

type Rows = string[];

// Lifeguard from the waist up in a paper rowboat with a terracotta stripe, an oar out each side.
// tip = the row the oar blades reach: 12 is in the water, 6 is lifted clear; null leaves the boat empty.
const BOAT_W = 27, BOAT_H = 13;
function boatFrame(tip: number | null): Rows {
  const g = Array.from({ length: BOAT_H }, () => Array<string>(BOAT_W).fill("."));
  const oar = (r0: number, c0: number, r1: number, c1: number) => {
    const n = Math.max(Math.abs(r1 - r0), Math.abs(c1 - c0));
    for (let k = 0; k <= n; k++) g[Math.round(r0 + ((r1 - r0) * k) / n)][Math.round(c0 + ((c1 - c0) * k) / n)] = k >= n - 1 ? "b" : "o";
  };
  if (tip != null) {
    oar(7, 8, tip, 0);
    oar(7, 18, tip, 26);
  }
  const put = (rows: Rows, r0: number, c0: number) =>
    rows.forEach((r, k) => [...r].forEach((ch, c) => { if (ch !== ".") g[r0 + k][c0 + c] = ch; }));
  put(["wwwwwwwwwwwwwwwwwww", ".aaaaaaaaaaaaaaaaa.", "..wwwwwwwwwwwwwww.."], 9, 4);
  if (tip != null) put([...LIFEGUARD[0].slice(0, 8), "...aaaa...."], 0, 8);
  return g.map((r) => r.join(""));
}
// One stroke: catch, drive, recover, drive. Docked boats rest on frame 1; frame 3 is empty.
const BOAT = [12, 9, 6, null].map(boatFrame);
const STROKE = [0, 1, 2, 1];
const EMPTY = 3;

// On foot, rosy-cheeked and smiling: feet down, then mid-skip with the legs tucked and a hand in the air
const HAPPY = LIFEGUARD[0].map((r, k) => (k === 4 ? "..askksa..." : r));
const WALKER = [HAPPY, [
  ...HAPPY.slice(0, 5), ".s.ssss....", ".saaaaaa...", "...aaaa.s..", "...aaaa.aaa", "....ss..aaa", "....ss.....", "...kkk.....",
]];

/* ========================================
   Islands
   Each island is a sand mound sized by tenure, with one signature prop and at most one
   small extra. Current roles fly a flag. Props stand where the mound is under their feet.
   ======================================== */

// Island colours on top of the crew palette: g grass, l leaf, t wood, m gym mat, y lamp glow,
// u screen blue, c chalkboard. v (leaf) and f (glow) are thin details that skip the outline.
const PROPS: Record<string, Rows> = {
  // Internet Brands: office with lit windows and an antenna, and a wooden dock for the boat
  office: [
    ".....b.....", ".....o.....", "..kkkkkkk..", "..wywywyw..", "..wwwwwww..",
    "..wywywyw..", "..wwwwwww..", "..wywtwyw..", "..wwwtwww..",
  ],
  bush: [".ll.", "llll"],
  dock: ["ttttttttt", ".o...o..o"],
  // Mindful Metrics: market stall with a striped awning and goods out, crates beside it
  stall: [
    "awawawawaw", "awawawawaw", ".o......o.", ".o.yaul.o.",
    "tttttttttt", ".twwwwwwt.", ".twwwwwwt.",
  ],
  crates: ["..ttt..", "..tkt..", "..ttt..", "ttt.ttt", "tkt.tkt", "ttt.ttt"],
  // Crete Robotics: a boxy robot with one glowing eye, and a palm
  robot: [
    "...b...", "...o...", ".wwwww.", ".wwuww.", ".wwwww.",
    "..www..", "owwwwwo", ".wayaw.", ".wwwww.", ".w...w.",
  ],
  palm: ["..l.l..", ".lllll.", "ll.t.ll", "l..t..l", "...t...", "....t..", "....t..", "...t..."],
  // Yembo: the museum light wall glowing in three colours, with a mic for the speech pipeline
  lightwall: ["kkkkkkkkk", "kayuyauyk", "kuyayuayk", "kyauayuak", "kkkkkkkkk", "..o...o..", "..o...o.."],
  mic: ["kk.", "kk.", ".o.", ".o.", ".o.", "ooo"],
  // CSUF Research: a camera on a pole watching a pot on a lit stove
  camera: ["kkkk.", "kkkku", "o....", "o....", "o....", "o....", "o....", "o...."],
  pot: ["...kk...", ".kkkkkk.", "kwwwwwwk", ".wwwwww.", ".wwwwww.", ".ayayay.", ".o....o."],
  // Project RAISE: a wooden signpost pointing three ways, one path in terracotta
  signpost: [
    ".....t......", ".....twwwww.", ".....twwwwww", ".....twwwww.",
    ".wwwwwt.....", "wwwwwwt.....", ".wwwwwt.....",
    ".....taaaa..", ".....taaaaa.", ".....taaaa..", ".....t......", ".....t......",
  ],
  // Day of AI: a chalkboard on a wooden easel with a lightbulb drawn on it
  easel: [
    "ttttttttt", "tcccyccct", "tccyyycct", "tcccyccct", "tcccwccct", "ttttttttt",
    ".t.....t.", "t.......t",
  ],
  // ACM: club tent with a pennant, a laptop out front
  tent: [
    ".....oaa...", ".....oa....", ".....o.....", ".....a.....", "....awa....",
    "...awawa...", "..awawawa..", ".awawkwawa.", "awawakawawa",
  ],
  laptop: [".uuu.", ".uuu.", "kkkkk"],
  // 24 Hour Fitness: a squat rack on a gym mat, and the Lifter from the hero crew
  rack: [".w.......w.", ".w.......w.", "awooooooowa", "aw.......wa", ".w.......w.", ".w.......w.", "ww.......ww"],
  lifter: LIFTER[0],
};

interface IslandSpec {
  ground: "grass" | "sand";
  flowers?: boolean;
  /** A gym mat over [from, to) columns. */
  mat?: [number, number];
  /** [prop, column on the mound, "water" to stand at its foot] */
  props: [string, number, "water"?][];
}

// Keyed by the entry's `key` in content.ts. A key with no entry gets a plain sand mound.
const ISLANDS: Record<string, IslandSpec> = {
  "internet-brands": { ground: "grass", props: [["office", 8], ["bush", 19], ["dock", 24, "water"]] },
  "mindful-metrics": { ground: "sand", props: [["stall", 5], ["crates", 15]] },
  "csuf-research": { ground: "grass", props: [["camera", 2], ["pot", 8]] },
  "crete-robotics": { ground: "grass", flowers: true, props: [["robot", 3], ["palm", 11]] },
  "yembo": { ground: "sand", props: [["lightwall", 2], ["mic", 15]] },
  "project-raise": { ground: "grass", flowers: true, props: [["signpost", 6]] },
  "day-of-ai": { ground: "grass", flowers: true, props: [["easel", 5]] },
  "acm": { ground: "grass", props: [["tent", 4], ["laptop", 16]] },
  "24-hour-fitness": { ground: "grass", mat: [3, 28], props: [["rack", 3], ["lifter", 14]] },
};

// "Still sailing": a terracotta flag, two frames so it flutters
const FLAG = [["oaaa", "oaa.", "o...", "o...", "o..."], ["oaa.", "oaaa", "o...", "o...", "o..."]];

// Mound size by tenure: small, medium, large
type Tier = "s" | "m" | "l";
const MOUND: Record<Tier, [number, number]> = { s: [20, 5], m: [24, 6], l: [30, 7] };

// Coast: the CSUF lighthouse (its light sweeps) and the OCC pier with a rowboat moored
const LIGHTHOUSE = [
  "....a....", "...kkk...", "..kwywk..", "..kkkkk..", "...www...", "...aaa...", "...www...",
  "...aaa...", "..wwwww..", "..aaaaa..", "..wwwww..", "..wwkww..", "sssssssss",
];
const LAMP_ROW = 2;
const HARBOR = [
  "o.....................", "oaa...................", "oa....................", "o.....................",
  "tttttttttttttt........",
  "o...o...o...o.wwwwwwww",
  "o...o...o...o..aaaaaa.",
  "o...o...o...o...wwww..",
];
const MOORED_COL = 14; // where the moored boat starts; it should sit just off the shore

const THIN: Record<string, string> = { o: "k", b: "a", v: "l", f: "y" };

function spriteSVG(rows: Rows, px: number) {
  const h = rows.length, w = Math.max(...rows.map((r) => r.length));
  let out = "";
  const rect = (cls: string, cx: number, cy: number) => {
    out += `<rect class="px-${cls}" x="${cx + 1}" y="${cy + 1}" width="1" height="1"/>`;
  };
  eachOutlineCell(rows, (ch) => ch !== "." && !THIN[ch], (cx, cy) => rect("k", cx, cy));
  rows.forEach((row, cy) => [...row].forEach((ch, cx) => { if (ch !== ".") rect(THIN[ch] || ch, cx, cy); }));
  return {
    svg: `<svg width="${(w + 2) * px}" height="${(h + 2) * px}" viewBox="0 0 ${w + 2} ${h + 2}" aria-hidden="true">${out}</svg>`,
    w: (w + 2) * px,
    h: (h + 2) * px,
  };
}

/* ========================================
   Tuning
   ======================================== */

// Stops keep their order and sit close when their dates are close,
// but a long quiet stretch is capped so the sea never goes empty.
const PPM = 60;                    // px per month between neighbouring stops...
const GAP_MIN = 74, GAP_MAX = 150; // ...clamped to this
const Y_NOW = 40, PAD_BOTTOM = 110;

// The hero's water, laid flat: a coarse 2D wave equation drawn as broken crest
// strokes. The pointer drags a wake through it, a click splashes, the boat rows
// a wake behind it, and ripples bounce off the islands and the shore.
const WATER = {
  rowGap: 24,      // spacing between swell rows
  wavelength: 150, // swell wavelength along a row (px)
  crest: 0.32,     // how high the water must be to get a stroke (-1..1)
  drift: 0.16,     // rows per second drifting down the sea
  cell: 10,        // simulation resolution in px
  calm: 0.985,     // damping per step (lower settles faster)
  lift: 1.6,       // how far the water bends the strokes
  swell: 3,        // ambient swell amplitude in px
  radius: 110,     // wake width is radius / 40 cells
  strength: 20,    // how hard the cursor pushes the water
  oar: 3.2,        // how hard each oar stroke pushes
  hull: 1.6,       // how hard the hull pushes per cell it crosses
  rock: 2.2,       // the ripple a docked boat sends out as it rocks
  fade: 70,        // strokes fade out over this many px at the right edge
};

/* ========================================
   Helpers
   ======================================== */

const SVGNS = "http://www.w3.org/2000/svg";
const TAU = Math.PI * 2;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const smooth = (u: number) => u * u * (3 - 2 * u);
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const monthIndex = (s: string) => { const [y, m] = s.split("-").map(Number); return y * 12 + m - 1; };
const today = new Date();
const NOW = today.getFullYear() * 12 + today.getMonth();
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const short = (m: number) => `${MON[m % 12]} ’${String(Math.floor(m / 12)).slice(2)}`;

interface Point { x: number; y: number }
interface Box { x0: number; x1: number; y0: number; y1: number }

interface Stop {
  card: HTMLElement;
  id: string;
  key: string;
  label: string;
  landmark: "lighthouse" | "harbor" | null;
  start: number;
  end: number | null;
  /** Jobs sit where they started; schools sit where they graduated. */
  anchor: number;
  fx: number;
  main: boolean;
  artW: number;
  artH: number;
}

function tierOf(s: Stop): Tier {
  const months = (s.end ?? NOW) - s.start + 1;
  return s.main || months >= 24 ? "l" : months >= 10 || !s.end ? "m" : "s";
}

function tenure(s: Stop) {
  const n = (s.end ?? NOW) - s.start + 1;
  const y = Math.floor(n / 12), m = n % 12;
  if (!y) return `${n} mo`;
  return m ? `${y} yr ${m} mo` : `${y} yr`;
}

function islandArt(key: string, tier: Tier, flagFrame: number | null): Rows {
  const [w, h] = MOUND[tier];
  const spec = ISLANDS[key] || { ground: "sand", props: [] };
  const r = rng([...key].reduce((n, ch) => n * 31 + ch.charCodeAt(0), 7));
  // Mound rows as [from, to) columns, each a little uneven but never wider above than below
  const base: [number, number][] = [];
  let pl = w, pr = w;
  for (let y = 0; y < h; y++) {
    // a flat top that rounds off quickly, so props have level ground to stand on
    const pad = Math.round(5 * (1 - y / (h - 1)) ** 2);
    const j = () => (y < 2 ? Math.round(r() * 2 - 1) : 0);
    pl = Math.min(pl, Math.max(0, pad + j()));
    pr = Math.min(pr, Math.max(0, pad + j()));
    base.push([pl, w - pr]);
  }
  const surface = (c: number) => { const y = base.findIndex(([a, b]) => c >= a && c < b); return y < 0 ? h - 1 : y; };

  const props: { map: Rows; x: number; at?: "water" }[] = spec.props.map(([name, x, at]) => ({ map: PROPS[name], x, at }));
  if (flagFrame != null) props.unshift({ map: FLAG[flagFrame], x: 1 });
  const widthOf = (m: Rows) => Math.max(...m.map((row) => row.length));
  const x0 = Math.min(0, ...props.map((p) => p.x));
  const x1 = Math.max(w, ...props.map((p) => p.x + widthOf(p.map)));
  const TOP = 30;
  const g = Array.from({ length: TOP + h }, () => Array<string>(x1 - x0).fill("."));
  const set = (y: number, c: number, ch: string) => { g[TOP + y][c - x0] = ch; };

  base.forEach(([a, b], y) => { for (let c = a; c < b; c++) set(y, c, "s"); });
  const grass = spec.ground === "grass";
  for (let c = 0; c < w; c++) {
    const top = surface(c);
    const onMat = spec.mat && c >= spec.mat[0] && c < spec.mat[1];
    // A grass cap two rows deep with a ragged lower edge, or a gym mat two rows thick
    const cap = (ch: string, extra: number) => {
      for (let y = top; y < Math.min(h - 1, top + 2 + (r() < extra ? 1 : 0)); y++) {
        if (c >= base[y][0] && c < base[y][1]) set(y, c, ch);
      }
    };
    if (onMat) cap("m", 0);
    else if (grass) cap("g", 0.45);
    // Blades and the odd flower along the top edge
    if (!onMat && c > 0 && c < w - 1 && r() < (grass ? 0.3 : 0.18)) {
      set(top - 1, c, spec.flowers && r() < 0.35 ? "f" : grass ? "v" : "o");
    }
  }
  for (const p of props) {
    const pw = widthOf(p.map), ph = p.map.length;
    let bottom = h - 1;
    if (p.at !== "water") {
      // stand on top of the lowest bit of mound under the prop's feet
      bottom = 0;
      const feet = p.map[ph - 1];
      for (let c = 0; c < pw; c++) if (feet[c] && feet[c] !== ".") bottom = Math.max(bottom, surface(p.x + c));
      bottom -= 1;
    }
    p.map.forEach((row, y) => [...row].forEach((ch, c) => {
      if (ch !== ".") set(bottom - (ph - 1) + y, p.x + c, ch);
    }));
  }
  const rows = g.map((row) => row.join(""));
  while (!/[^.]/.test(rows[0])) rows.shift();
  return rows;
}

function el(tag: string, attrs: Record<string, string | number>, parent?: Element | null) {
  const n = document.createElementNS(SVGNS, tag);
  for (const k in attrs) n.setAttribute(k, String(attrs[k]));
  parent?.appendChild(n);
  return n;
}

/* ========================================
   The sea
   ======================================== */

function initIslands(sea: HTMLElement, log: HTMLElement) {
  const root = document.documentElement;
  const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const narrowQuery = window.matchMedia("(max-width: 1024px)");
  const reduced = () => reducedQuery.matches;

  const cards = [...log.querySelectorAll<HTMLElement>(".isle-card")];
  const stops: Stop[] = cards.map((card) => {
    const d = card.dataset;
    return {
      card,
      id: card.id,
      key: card.id.replace(/^isle-/, ""),
      label: d.label ?? "",
      landmark: (d.landmark as Stop["landmark"]) || null,
      start: monthIndex(d.start!),
      end: d.end ? monthIndex(d.end) : null,
      anchor: monthIndex(d.landmark ? d.end! : d.start!),
      fx: Number(d.x) || 0,
      main: card.hasAttribute("data-main"),
      artW: 0,
      artH: 0,
    };
  });
  let selected = Math.max(0, stops.findIndex((s) => s.main));

  cards.forEach((c, i) => {
    const t = c.querySelector("[data-tenure]");
    if (t) t.textContent = ` · ${tenure(stops[i])}`;
  });

  /* ---------- Layout ---------- */

  let geo!: {
    W: number; H: number; phone: boolean; bleed: number; coast: number;
    cardW: number; seaW: number; pts: Point[]; monthY: (m: number) => number; px: number;
  };

  function layout() {
    const W = sea.clientWidth;
    const phone = W < 700;
    // The land runs this far into the left margin: into the gap beside the label column on desktop,
    // and only into the section padding once the label sits on top
    const bleed = phone || narrowQuery.matches ? 16 : 44;
    const coast = phone ? 60 : 72;           // land edge, in sea coordinates
    const cardW = phone ? W - 16 : Math.min(340, Math.round(W * 0.38));
    const seaW = phone ? W : W - cardW - 36;
    const px = phone ? 2 : 3;               // island pixel size
    const x0 = coast + 56, x1 = seaW - 56;

    // Anchor months, newest first, with "now" on top
    const anchors = [...new Set([NOW, ...stops.map((s) => s.anchor).sort((a, b) => b - a)])];
    const ys = [Y_NOW];
    for (let k = 1; k < anchors.length; k++) ys.push(ys[k - 1] + clamp((anchors[k - 1] - anchors[k]) * PPM, GAP_MIN, GAP_MAX));
    const monthY = (m: number) => {
      if (m >= anchors[0]) return ys[0] - (m - anchors[0]) * PPM;
      for (let k = 1; k < anchors.length; k++) {
        if (m >= anchors[k]) return lerp(ys[k], ys[k - 1], (m - anchors[k]) / (anchors[k - 1] - anchors[k]));
      }
      return ys[ys.length - 1];
    };

    const H = Math.round(ys[ys.length - 1] + PAD_BOTTOM);
    const pts = stops.map((s) => ({
      x: s.landmark === "harbor" ? Math.round(coast + 4 - (MOORED_COL + 1 - HARBOR[0].length / 2 - 1) * px) // moored boat just off the shore
        : s.landmark ? Math.round((coast - bleed) / 2)
        : Math.round(x0 + s.fx * (x1 - x0)),
      y: Math.round(monthY(s.anchor)),
    }));
    geo = { W, H, phone, bleed, coast, cardW, seaW, pts, monthY, px };
    sea.style.setProperty("--h", H + "px");
    sea.style.setProperty("--bleed", bleed + "px");
    sea.classList.toggle("is-phone", phone);
  }

  /* ---------- Land ---------- */

  let land!: SVGSVGElement, marks!: SVGSVGElement, canvas!: HTMLCanvasElement, boatEl!: HTMLElement;
  const boat = { x: 0, y: 0, dir: 1, anim: 0, w: 0, h: 0, sailing: false };
  const buttons: HTMLButtonElement[] = [];

  // A button's box in sea coordinates (each is centred on its left with translateX(-50%))
  const boxOf = (b: HTMLElement): Box => ({
    x0: b.offsetLeft - b.offsetWidth / 2, x1: b.offsetLeft + b.offsetWidth / 2,
    y0: b.offsetTop, y1: b.offsetTop + b.offsetHeight,
  });

  // Land and marks are drawn in sea coordinates; their layers start `bleed` px further left
  function layerGroup(svg: SVGSVGElement) {
    svg.innerHTML = "";
    return el("g", { transform: `translate(${geo.bleed} 0)` }, svg);
  }

  function drawLand() {
    const { H, bleed, coast } = geo;
    const g = layerGroup(land);
    const r = rng(7);
    // Stepped pixel edge, with foam where land meets water
    const BAND = 12;
    let d = `M${-bleed} 0`;
    const edges: number[] = [];
    for (let y = 0; y < H; y += BAND) {
      const e = coast - 10 + Math.floor(r() * 3) * 4;
      edges.push(e);
      d += ` H${e} V${Math.min(H, y + BAND)}`;
    }
    d += ` H${-bleed} Z`;
    el("path", { d, class: "isea-land" }, g);
    edges.forEach((e, k) => {
      if (r() < 0.55) el("rect", { x: e + 3, y: k * BAND + 3, width: 2, height: BAND - 6, class: "isea-foam" }, g);
    });
    // Stepping stones from the lighthouse door down to the water. The sprite covers the ones under it.
    const li = stops.findIndex((s) => s.landmark === "lighthouse");
    if (li >= 0) {
      const p = geo.pts[li];
      const end = edges[Math.floor((p.y - 3) / BAND)] ?? coast;
      for (let x = p.x, k = 0; x < end - 6; k++) {
        const w = 5 + Math.floor(r() * 3), y = p.y - 5 + (k % 2 ? 1 : -1);
        el("rect", { x: x + 1, y, width: w - 2, height: 1, class: "isea-stone" }, g);
        el("rect", { x, y: y + 1, width: w, height: 2, class: "isea-stone" }, g);
        el("rect", { x: x + 1, y: y + 3, width: w - 1, height: 1, class: "isea-stone-edge" }, g);
        x += w + 2 + Math.floor(r() * 2);
      }
    }
  }

  function drawStops() {
    buttons.forEach((b) => b.remove());
    buttons.length = 0;
    stops.forEach((s, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "isle" + (s.landmark ? " is-coast" : "");
      b.setAttribute("aria-controls", s.id);
      b.setAttribute("aria-label", `${s.card.querySelector(".exp-role")!.textContent}, ${s.label}. ${s.card.querySelector(".isle-date")!.textContent}`);
      const px = geo.px;
      const frames = s.landmark === "lighthouse" ? [spriteSVG(LIGHTHOUSE, px)]
        : s.landmark === "harbor" ? [spriteSVG(HARBOR, px)]
        : (s.end ? [null] : [0, 1]).map((f) => spriteSVG(islandArt(s.key, tierOf(s), f), px));
      const art = frames[0];
      const svgs = frames.map((f, k) => (frames.length > 1 ? f.svg.replace("<svg ", `<svg class="isle-flag-${k}" `) : f.svg)).join("");
      const beam = s.landmark === "lighthouse"
        ? `<span class="isle-beam" style="top:${4 + (LAMP_ROW + 1.5) * px}px"></span>` : "";
      const when = s.landmark ? s.card.dataset.when : `${short(s.start)} – ${s.end ? short(s.end) : "now"}`;
      b.innerHTML = `<span class="isle-art">${svgs}</span>${beam}${s.landmark ? "" : `<span class="isle-name">${s.label}</span>`}<span class="isle-when">${when}</span>`;
      const p = geo.pts[i];
      b.style.left = p.x + "px";
      b.style.top = p.y - art.h - 4 + "px";
      b.onclick = () => select(i, { user: true });
      b.onkeydown = onKey;
      s.artW = art.w;
      s.artH = art.h;
      buttons.push(b);
      sea.insertBefore(b, log);
    });
  }

  // Each year's label sits on the sand just below the line where that year ends (newer is higher).
  // The timeline squeezes quiet stretches, so quiet years come out short. Labels slide off coast landmarks.
  let yearEls: HTMLElement[] = [];
  let yearWatch: IntersectionObserver[] = [];

  function drawYears() {
    yearEls.forEach((y) => y.remove());
    yearWatch.forEach((o) => o.disconnect());
    const { coast, bleed, monthY } = geo;
    const g = land.firstChild as SVGGElement;
    const blocked = buttons.filter((_, i) => stops[i].landmark).map((b) => [b.offsetTop - 4, b.offsetTop + b.offsetHeight + 4]);
    const nowYear = Math.floor(NOW / 12);
    const firstYear = Math.floor(Math.min(...stops.map((s) => s.start)) / 12);
    const H_LABEL = 12;
    yearEls = [];
    for (let yr = nowYear; yr >= firstYear; yr--) {
      let top = 8;
      if (yr < nowYear) {
        const line = Math.round(monthY((yr + 1) * 12));
        for (let x = -bleed + 6; x < coast - 14; x += 6) el("rect", { x, y: line, width: 4, height: 2, class: "isea-yearline" }, g);
        top = line + 6;
      }
      for (const [a, b] of blocked) if (top < b && top + H_LABEL > a) top = b;
      const n = document.createElement("span");
      n.className = "isea-year";
      n.textContent = String(yr);
      n.setAttribute("aria-hidden", "true");
      n.style.left = coast - 14 + "px";
      n.style.top = top + "px";
      sea.insertBefore(n, log);
      yearEls.push(n);
    }
    // Arrives once fully on screen (a little above the bottom edge); washes back out once fully off it
    const arrive = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const n = e.target as HTMLElement;
        if (!e.isIntersecting || n.classList.contains("is-ashore")) continue;
        n.classList.add("is-ashore");
        if (reduced()) continue;
        // a small wave breaks on the shore as the year lands
        const y = n.offsetTop + 6;
        for (let k = -1; k <= 1; k++) water.inject(coast + 10, y + k * 9, WATER.strength * 0.25);
      }
    }, { rootMargin: "0px 0px -12% 0px", threshold: 1 });
    const leave = new IntersectionObserver((entries) => {
      for (const e of entries) if (!e.isIntersecting) e.target.classList.remove("is-ashore");
    });
    yearWatch = [arrive, leave];
    yearEls.forEach((n) => { arrive.observe(n); leave.observe(n); });
  }

  function onKey(e: KeyboardEvent) {
    const step = ({ ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 } as Record<string, number>)[e.key];
    let to: number | null = null;
    if (step) to = clamp(selected + step, 0, stops.length - 1);
    if (e.key === "Home") to = 0;
    if (e.key === "End") to = stops.length - 1;
    if (to === null) return;
    e.preventDefault();
    buttons[to].focus({ preventScroll: true });
    select(to, { user: true, scroll: true });
  }

  /* ---------- Water ---------- */

  const water = (() => {
    const STEP = 1 / 60;
    let ctx: CanvasRenderingContext2D | null = null;
    let C = { a: "", line: "" };
    let cols = 0, rows = 0, Wc = 0, Hc = 0;
    let cur = new Float32Array(0), prev = new Float32Array(0), damp = new Float32Array(0);
    let wt = 0, acc = 0;
    let pointer: Point | null = null;
    let keepOut: Box[] = [];   // stroke-free boxes (islands and labels), canvas coords

    function readColors() {
      const css = getComputedStyle(root);
      C = { a: css.getPropertyValue("--color-accent").trim(), line: css.getPropertyValue("--color-text-secondary").trim() };
    }

    function rebuild() {
      Wc = geo.W + geo.bleed;
      Hc = geo.H;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(Wc * dpr);
      canvas.height = Math.round(Hc * dpr);
      ctx = canvas.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      readColors();

      cols = Math.ceil(Wc / WATER.cell) + 3;
      rows = Math.ceil(Hc / WATER.cell) + 3;
      cur = new Float32Array(cols * rows);
      prev = new Float32Array(cols * rows);
      // damp: 0 = solid (land, islands), <1 = absorbing outer edges, else calm
      damp = new Float32Array(cols * rows);
      const shore = (geo.coast - 4 + geo.bleed) / WATER.cell + 1;
      const solids = stops.flatMap((s, i) => {
        if (s.landmark) return [];
        const p = geo.pts[i];
        return [{ x0: p.x - s.artW / 2 + geo.bleed, x1: p.x + s.artW / 2 + geo.bleed, y0: p.y - s.artH + 4, y1: p.y }];
      });
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          const px = (x - 1) * WATER.cell, py = (y - 1) * WATER.cell;
          if (x < shore || solids.some((r) => px > r.x0 && px < r.x1 && py > r.y0 && py < r.y1)) continue;
          const d = Math.min(cols - 1 - x, y, rows - 1 - y);
          damp[i] = WATER.calm * (d >= 6 ? 1 : 0.86 + 0.14 * (d / 6));
        }
      }
      keepOut = buttons.map((b) => {
        const r = boxOf(b);
        return { x0: r.x0 + geo.bleed - 6, x1: r.x1 + geo.bleed + 6, y0: r.y0 - 6, y1: r.y1 + 4 };
      });
    }

    function sample(x: number, y: number) {
      const fx = clamp(x / WATER.cell + 1, 0, cols - 1.001);
      const fy = clamp(y / WATER.cell + 1, 0, rows - 1.001);
      const x0 = fx | 0, y0 = fy | 0, tx = fx - x0, ty = fy - y0;
      const i = y0 * cols + x0;
      const top = cur[i] + (cur[i + 1] - cur[i]) * tx;
      const bot = cur[i + cols] + (cur[i + cols + 1] - cur[i + cols]) * tx;
      return top + (bot - top) * ty;
    }

    // 9-point Laplacian so ripples spread as circles instead of diamonds
    function simStep() {
      for (let y = 1; y < rows - 1; y++) {
        for (let x = 1; x < cols - 1; x++) {
          const i = y * cols + x;
          const c = cur[i];
          const edges = cur[i - 1] + cur[i + 1] + cur[i - cols] + cur[i + cols];
          const corners = cur[i - cols - 1] + cur[i - cols + 1] + cur[i + cols - 1] + cur[i + cols + 1];
          prev[i] = (2 * c - prev[i] + 0.5 * ((4 * edges + corners - 20 * c) / 6)) * damp[i];
        }
      }
      const swap = cur; cur = prev; prev = swap;
    }

    // x, y in sea coordinates
    function inject(x: number, y: number, amount: number) {
      const r = Math.max(1.5, WATER.radius / 40);
      const cx = (x + geo.bleed) / WATER.cell + 1, cy = y / WATER.cell + 1;
      for (let gy = Math.floor(cy - r); gy <= Math.ceil(cy + r); gy++) {
        for (let gx = Math.floor(cx - r); gx <= Math.ceil(cx + r); gx++) {
          if (gx < 1 || gy < 1 || gx >= cols - 1 || gy >= rows - 1) continue;
          const d = Math.hypot(gx - cx, gy - cy);
          if (d < r && damp[gy * cols + gx]) cur[gy * cols + gx] -= amount * 0.5 * (1 + Math.cos((Math.PI * d) / r));
        }
      }
    }

    function wake(a: Point, b: Point, amount: number) {
      const n = Math.min(40, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / WATER.cell));
      for (let k = 1; k <= n; k++) inject(lerp(a.x, b.x, k / n), lerp(a.y, b.y, k / n), amount);
    }

    function advance(dt: number) {
      acc += Math.min(dt, 0.1);
      while (acc >= STEP) { simStep(); wt += STEP; acc -= STEP; }
    }

    const soft = (h: number) => 8 * Math.tanh((h * WATER.lift) / 8);

    // Flat swell rows as broken crest strokes; only the band on screen is drawn
    function draw() {
      if (!ctx) return;
      const g = ctx;
      g.clearRect(0, 0, Wc, Hc);
      const r = sea.getBoundingClientRect();
      const vy0 = -r.top - 40, vy1 = vy0 + innerHeight + 80;
      const amp = reduced() ? WATER.swell * 0.6 : WATER.swell;
      const ph = wt * 0.9;
      const step = 4, s = 0.7;
      const xStart = geo.coast + geo.bleed + 8;
      const run: number[] = [];
      g.lineCap = "round";

      const flush = (lam: number) => {
        const n = run.length / 3;
        if (n >= 2) {
          let hi = 0;
          for (let k = 2; k < run.length; k += 3) hi = Math.max(hi, run[k]);
          const bulge = (0.8 + 2.4 * s) * Math.min(1, ((n - 1) * step) / (lam * 0.3));
          const hot = clamp((hi - 3.5) / 10);
          const edge = clamp((Wc - run[(n >> 1) * 3]) / WATER.fade);
          g.strokeStyle = hot > 0.15 ? C.a : C.line;
          g.globalAlpha = Math.min(0.9, 0.14 + 0.4 * s + hot * 0.5) * edge;
          g.lineWidth = 0.6 + s;
          g.beginPath();
          for (let k = 0; k < n; k++) {
            const y = run[k * 3 + 1] - bulge * Math.sin((Math.PI * k) / (n - 1));
            if (k) g.lineTo(run[k * 3], y); else g.moveTo(run[k * 3], y);
          }
          g.stroke();
        }
        run.length = 0;
      };

      const drift = wt * WATER.drift;
      const shift = Math.floor(drift), frac = drift - shift;
      const k0 = Math.max(0, Math.floor(vy0 / WATER.rowGap) - 1), k1 = Math.ceil(vy1 / WATER.rowGap) + 1;
      for (let k = k0; k <= k1; k++) {
        const y = (k + frac) * WATER.rowGap, id = k - shift;
        if (y < 4 || y > Hc - 4) continue;
        const lam = WATER.wavelength * (0.85 + 0.3 * hash(id + 13));
        const kA = TAU / lam, kB = TAU / (lam * 0.47), kE = TAU / (lam * 5.3);
        const p1 = hash(id) * TAU, p2 = hash(id + 31) * TAU, p3 = hash(id + 67) * TAU;
        const boxes = keepOut.filter((b) => y > b.y0 - 10 && y < b.y1 + 10);
        for (let x = xStart; x <= Wc; x += step) {
          if (boxes.some((b) => x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1)) { if (run.length) flush(lam); continue; }
          const a = 0.7 * Math.sin(kA * x + p1 - ph) + 0.3 * Math.sin(kB * x + p2 + ph * 1.4);
          const env = 0.5 + 0.5 * Math.sin(kE * x + p3 + ph * 0.12);
          const h = sample(x, y);
          const hv = h * WATER.lift;
          const boost = 0.6 * smooth(clamp((Math.abs(hv) - 0.8) / 10));
          if (a - (1 - env) * 0.9 * (1 - boost / 0.6) + boost > WATER.crest) {
            run.push(x, y - a * amp * s - soft(h) * 0.8, hv);
          } else if (run.length) flush(lam);
        }
        if (run.length) flush(lam);
      }
      g.globalAlpha = 1;
    }

    function toSea(clientX: number, clientY: number): Point {
      const r = sea.getBoundingClientRect();
      return { x: clientX - r.left, y: clientY - r.top };
    }

    function setPointer(clientX: number, clientY: number) {
      if (reduced()) return;
      const p = toSea(clientX, clientY);
      if (pointer) wake(pointer, p, WATER.strength * 0.05);
      pointer = p;
    }

    sea.addEventListener("pointermove", (e) => { if (e.pointerType !== "touch") setPointer(e.clientX, e.clientY); });
    sea.addEventListener("pointerleave", () => { pointer = null; });
    sea.addEventListener("pointerdown", (e) => {
      if (reduced() || (e.target as Element).closest("button, a, .isle-card")) return;
      const p = toSea(e.clientX, e.clientY);
      inject(p.x, p.y, WATER.strength * 0.4);
    });
    sea.addEventListener("touchmove", (e) => setPointer(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    sea.addEventListener("touchend", () => { pointer = null; }, { passive: true });
    new MutationObserver(readColors).observe(root, { attributes: true, attributeFilter: ["data-theme"] });

    return { rebuild, advance, draw, inject, wake };
  })();

  /* ---------- Clock: runs only while the sea is on screen ---------- */

  let raf = 0, last = 0, onScreen = false, booted = false;
  function frame(now: number) {
    const dt = last ? (now - last) / 1000 : 0;
    last = now;
    water.advance(dt);
    if (!boat.sailing) idleRipple(now);
    water.draw();
    raf = requestAnimationFrame(frame);
  }
  function run() {
    cancelAnimationFrame(raf);
    last = 0;
    if (!booted) return;
    if (onScreen && !document.hidden && !reduced()) raf = requestAnimationFrame(frame);
    else water.draw();
  }
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; run(); }, { rootMargin: "200px 0px" }).observe(sea);
  // The phone sheet shows only while the sea fills the middle of the screen
  new IntersectionObserver(([e]) => sea.classList.toggle("is-in-view", e.isIntersecting), { rootMargin: "-30% 0px -50% 0px" }).observe(sea);
  document.addEventListener("visibilitychange", run);
  addEventListener("scroll", () => { if (reduced()) water.draw(); }, { passive: true });

  // A docked boat still rocks a little
  let nextIdle = 0;
  function idleRipple(now: number) {
    if (now < nextIdle) return;
    nextIdle = now + 1700;
    water.inject(boat.x, boat.y + 2, WATER.rock);
  }

  /* ---------- Boat ---------- */

  // Where the boat ties up: beside the island at its waterline, on the open-water side
  function dock(i: number) {
    const s = stops[i], p = geo.pts[i];
    if (s.landmark) return { x: Math.max(geo.coast + boat.w / 2 + 4, p.x + s.artW / 2 + boat.w / 2 + 2), y: p.y - 4, dir: -1 };
    const right = p.x < geo.seaW - 110;
    return { x: p.x + (right ? 1 : -1) * (s.artW / 2 + boat.w / 2 - 2), y: p.y - 4, dir: right ? -1 : 1 };
  }

  function buildBoat() {
    boatEl?.remove();
    boatEl = document.createElement("div");
    boatEl.className = "isea-boat";
    const frames = BOAT.map((f) => spriteSVG(f, 2));
    boatEl.innerHTML = `<div class="isea-boat-bob">${frames.map((f, k) => `<div data-f="${k}"${k !== 1 ? " hidden" : ""}>${f.svg}</div>`).join("")}</div>`;
    boat.w = frames[0].w;
    boat.h = frames[0].h;
    sea.insertBefore(boatEl, log);
  }

  function placeBoat(x: number, y: number, dir: number, frame: number) {
    boat.x = x; boat.y = y; boat.dir = dir;
    // the hull's waterline (sprite row 11) sits on y
    boatEl.style.transform = `translate(${Math.round(x - boat.w / 2)}px, ${Math.round(y - 12 * 2)}px) scaleX(${dir})`;
    boatEl.querySelectorAll<HTMLElement>("[data-f]").forEach((f) => (f.hidden = Number(f.dataset.f) !== frame));
  }

  /* ---------- Ashore at the lighthouse ---------- */

  // "boat" (rowing or docked), "walking" (on the stones), "inside" (in the lighthouse)
  let crew: "boat" | "walking" | "inside" = "boat";
  const walker = { el: null as HTMLElement | null, anim: 0, x: 0, w: 0, h: 0, scale: 1 };

  function buildWalker() {
    walker.el?.remove();
    const w = document.createElement("div");
    w.className = "isea-walker";
    w.hidden = true;
    const frames = WALKER.map((f) => spriteSVG(f, 2));
    w.innerHTML = frames.map((f, k) => `<div data-f="${k}"${k ? " hidden" : ""}>${f.svg}</div>`).join("");
    walker.el = w;
    walker.w = frames[0].w;
    walker.h = frames[0].h;
    sea.insertBefore(w, log);
  }

  const restFrame = () => (crew === "boat" ? 1 : EMPTY);

  function stones(i: number) {
    const p = geo.pts[i];
    return { door: p.x, step: p.x + 14 + geo.px * 2, shore: boat.x - boat.w / 4, y: p.y - 3 };
  }

  // Feet on y, lifted by `lift`, shrunk toward the feet by `scale`; behind the lighthouse when `behind`
  function poseWalker(y: number, lift: number, frame: number, scale = 1, behind = false) {
    const w = walker.el!;
    w.hidden = false;
    w.style.zIndex = behind ? "1" : "";
    w.style.transform = `translate(${Math.round(walker.x - walker.w / 2)}px, ${Math.round(y - lift - walker.h)}px) scale(${scale})`;
    w.querySelectorAll<HTMLElement>("[data-f]").forEach((n) => (n.hidden = Number(n.dataset.f) !== frame));
    walker.scale = scale;
  }

  function tween(dur: number, fn: (t: number, ms: number) => void, done: () => void) {
    cancelAnimationFrame(walker.anim);
    let t0: number | null = null;
    const step = (now: number) => {
      t0 ??= now;
      const t = Math.min(1, (now - t0) / dur);
      fn(t, now - t0);
      if (t < 1) walker.anim = requestAnimationFrame(step);
      else done();
    };
    walker.anim = requestAnimationFrame(step);
  }

  // Skip along the stones: a little hop every 240ms, legs tucked while airborne
  function skip(toX: number, y: number, done: () => void) {
    const fromX = walker.x, HOP = 240;
    tween(Math.max(300, (Math.abs(toX - fromX) / 46) * 1000), (t, ms) => {
      walker.x = lerp(fromX, toX, t);
      const ph = (ms % HOP) / HOP, lift = t < 1 ? 4 * Math.sin(Math.PI * ph) : 0;
      poseWalker(y, lift, lift > 1.5 ? 1 : 0);
    }, done);
  }

  // Hop up and drop through the door, shrinking into it from behind the lighthouse (or the reverse)
  function jump(toX: number, y: number, into: boolean, done: () => void) {
    const fromX = walker.x;
    tween(420, (t) => {
      walker.x = lerp(fromX, toX, t);
      const u = into ? t : 1 - t;   // 0 at the doorstep, 1 inside
      const lift = 18 * 4 * t * (1 - t);
      const scale = u < 0.5 ? 1 : lerp(1, 0.15, (u - 0.5) / 0.5);
      poseWalker(y, lift, 1, scale, u > 0.5);
    }, done);
  }

  function lightUp(i: number) {
    const b = buttons[i];
    b.classList.add("is-lit");
    setTimeout(() => b.classList.remove("is-lit"), 700);
  }

  // Step out of the boat, skip up the stones and jump into the lighthouse
  function walkIn(i: number) {
    const s = stones(i);
    crew = "walking";
    walker.x = s.shore;
    placeBoat(boat.x, boat.y, boat.dir, EMPTY);
    water.inject(boat.x, boat.y + 2, WATER.oar);
    skip(s.step, s.y, () => jump(s.door, s.y, true, () => {
      walker.el!.hidden = true;
      crew = "inside";
      lightUp(i);
    }));
  }

  // Jump back out (or turn around) and skip down to the boat
  function walkOut(i: number, done: () => void) {
    const s = stones(i);
    const fromInside = crew === "inside" || walker.scale < 1;
    if (crew === "inside") walker.x = s.door;
    crew = "walking";
    const down = () => skip(s.shore, s.y, () => {
      walker.el!.hidden = true;
      crew = "boat";
      placeBoat(boat.x, boat.y, boat.dir, 1);
      water.inject(boat.x, boat.y + 2, WATER.oar);
      done();
    });
    if (fromInside) jump(s.step, s.y, false, down);
    else down();
  }

  function stayAshore() {
    cancelAnimationFrame(walker.anim);
    walker.el!.hidden = true;
    walker.scale = 1;
    crew = stops[selected].landmark === "lighthouse" ? "inside" : "boat";
  }

  /* ---------- Rowing ---------- */

  type Curve = (t: number) => Point;
  const bez = (a: number, b: number, c: number, d: number, t: number) =>
    (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d;

  function sCurve(from: Point, to: Point, bend: number): Curve {
    const c1 = { x: from.x + bend, y: from.y + (to.y - from.y) * 0.3 };
    const c2 = { x: to.x + bend, y: from.y + (to.y - from.y) * 0.7 };
    return (t) => ({ x: bez(from.x, c1.x, c2.x, to.x, t), y: bez(from.y, c1.y, c2.y, to.y, t) });
  }

  // The S-curve bends away from the nearer edge, but it tries the other bends too and keeps
  // the first one that keeps the boat off every island and label it isn't leaving or reaching
  function routeBetween(from: Point, to: Point, ends: number[]): Curve {
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const base = Math.min(60, dist * 0.15) * (from.x < geo.seaW / 2 ? 1 : -1);
    const boxes = buttons.filter((_, k) => !ends.includes(k)).map(boxOf);
    const lo = geo.coast + boat.w / 2, hi = geo.seaW - boat.w / 2;
    const hits = (curve: Curve) => {
      let n = 0;
      for (let k = 1; k < 32; k++) {
        const p = curve(k / 32);
        const hull = { x0: p.x - boat.w / 2, x1: p.x + boat.w / 2, y0: p.y - 24, y1: p.y + 4 };
        if (p.x < lo || p.x > hi) n++;
        for (const b of boxes) if (hull.x0 < b.x1 && hull.x1 > b.x0 && hull.y0 < b.y1 && hull.y1 > b.y0) n++;
      }
      return n;
    };
    let best: Curve | null = null, fewest = Infinity;
    for (const bend of [base, -base, base * 0.5, -base * 0.5, 0, base * 1.6, -base * 1.6]) {
      const curve = sCurve(from, to, bend);
      const n = hits(curve);
      if (n < fewest) { best = curve; fewest = n; }
      if (!n) break;
    }
    return best!;
  }

  // Row along the route. Each catch of the oars pushes the water.
  function sail(from: Point, to: ReturnType<typeof dock>, ends: number[], done: () => void) {
    closeCard();
    boat.sailing = true;
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const dur = clamp(dist * 3.2, 1800, 5000);
    const curve = routeBetween(from, to, ends);
    let t0: number | null = null, prev = { ...from }, lastBeat = -1;
    const step = (now: number) => {
      t0 ??= now; // the first frame's timestamp, so the clock matches rAF's
      const t = Math.min(1, (now - t0) / dur);
      const { x, y } = curve(t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
      const dir = t < 1 ? (Math.abs(x - prev.x) > 0.3 ? (x > prev.x ? 1 : -1) : boat.dir) : to.dir;
      const beat = Math.floor((now - t0) / 170);
      const frame = t < 1 ? STROKE[beat % STROKE.length] : 1;
      placeBoat(x, y, dir, frame);
      water.wake(prev, { x, y }, WATER.hull);
      if (beat !== lastBeat && frame === 0) {
        // oar blades dip in on both sides
        water.inject(x - boat.w / 2 + 2, y + 2, WATER.oar);
        water.inject(x + boat.w / 2 - 2, y + 2, WATER.oar);
      }
      lastBeat = beat;
      prev = { x, y };
      if (t < 1) boat.anim = requestAnimationFrame(step);
      else { boat.sailing = false; done(); }
    };
    boat.anim = requestAnimationFrame(step);
  }

  /* ---------- Selection ---------- */

  // A vertical line from y0 to y1, broken where it would cross a coast landmark
  function shoreLine(x: number, y0: number, y1: number, cls: string, parent: Element) {
    const gaps = buttons
      .filter((_, k) => stops[k].landmark)
      .map(boxOf)
      .filter((b) => x > b.x0 && x < b.x1)
      .map((b) => [b.y0 - 4, b.y1 + 4])
      .sort((a, b) => a[0] - b[0]);
    let y = Math.min(y0, y1);
    const end = Math.max(y0, y1);
    for (const [a, b] of gaps) {
      if (b <= y || a >= end) continue;
      if (a > y) el("line", { x1: x, x2: x, y1: y, y2: a, class: cls }, parent);
      y = Math.max(y, b);
    }
    if (y < end) el("line", { x1: x, x2: x, y1: y, y2: end, class: cls }, parent);
  }

  // Tenure bracket on the shore for the selected stop
  function drawSpan(i: number) {
    const g = layerGroup(marks);
    const s = stops[i];
    const x = geo.coast + 6;
    const yA = Math.round(geo.monthY(s.start));
    const yB = Math.round(geo.monthY(s.end ?? NOW));
    const span = el("g", { class: "isea-span" }, g);
    shoreLine(x, yB, yA, "", span);
    el("line", { x1: x - 4, x2: x + 4, y1: yA, y2: yA }, span);
    if (s.end) el("line", { x1: x - 4, x2: x + 4, y1: yB, y2: yB }, span);
    else shoreLine(x, 0, yB, "is-open", span);
  }

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "isle-close";
  closeBtn.setAttribute("aria-label", "Close");
  closeBtn.textContent = "×";
  closeBtn.onclick = () => {
    closeCard();
    buttons[selected].focus({ preventScroll: true });
  };
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && geo?.phone && cards[selected].classList.contains("is-open")) closeBtn.click();
  });

  function openCard(i: number) {
    cards.forEach((c, k) => c.classList.toggle("is-open", k === i));
    buttons.forEach((b, k) => { b.classList.toggle("is-active", k === i); b.setAttribute("aria-expanded", String(k === i)); });
    const c = cards[i];
    marks.querySelector(".isea-leader")?.remove();
    if (geo.phone) {
      c.prepend(closeBtn);
      return c;
    }
    closeBtn.remove();
    const p = geo.pts[i], d = dock(i);
    c.style.width = geo.cardW + "px";
    const left = geo.seaW + 36;
    c.style.left = left + "px";
    c.style.top = "0px";
    const h = c.offsetHeight;
    const top = Math.max(0, Math.min(geo.H - h, p.y - 70));
    c.style.top = top + "px";
    const xa = d.x + boat.w / 2 - 2, ya = d.y - 12;
    const yb = Math.max(top + 24, Math.min(top + h - 24, ya));
    el("path", { d: `M${Math.round(xa)} ${Math.round(ya)} H${left - 18} L${left} ${Math.round(yb)}`, class: "isea-leader" }, marks.firstChild as Element);
    return c;
  }

  function closeCard() {
    cards.forEach((c) => c.classList.remove("is-open"));
    buttons.forEach((b) => { b.classList.remove("is-active"); b.setAttribute("aria-expanded", "false"); });
    marks.querySelector(".isea-leader")?.remove();
  }

  function select(i: number, opts: { user?: boolean; scroll?: boolean } = {}) {
    if (i < 0 || i >= stops.length) return;
    // already here and ashore: leave him be
    if (i === selected && crew !== "boat") { openCard(i); return; }
    const left = selected;
    selected = i;
    drawSpan(i);
    if (opts.scroll) buttons[i].scrollIntoView({ block: geo.phone ? "start" : "center", behavior: reduced() ? "auto" : "smooth" });
    cancelAnimationFrame(boat.anim);
    cancelAnimationFrame(walker.anim);
    boat.sailing = false;
    const lighthouse = stops[i].landmark === "lighthouse";

    const go = () => {
      const from = { x: boat.x, y: boat.y };
      const to = dock(i);
      if (reduced() || Math.hypot(to.x - from.x, to.y - from.y) < 2) {
        stayAshore();
        placeBoat(to.x, to.y, to.dir, restFrame());
        openCard(i);
        return;
      }
      sail(from, to, [left, i], () => {
        const c = openCard(i);
        if (opts.user && !opts.scroll && !geo.phone) c.scrollIntoView({ block: "nearest", behavior: "smooth" });
        if (lighthouse) walkIn(i);
      });
    };

    // Ashore at the lighthouse: walk back to the boat before rowing off
    if (crew !== "boat" && i !== left) {
      if (reduced()) { stayAshore(); placeBoat(boat.x, boat.y, boat.dir, restFrame()); go(); }
      else { closeCard(); walkOut(left, go); }
    } else go();
  }

  /* ---------- Boot ---------- */

  function render() {
    cancelAnimationFrame(boat.anim);
    boat.sailing = false;
    layout();
    if (!land) {
      canvas = document.createElement("canvas");
      canvas.className = "isea-layer isea-water";
      canvas.setAttribute("aria-hidden", "true");
      land = document.createElementNS(SVGNS, "svg") as SVGSVGElement;
      land.setAttribute("class", "isea-layer");
      land.setAttribute("aria-hidden", "true");
      marks = land.cloneNode() as SVGSVGElement;
      sea.prepend(canvas, land);
      sea.insertBefore(marks, log);
      buildBoat();
      buildWalker();
    }
    drawLand();
    drawStops();
    water.rebuild();
    drawYears();
    const d = dock(selected);
    stayAshore();
    placeBoat(d.x, d.y, d.dir, restFrame());
    drawSpan(selected);
    openCard(selected);
    water.draw();
  }

  const syncMotion = () => root.classList.toggle("is-reduced", reduced());
  reducedQuery.addEventListener("change", () => { syncMotion(); render(); run(); });

  syncMotion();
  document.body.classList.add("isea-on");
  render();
  booted = true;
  run();
  let lastW = sea.clientWidth;
  new ResizeObserver(() => {
    const w = sea.clientWidth;
    if (w === lastW) return;
    lastW = w;
    render();
  }).observe(sea);
}

const sea = document.getElementById("isea");
const log = document.getElementById("isea-log");
// Label sizes feed the layout, so wait for the fonts
if (sea && log) document.fonts.ready.then(() => initIslands(sea, log));
