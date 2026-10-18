// Hero build: the intro loads finished, a wave washes it back to a sketch,
// and a small pixel crew builds it again. The water the wave runs through
// stays behind the intro and answers the cursor once the build is done.
//
// The finished intro is plain HTML + CSS. This script only adds a layer:
// inline CSS variables on the hero elements (see "Hero build" in
// components.css) and two canvases. Reduced motion and repeat visits in the
// same session skip straight to the finished intro on still water.

type Job = "rows" | "arrows" | "name" | "buttons";
type Motion = "walk" | "surf" | "fly";
type Trail = "spray" | "drips";
type Pt = { x: number; y: number };
type Rect = { x0: number; x1: number; top: number; bottom: number };

interface Member {
  name: string;
  job: Job;
  motion: Motion;
  trail?: Trail;
  frames: string[][];
}

interface Seg {
  kind: "work" | "move";
  i: number;
  from: Pt;
  to: Pt;
  len: number;
  arc: number;
}

interface Actor {
  x: number;
  y: number;
  dir: number;
  alpha: number;
}

interface Row {
  row: HTMLElement;
  key: HTMLElement;
  val: HTMLElement;
  kr: Rect;
  vr: Rect;
  x0: number;
  x1: number;
  y: number;
  arrow: { x: number; top: number };
}

interface NameLine extends Rect {
  base: number;
}

interface Button extends Rect {
  el: HTMLAnchorElement;
  primary: boolean;
}

interface Geo {
  W: number;
  H: number;
  rows: Row[];
  name: { box: Rect; lines: NameLine[]; fontSize: number };
  buttons: Button[];
}

/* ========================================
   Sprites
   Pixel maps: '.' empty, k ink, a accent, s sand, w paper.
   Each sprite is a list of 1–2 frames. A 1px ink outline is added at draw time.
   ======================================== */
const SURFER = [[
  "......kkk.....", ".....kkkkk....", ".....ksss.....", "......sks.....",
  "....aaaaaa....", "...s.aaaa.s...", "......aaa.....", ".....kkkkk....",
  ".....s...s....", "....s.....s...", ".kkkkkkkkkkkk.", "kwwwwwwwwwwwwk", ".kkkkkkkkkkkk.",
], [
  "......kkk.....", ".....kkkkk....", ".....ksss.....", "......sks.....",
  "..s.aaaaaa.s..", ".....aaaa.....", "......aaa.....", ".....kkkkk....",
  ".....s...s....", "....s.....s...", ".kkkkkkkkkkkk.", "kwwwwwwwwwwwwk", ".kkkkkkkkkkkk.",
]];
const GULL = [[
  "kk.......kk.", ".kkk...kkk..", "...kwwwwk.ww", "....wwwwwwkw", ".....wwwwwaa", "......a..a..",
], [
  "............", "............", "kkkkwwwwkkww", "....wwwwwwkw", ".....wwwwwaa", "......a..a..",
]];
const LIFTER = [[
  "aa............aa", "aakkkkkkkkkkkkaa", "aa..s......s..aa", "....s.kkkk.s....",
  "....s.ssss.s....", "....s.kssk.s....", "....ssaaaass....", "......aaaa......",
  "......kkkk......", "......s..s......", ".....kk..kk.....",
], [
  "aa............aa", "aakkkkkkkkkkkkaa", "aa..s......s..aa", "....s.kkkk.s....",
  "....s.ssss.s....", "....s.kssk.s....", "....ssaaaass....", "......aaaa......",
  "......kkkk......", ".....s....s.....", "....kk....kk....",
]];
const LIFEGUARD = [[
  "...kkkk....", "..kkkkkk...", "..ssssss...", "..skssks...", "..ssssss...", "...ssss....",
  "..aaaaaa...", ".s.aaaa.s..", ".s.aaaa.aaa", "...s..s.aaa", "...s..s....", "..kk..kk...",
], [
  "...kkkk....", "..kkkkkk...", "..ssssss...", "..skssks...", "..ssssss...", "...ssss....",
  "..aaaaaa...", ".s.aaaa.s..", ".s.aaaa.aaa", "...s.s..aaa", "..s...s....", ".kk...kk...",
]];

/* ========================================
   Crew: one builder per job.
   ======================================== */
const CREW: Member[] = [
  { name: "Surfer", job: "rows", motion: "surf", trail: "spray", frames: SURFER },
  { name: "Gull", job: "arrows", motion: "fly", frames: GULL },
  { name: "Lifter", job: "name", motion: "walk", frames: LIFTER },
  { name: "Lifeguard", job: "buttons", motion: "walk", trail: "drips", frames: LIFEGUARD },
];
const SPRITE_PX = 2;

/* ========================================
   Timeline (seconds).
   0 → wave[0]: the finished intro holds for a beat.
   wave: one crest sweeps left to right and washes the intro back to the sketch.
   Each job window includes the walk-on; the builder leaves during the
   `exit` seconds after its window.
   ======================================== */
const TIMELINE = {
  wave: [0.5, 1.8],
  rows: [1.8, 5.0],
  arrows: [5.0, 7.4],
  name: [5.0, 7.4],
  buttons: [7.2, 9.8],
  enter: 0.5,
  exit: 0.6,
  unlock: 10.4,
  water: 10.4, // the water starts answering the cursor
} as const;
const END = Math.max(TIMELINE.unlock, TIMELINE.water);

/* The opening wave: a tall crest driven through the water field,
   so the ripples it leaves behind are its own leftover energy. */
const WAVE = {
  height: 14, // crest height in the water field
  width: 46,  // crest half-width (px)
  lean: 28,   // the top of the front runs this far ahead of the bottom (px)
  lag: 36,    // ink lingers this far behind the crest at the foot of the letters (px)
  ride: true, // the surfer rides in on the wave's tail
};

/* The water: perspective swell rows drawn as broken crest strokes. */
const WATER = {
  rowGap: 24,      // average spacing between swell rows
  depth: 1.7,      // how hard the rows squeeze toward the horizon
  wavelength: 170, // wavelength along the nearest row (px)
  crest: 0.32,     // how high the water must be to get a stroke (-1..1)
  approach: 0.22,  // rows per second drifting toward the viewer
  cell: 10,        // simulation resolution in px
  calm: 0.985,     // damping per step (lower settles faster)
  lift: 1.6,       // how far the water bends the strokes
  swell: 4,        // ambient swell amplitude in px
  radius: 125,     // wake width is radius / 40 cells
  strength: 20,    // how hard the cursor pushes the water
};

const SEEN_KEY = "hero-build-seen";

const TAU = Math.PI * 2;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const ease = (u: number) => 1 - Math.pow(1 - u, 3);
const smooth = (u: number) => u * u * (3 - 2 * u);
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

const stage = document.getElementById("hero-stage");
if (stage) initHeroBuild(stage);

function initHeroBuild(stage: HTMLElement) {
  (window as Window & { __heroBuildStarted?: boolean }).__heroBuildStarted = true;

  const root = document.documentElement;
  const crewCanvas = stage.querySelector<HTMLCanvasElement>(".hero-crew")!;
  const waterCanvas = stage.querySelector<HTMLCanvasElement>(".hero-water")!;
  const skipBtn = stage.querySelector<HTMLButtonElement>(".hero-skip")!;
  const nameEl = stage.querySelector<HTMLElement>(".hero-name")!;
  const rowEls = [...stage.querySelectorAll<HTMLElement>(".hero-spec-row")];
  const linkEls = [...stage.querySelectorAll<HTMLAnchorElement>(".hero-actions a")];
  const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  let t = END;
  let playing = false;
  let building = root.classList.contains("hero-building");
  let geo!: Geo;
  let paths!: Record<Job, Seg[]>;
  let C: Record<string, string> = {};

  function readColors() {
    const css = getComputedStyle(root);
    const v = (n: string) => css.getPropertyValue(n).trim();
    C = {
      k: v("--color-text"), a: v("--color-accent"), s: v("--color-sand"), w: v("--color-paper"),
      bg: v("--color-bg"), line: v("--color-text-secondary"),
    };
  }

  /* ========================================
     Geometry, measured from the real DOM (stage coordinates)
     ======================================== */
  function measure() {
    const s = stage.getBoundingClientRect();
    const rel = (r: DOMRect): Rect => ({ x0: r.left - s.left, x1: r.right - s.left, top: r.top - s.top, bottom: r.bottom - s.top });
    const textRect = (el: Element) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return rel(range.getBoundingClientRect());
    };

    const rows = rowEls.map((row): Row => {
      const key = row.querySelector<HTMLElement>(".hero-spec-key")!;
      const val = row.querySelector<HTMLElement>(".hero-spec-val")!;
      const r = rel(row.getBoundingClientRect());
      const kr = rel(key.getBoundingClientRect());
      return {
        row, key, val, kr,
        vr: rel(val.getBoundingClientRect()),
        x0: r.x0,
        x1: textRect(val).x1,
        y: r.bottom + 2,
        arrow: { x: kr.x0 + 5, top: kr.top },
      };
    });

    // Name lines (the name can wrap on a phone) plus the first baseline
    const box = rel(nameEl.getBoundingClientRect());
    const range = document.createRange();
    range.selectNodeContents(nameEl);
    const lines: NameLine[] = [];
    [...range.getClientRects()].forEach((cr) => {
      const r = rel(cr);
      const same = lines.find((l) => Math.abs(l.top - r.top) < 4);
      if (same) { same.x0 = Math.min(same.x0, r.x0); same.x1 = Math.max(same.x1, r.x1); }
      else lines.push({ ...r, base: 0 });
    });
    lines.sort((a, b) => a.top - b.top);
    const probe = document.createElement("span");
    probe.style.cssText = "display:inline-block;width:0;height:0;";
    nameEl.prepend(probe);
    const base0 = probe.getBoundingClientRect().bottom - s.top;
    probe.remove();
    const fontSize = parseFloat(getComputedStyle(nameEl).fontSize);
    lines.forEach((l) => { l.base = base0 + (l.top - lines[0].top); });

    const buttons = linkEls.map((el): Button => ({ el, primary: el.classList.contains("btn-primary"), ...rel(el.getBoundingClientRect()) }));

    geo = { W: s.width, H: s.height, rows, name: { box, lines, fontSize }, buttons };
    paths = buildPaths();
  }

  /* ========================================
     Paths. Each job is a list of segments:
     "work" segments reveal target i as the builder crosses them,
     "move" segments carry the builder to the next target (with an arc).
     ======================================== */
  const rowReversed = (i: number) => i % 2 === 1;

  function seg(kind: Seg["kind"], i: number, from: Pt, to: Pt, len: number, arc = 0): Seg {
    return { kind, i, from, to, len, arc };
  }

  function buildPaths() {
    const P: Record<Job, Seg[]> = { rows: [], arrows: [], name: [], buttons: [] };
    const { rows, name, buttons } = geo;
    const arrowMotion = CREW.find((m) => m.job === "arrows")?.motion;

    // Zig-zag: even rows ride left to right, odd rows right to left
    const rowStart = (r: Row, i: number) => ({ x: rowReversed(i) ? r.x1 : r.x0, y: r.y });
    const rowEnd = (r: Row, i: number) => ({ x: rowReversed(i) ? r.x0 : r.x1, y: r.y });
    rows.forEach((r, i) => {
      P.rows.push(seg("work", i, rowStart(r, i), rowEnd(r, i), r.x1 - r.x0));
      const n = rows[i + 1];
      if (n) P.rows.push(seg("move", i, rowEnd(r, i), rowStart(n, i + 1), 40, 10));
    });

    const perch = (r: Row) => ({ x: r.arrow.x, y: arrowMotion === "fly" ? r.arrow.top - 2 : r.y });
    rows.forEach((r, i) => {
      P.arrows.push(seg("work", i, perch(r), perch(r), 60));
      const n = rows[i + 1];
      if (n) P.arrows.push(seg("move", i, perch(r), perch(n), 50, 24));
    });

    name.lines.forEach((l, i) => {
      const y = l.base + 2;
      P.name.push(seg("work", i, { x: l.x0, y }, { x: l.x1, y }, l.x1 - l.x0));
      const n = name.lines[i + 1];
      if (n) P.name.push(seg("move", i, { x: l.x1, y }, { x: n.x0, y: n.base + 2 }, 60, 18));
    });

    buttons.forEach((b, i) => {
      P.buttons.push(seg("work", i, { x: b.x0, y: b.top + 1 }, { x: b.x1, y: b.top + 1 }, b.x1 - b.x0));
      const n = buttons[i + 1];
      if (n) P.buttons.push(seg("move", i, { x: b.x1, y: b.top + 1 }, { x: n.x0, y: n.top + 1 }, Math.max(12, n.x0 - b.x1), 6));
    });
    return P;
  }

  // Position on a path at progress p, plus how far along each work target is.
  function evalPath(segs: Seg[], p: number, motion?: Motion) {
    const total = segs.reduce((sum, s) => sum + s.len, 0);
    let d = clamp(p) * total;
    const fr: number[] = [];
    let out: (Pt & { seg: Seg; u: number; dir: number }) | null = null;
    for (const s of segs) {
      const u: number = out ? 0 : clamp(d / s.len);
      if (s.kind === "work") fr[s.i] = out ? 0 : u;
      if (!out && (d <= s.len || s === segs[segs.length - 1])) {
        const lift = s.arc * (motion === "fly" ? 1.6 : 1);
        out = {
          x: lerp(s.from.x, s.to.x, u) + (motion === "fly" && s.kind === "move" ? Math.sin(Math.PI * u) * 20 : 0),
          y: lerp(s.from.y, s.to.y, u) - Math.sin(Math.PI * u) * lift,
          seg: s, u,
          dir: s.to.x < s.from.x ? -1 : 1,
        };
      }
      d -= s.len;
    }
    return { ...out!, fr };
  }

  function workProgress(job: Job, time: number) {
    const [a, b] = TIMELINE[job];
    return clamp((time - a - TIMELINE.enter) / (b - a - TIMELINE.enter));
  }

  /* Where a builder is at time `time`, or null when off stage. */
  function actorAt(m: Member, time: number): Actor | null {
    const [a, b] = TIMELINE[m.job];
    if (m.job === "rows" && WAVE.ride && time < a + TIMELINE.enter) return rideIn(m, time);
    if (time < a || time > b + TIMELINE.exit) return null;
    const segs = paths[m.job];
    const fly = m.motion === "fly";

    if (time < a + TIMELINE.enter) {
      const u = ease((time - a) / TIMELINE.enter);
      const start = evalPath(segs, 0, m.motion);
      const from = fly ? { x: start.x + 160, y: start.y - 120 } : { x: Math.max(-30, start.x - 240), y: start.y };
      return {
        x: lerp(from.x, start.x, u),
        y: lerp(from.y, start.y, u),
        dir: from.x > start.x ? -1 : 1,
        alpha: from.x > -30 && !fly ? clamp(u * 3) : 1,
      };
    }

    if (time > b) {
      const u = (time - b) / TIMELINE.exit;
      const end = evalPath(segs, 1, m.motion);
      const to = fly ? { x: end.x + 200, y: end.y - 140 } : { x: Math.min(geo.W + 30, end.x + 300), y: end.y };
      return {
        x: lerp(end.x, to.x, u * u),
        y: lerp(end.y, to.y, u * u),
        dir: 1,
        alpha: to.x < geo.W + 30 && !fly ? clamp((1 - u) * 3) : 1,
      };
    }

    const pos = evalPath(segs, workProgress(m.job, time), m.motion);
    let y = pos.y;
    if (pos.seg.kind === "work") {
      if (m.motion === "surf") y += Math.sin(time * 9) * 1.5;
      if (fly) y += Math.sin(time * 14) * 2;
    }
    return { x: pos.x, y, dir: pos.dir, alpha: 1 };
  }

  // The row builder comes in on the wave's tail and coasts to row 1
  function rideIn(m: Member, time: number): Actor | null {
    const from = TIMELINE.wave[0] + 0.3, to = TIMELINE.rows[0] + TIMELINE.enter;
    if (time < from) return null;
    const u = clamp((time - from) / (to - from));
    const start = evalPath(paths[m.job], 0, m.motion);
    return {
      x: lerp(-40, start.x, 1 - Math.pow(1 - u, 2.4)),
      y: start.y - (1 - u) * 14 + Math.sin(time * 9) * 1.5,
      dir: 1,
      alpha: 1,
    };
  }

  /* ========================================
     The opening wave
     ======================================== */
  // Crest position at mid-height: enters off the left edge, leaves off the right
  function crestX(time: number) {
    const [a, b] = TIMELINE.wave;
    const u = clamp((time - a) / (b - a));
    return lerp(-0.15 * geo.W, 1.15 * geo.W, 0.6 * u + 0.4 * smooth(u));
  }

  // The front leans forward at the top and wobbles a little
  function crestAt(y: number, time: number) {
    return crestX(time) + WAVE.lean * (0.5 - y / geo.H) + Math.sin(y * 0.021 + time * 7) * 5;
  }

  // When the crest reached x at height y (ignoring the wobble); Infinity if it never does
  function crestTimeAt(x: number, y: number) {
    const off = WAVE.lean * (0.5 - y / geo.H);
    let [lo, hi] = TIMELINE.wave as readonly number[];
    if (crestX(lo) + off >= x) return lo;
    if (crestX(hi) + off < x) return Infinity;
    for (let k = 0; k < 18; k++) {
      const mid = (lo + hi) / 2;
      if (crestX(mid) + off < x) lo = mid; else hi = mid;
    }
    return hi;
  }

  // How far the crest has washed something whose wet edge starts at x0: 0 untouched, 1 gone
  const washed = (x0: number, span: number, y: number, time: number) => clamp((crestAt(y, time) - x0) / span);

  /* ========================================
     Applying time t to the DOM
     ======================================== */
  function clipRight(el: HTMLElement, rect: Rect, x: number) {
    const hidden = clamp(rect.x1 - x, 0, rect.x1 - rect.x0);
    el.style.clipPath = `inset(-8px ${hidden}px -8px -8px)`;
  }

  function clipLeft(el: HTMLElement, rect: Rect, x: number) {
    const hidden = clamp(x - rect.x0, 0, rect.x1 - rect.x0);
    el.style.clipPath = `inset(-8px -8px -8px ${hidden}px)`;
  }

  // Tumble an element down and out as the wave hits it
  function knock(el: HTMLElement, w: number) {
    el.style.clipPath = "";
    if (w <= 0) { el.style.transform = ""; el.style.opacity = ""; return; }
    el.style.transform = `translateY(${(w * w * 0.9).toFixed(3)}em) rotate(${(w * w * 7).toFixed(2)}deg)`;
    el.style.opacity = (1 - w).toFixed(3);
  }

  // Name ink clip bands: line i spans band(i) to band(i + 1), in name-box coordinates
  function nameBand(i: number) {
    const { box, lines, fontSize } = geo.name;
    return i === 0 ? -fontSize : lines[i - 1].base + fontSize * 0.3 - box.top;
  }

  function setBuilding(on: boolean, pulse = false) {
    if (on === building) return;
    building = on;
    root.classList.toggle("hero-building", on);
    linkEls.forEach((el) => {
      if (on) {
        el.setAttribute("tabindex", "-1");
        el.setAttribute("aria-disabled", "true");
      } else {
        el.removeAttribute("tabindex");
        el.removeAttribute("aria-disabled");
        el.removeAttribute("data-bare");
        ["--paint", "--paint-x", "--paint-y", "--paint-pos"].forEach((p) => el.style.removeProperty(p));
        if (pulse) {
          el.classList.remove("is-unlocked");
          void el.offsetWidth;
          el.classList.add("is-unlocked");
        }
      }
    });
    if (!on) {
      // Finished intro = plain site CSS: drop every inline build style
      nameEl.style.removeProperty("--ink-clip");
      nameEl.style.removeProperty("--sketch");
      geo.rows.forEach((r) => {
        r.row.style.removeProperty("--row");
        r.key.style.removeProperty("--arrow");
        r.key.style.removeProperty("--arrow-drop");
        [r.key, r.val].forEach((el) => { el.style.clipPath = ""; el.style.transform = ""; el.style.opacity = ""; });
      });
      if (document.activeElement === skipBtn) linkEls[0]?.focus();
    }
  }

  function apply(time: number) {
    const wasBuilding = building;
    setBuilding(time < TIMELINE.unlock, wasBuilding && playing);

    if (building) {
      if (time < TIMELINE.wave[1]) applyWash(time);
      else applyBuild(time);
    }

    drawCrew(time);
    water.setStage(time);
  }

  /* The wave washes everything it crosses back to the sketch. Before it arrives
     every factor is 0, which is the finished intro. */
  function applyWash(time: number) {
    // Name: the ink drains out behind the crest, slowest at the foot of the letters
    const { box, lines, fontSize } = geo.name;
    const R = box.x1 - box.x0 + 30, B = box.bottom - box.top + fontSize;
    const edge = (x: number) => clamp(x - box.x0, -20, R);
    const pts = [`${R}px ${-fontSize}px`, `${R}px ${B}px`];
    for (let i = lines.length - 1; i >= 0; i--) {
      const l = lines[i];
      pts.push(`${edge(crestAt(l.bottom, time) - WAVE.lag)}px ${i === lines.length - 1 ? B : nameBand(i + 1)}px`);
      pts.push(`${edge(crestAt(l.top, time))}px ${nameBand(i)}px`);
    }
    nameEl.style.setProperty("--ink-clip", `polygon(${pts.join(", ")})`);
    nameEl.style.setProperty("--sketch", time > TIMELINE.wave[0] ? "1" : "0");

    // Spec rows: words and arrows are knocked down, leaving faint ruled lines
    geo.rows.forEach((r) => {
      const y = (r.kr.top + r.y) / 2;
      r.row.style.setProperty("--row", (1 - washed(r.x0, r.x1 - r.x0 + 60, y, time)).toFixed(3));
      knock(r.key, washed(r.kr.x0, 120, y, time));
      knock(r.val, washed(r.vr.x0, 160, y, time));
      r.key.style.setProperty("--arrow", (1 - washed(r.kr.x0 - 24, 90, y, time)).toFixed(3));
      r.key.style.setProperty("--arrow-drop", "0.9em");
    });

    // Buttons: the primary's paint runs off the bottom; link underlines wash away
    geo.buttons.forEach((b) => {
      const w = washed(b.x0, b.x1 - b.x0 + 70, (b.top + b.bottom) / 2, time);
      const s = b.el.style;
      s.setProperty("--paint", (1 - w).toFixed(3));
      s.setProperty("--paint-x", b.primary ? "1" : (1 - w).toFixed(3));
      s.setProperty("--paint-y", b.primary ? (1 - w).toFixed(3) : "1");
      s.setProperty("--paint-pos", b.primary ? "left" : "right");
      b.el.toggleAttribute("data-bare", w > 0.5);
    });
  }

  /* The crew builds the sketch back into the finished intro. */
  function applyBuild(time: number) {
    nameEl.style.setProperty("--sketch", "1");

    // Builder 1: spec rows
    const rowsFr = evalPath(paths.rows, workProgress("rows", time)).fr;
    geo.rows.forEach((r, i) => {
      const f = rowsFr[i];
      r.row.style.setProperty("--row", f.toFixed(3));
      [r.key, r.val].forEach((el) => { el.style.transform = ""; el.style.opacity = ""; });
      if (f >= 1) {
        r.key.style.clipPath = "none";
        r.val.style.clipPath = "none";
      } else if (rowReversed(i)) {
        const x = lerp(r.x1, r.x0, f);
        clipLeft(r.key, r.kr, x);
        clipLeft(r.val, r.vr, x);
      } else {
        const x = lerp(r.x0, r.x1, f);
        clipRight(r.key, r.kr, x);
        clipRight(r.val, r.vr, x);
      }
    });

    // Builder 2: arrows drop in while the builder hovers over each row
    const arrowsFr = evalPath(paths.arrows, workProgress("arrows", time)).fr;
    geo.rows.forEach((r, i) => {
      r.key.style.removeProperty("--arrow-drop");
      r.key.style.setProperty("--arrow", clamp((arrowsFr[i] - 0.35) / 0.3).toFixed(3));
    });

    // Builder 3: ink the name, line by line (staircase clip)
    const nameFr = evalPath(paths.name, workProgress("name", time)).fr;
    const { box, lines, fontSize } = geo.name;
    const pts: string[] = [];
    const edge = (i: number) => {
      const l = lines[i], f = nameFr[i];
      if (f <= 0) return -20;
      return (f >= 1 ? l.x1 + 30 : lerp(l.x0, l.x1, f)) - box.x0;
    };
    pts.push(`-20px ${nameBand(0)}px`);
    lines.forEach((_, i) => {
      pts.push(`${edge(i)}px ${nameBand(i)}px`);
      pts.push(`${edge(i)}px ${i === lines.length - 1 ? box.bottom - box.top + fontSize : nameBand(i + 1)}px`);
    });
    pts.push(`-20px ${box.bottom - box.top + fontSize}px`);
    nameEl.style.setProperty("--ink-clip", `polygon(${pts.join(", ")})`);

    // Builder 4: paint the buttons
    const btnFr = evalPath(paths.buttons, workProgress("buttons", time)).fr;
    geo.buttons.forEach((b, i) => {
      const s = b.el.style;
      s.setProperty("--paint", btnFr[i].toFixed(3));
      s.setProperty("--paint-x", btnFr[i].toFixed(3));
      s.setProperty("--paint-y", "1");
      s.setProperty("--paint-pos", "left");
      b.el.toggleAttribute("data-bare", btnFr[i] < 1);
    });
  }

  /* ========================================
     Crew rendering (one overlay canvas, drawn in device pixels so
     the pixel art stays crisp at fractional DPRs). The wave front and
     its runoff are drawn here too, since they pass over the intro.
     ======================================== */
  const crewCtx = crewCanvas.getContext("2d")!;
  let crewDirty = false;

  function sizeCanvas(canvas: HTMLCanvasElement) {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(geo.W * dpr), h = Math.round(geo.H * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    return dpr;
  }

  function drawSprite(ctx: CanvasRenderingContext2D, rows: string[], x: number, y: number, px: number, flip: boolean) {
    const h = rows.length, w = Math.max(...rows.map((r) => r.length));
    const ox = Math.round(x - (w * px) / 2), oy = Math.round(y - h * px);
    const at = (cx: number, cy: number) => {
      if (cy < 0 || cy >= h || cx < 0 || cx >= w) return ".";
      return rows[cy][flip ? w - 1 - cx : cx] || ".";
    };
    ctx.fillStyle = C.k;
    for (let cy = -1; cy <= h; cy++) {
      for (let cx = -1; cx <= w; cx++) {
        if (at(cx, cy) !== ".") continue;
        if (at(cx + 1, cy) !== "." || at(cx - 1, cy) !== "." || at(cx, cy + 1) !== "." || at(cx, cy - 1) !== ".") {
          ctx.fillRect(ox + cx * px, oy + cy * px, px, px);
        }
      }
    }
    for (let cy = 0; cy < h; cy++) {
      for (let cx = 0; cx < w; cx++) {
        const ch = at(cx, cy);
        if (ch === "." || !C[ch]) continue;
        ctx.fillStyle = C[ch];
        ctx.fillRect(ox + cx * px, oy + cy * px, px, px);
      }
    }
  }

  function drawTrail(ctx: CanvasRenderingContext2D, m: Member, x: number, y: number, px: number, dir: number, time: number, frame: number) {
    if (m.trail === "spray") {
      ctx.fillStyle = C.s;
      for (let k = 1; k <= 3; k++) {
        ctx.globalAlpha = 0.9 - k * 0.22;
        const sx = x - dir * (16 + k * 5) * px / 2;
        const sy = y - (2 + ((k + frame) % 2) * 3 + Math.sin(time * 20 + k) * 1.5) * px / 2;
        ctx.fillRect(Math.round(sx), Math.round(sy), px, px);
      }
    } else if (m.trail === "drips") {
      ctx.fillStyle = C.a;
      for (let k = 0; k < 3; k++) {
        const phase = (time * 3 + k / 3) % 1;
        ctx.globalAlpha = 1 - phase;
        ctx.fillRect(Math.round(x + dir * 4 * px), Math.round(y - 3 * px + phase * 8 * px), px, px);
      }
    }
    ctx.globalAlpha = 1;
  }

  // The breaking front: a wet sheen behind it, curls on the swell rows, spray ahead
  function drawWaveFront(ctx: CanvasRenderingContext2D, time: number) {
    const [a, b] = TIMELINE.wave;
    if (time <= a || time >= b) return;

    ctx.fillStyle = C.bg;
    for (let k = 0; k < 6; k++) {
      ctx.globalAlpha = 0.16 * (1 - k / 6);
      ctx.beginPath();
      for (let y = -10; y <= geo.H + 10; y += 20) ctx.lineTo(crestAt(y, time) - k * 26, y);
      for (let y = geo.H + 10; y >= -10; y -= 20) ctx.lineTo(crestAt(y, time) - (k + 1) * 26 - 30, y);
      ctx.fill();
    }

    ctx.lineCap = "round";
    swellRows(geo.H, time).forEach((L) => {
      if (L.s < 0.25 || L.y > geo.H) return;
      const x = crestAt(L.y, time), y = L.y, z = 5 + 11 * L.s;
      ctx.lineWidth = 1 + L.s;
      ctx.strokeStyle = L.id % 3 === 1 ? C.a : C.k;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(x - z * 2.2, y + z * 0.35);
      ctx.quadraticCurveTo(x - z * 0.6, y - z * 0.9, x + z * 0.3, y - z * 0.2);
      ctx.quadraticCurveTo(x + z * 0.45, y + z * 0.3, x - z * 0.1, y + z * 0.15);
      ctx.stroke();
      for (let e = 1; e <= 2; e++) {
        const ex = x - z * 2.6 * e;
        ctx.globalAlpha = 0.45 / e;
        ctx.beginPath();
        ctx.moveTo(ex - z * 1.6, y + z * 0.3);
        ctx.quadraticCurveTo(ex - z * 0.6, y - z * 0.5, ex + z * 0.3, y + z * 0.1);
        ctx.stroke();
      }
    });

    for (let j = 0; j < 24; j++) {
      const ph = (time * 1.6 + hash(j)) % 1;
      const y = geo.H * (0.05 + 0.9 * hash(j + 40));
      ctx.globalAlpha = 1 - ph;
      ctx.fillStyle = j % 3 ? C.s : C.a;
      ctx.fillRect(crestAt(y, time) + 6 + ph * 46, y - Math.sin(ph * Math.PI) * 16, 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  // Ink drips off the name and paint runs off the primary button as the crest passes
  function drawRunoff(ctx: CanvasRenderingContext2D, time: number) {
    const { lines, fontSize } = geo.name;
    ctx.fillStyle = C.k;
    lines.forEach((l, li) => {
      for (let x = l.x0 + 8, n = 0; x < l.x1 - 4; x += 15, n++) {
        const j = hash(li * 53 + n), j2 = hash(li * 71 + n + 9);
        if (j < 0.4) continue;
        const age = time - crestTimeAt(x + WAVE.lag, l.base) - 0.03 - j2 * 0.22;
        const life = 0.35 + 0.4 * j;
        if (age < 0 || age > life) continue;
        ctx.globalAlpha = 1 - age / life;
        const sz = j > 0.75 ? 3 : 2;
        const y0 = l.base - fontSize * (0.05 + 0.3 * j2);
        ctx.fillRect(x + (j - 0.5) * 8, y0 + 20 * age + (300 + 700 * j2) * age * age, sz, sz + Math.min(6, age * 20));
      }
    });

    ctx.fillStyle = C.a;
    geo.buttons.forEach((b) => {
      if (!b.primary) return;
      for (let x = b.x0 + 5, n = 0; x < b.x1 - 3; x += 7, n++) {
        const j = hash(n + 300);
        const age = time - crestTimeAt(x, b.bottom) - 0.05 - j * 0.12;
        const life = 0.5 + 0.3 * j;
        if (age < 0 || age > life) continue;
        ctx.globalAlpha = 1 - age / life;
        ctx.fillRect(x, b.bottom + 600 * age * age, 2, 3 + Math.min(10, age * 30));
      }
    });
    ctx.globalAlpha = 1;
  }

  function drawCrew(time: number) {
    const dpr = sizeCanvas(crewCanvas);
    const ctx = crewCtx;
    const inBuild = time < END;
    const actors = inBuild
      ? CREW.map((m) => ({ m, pos: actorAt(m, time) })).filter((a): a is { m: Member; pos: Actor } => a.pos !== null)
      : [];
    const waveOn = inBuild && time > TIMELINE.wave[0] && time < TIMELINE.wave[1] + 0.8;
    if (!actors.length && !waveOn && !crewDirty) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, crewCanvas.width, crewCanvas.height);
    crewDirty = actors.length > 0 || waveOn;

    if (waveOn) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawRunoff(ctx, time);
      drawWaveFront(ctx, time);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    const px = Math.max(1, Math.round(SPRITE_PX * dpr));
    actors.forEach(({ m, pos }) => {
      const rate = m.motion === "fly" ? 9 : 7;
      const frame = Math.floor(time * rate) % 2;
      const rows = m.frames[frame] || m.frames[0];
      const x = pos.x * dpr, y = pos.y * dpr;
      ctx.globalAlpha = pos.alpha;
      if (m.trail) drawTrail(ctx, m, x, y, px, pos.dir, time, frame);
      ctx.globalAlpha = pos.alpha;
      drawSprite(ctx, rows, x, y, px, pos.dir < 0);
      ctx.globalAlpha = 1;
    });
  }

  /* ========================================
     Swell rows at time `time`: squeezed toward a horizon just above the
     stage and drifting slowly toward the viewer. s is the local scale
     (1 = the nearest row); id stays with a row as it drifts.
     ======================================== */
  function swellRows(H: number, time: number) {
    const n = Math.round(clamp(H / WATER.rowGap, 12, 32));
    const drift = time * WATER.approach;
    const shift = Math.floor(drift), frac = drift - shift;
    const out: { y: number; s: number; id: number }[] = [];
    for (let k = 0; k <= n; k++) {
      const f = (k + frac) / n;
      if (f <= 0) continue;
      out.push({ y: H * (-0.05 + 1.1 * Math.pow(f, WATER.depth)), s: Math.pow(f, WATER.depth - 1), id: k - shift });
    }
    return out;
  }

  /* ========================================
     Water: one canvas behind the intro. A coarse 2D wave equation that runs
     on the build's clock: the opening wave is a crest driven through it, so
     its leftover ripples stay behind the build. From TIMELINE.water the
     pointer drags a wake through it and a click splashes.
     ======================================== */
  const water = (() => {
    const ctx = waterCanvas.getContext("2d")!;
    const STEP = 1 / 60;
    let shown = false;        // canvas visible: from the wave onward
    let interactive = false;  // pointer moves the water: from TIMELINE.water
    let awake = false;
    let visible = true;
    let pointer: Pt | null = null;
    let wt = 0;               // water time, on the build's clock
    let acc = 0;
    let energy = 0;
    let cols = 0, rows = 0;
    let cur = new Float32Array(0), prev = new Float32Array(0), sponge = new Float32Array(0);

    const ambientOn = () => WATER.swell > 0 && !reducedQuery.matches;
    // The ambient swell builds up behind the opening wave
    const swellAmp = () => WATER.swell * smooth(clamp((wt - TIMELINE.wave[0]) / 1.6));

    function rebuild() {
      cols = Math.ceil(geo.W / WATER.cell) + 3;
      rows = Math.ceil(geo.H / WATER.cell) + 3;
      cur = new Float32Array(cols * rows);
      prev = new Float32Array(cols * rows);
      // Absorbing edges: waves fade out in the outer cells instead of bouncing back
      sponge = new Float32Array(cols * rows);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const d = Math.min(x, y, cols - 1 - x, rows - 1 - y);
          sponge[y * cols + x] = WATER.calm * (d >= 6 ? 1 : 0.86 + 0.14 * (d / 6));
        }
      }
      energy = 0;
    }

    // Bilinear height at a stage point
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
      let max = 0;
      for (let y = 1; y < rows - 1; y++) {
        for (let x = 1; x < cols - 1; x++) {
          const i = y * cols + x;
          const c = cur[i];
          const edges = cur[i - 1] + cur[i + 1] + cur[i - cols] + cur[i + cols];
          const corners = cur[i - cols - 1] + cur[i - cols + 1] + cur[i + cols - 1] + cur[i + cols + 1];
          const lap = (4 * edges + corners - 20 * c) / 6;
          const v = (2 * c - prev[i] + 0.5 * lap) * sponge[i];
          prev[i] = v;
          const a = v < 0 ? -v : v;
          if (a > max) max = a;
        }
      }
      const swap = cur; cur = prev; prev = swap;
      return max;
    }

    function inject(x: number, y: number, amount: number) {
      const r = Math.max(1.5, WATER.radius / 40);
      const cx = x / WATER.cell + 1, cy = y / WATER.cell + 1;
      for (let gy = Math.floor(cy - r); gy <= Math.ceil(cy + r); gy++) {
        for (let gx = Math.floor(cx - r); gx <= Math.ceil(cx + r); gx++) {
          if (gx < 1 || gy < 1 || gx >= cols - 1 || gy >= rows - 1) continue;
          const d = Math.hypot(gx - cx, gy - cy);
          if (d < r) cur[gy * cols + gx] -= amount * 0.5 * (1 + Math.cos(Math.PI * d / r));
        }
      }
    }

    // Drag a wake from a to b: one push per cell crossed, so faster = bigger wake
    function wake(a: Pt, b: Pt) {
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const n = Math.min(40, Math.ceil(dist / WATER.cell));
      for (let k = 1; k <= n; k++) {
        inject(lerp(a.x, b.x, k / n), lerp(a.y, b.y, k / n), WATER.strength * 0.05);
      }
    }

    // The build's hand on the water: the opening crest, and the surfer's wake as it rides in
    function force(time: number) {
      const [a, b] = TIMELINE.wave;
      if (time >= a && time <= b && WAVE.height > 0) {
        // Grip the water gently at the start and let go gently at the end
        const grip = 0.3 * Math.min(1, (time - a) / 0.15, (b - time) / 0.5);
        const sig = WAVE.width / WATER.cell;
        for (let gy = 1; gy < rows - 1; gy++) {
          const cx = crestAt((gy - 1) * WATER.cell, time) / WATER.cell + 1;
          const x0 = Math.max(1, Math.floor(cx - sig * 2.5)), x1 = Math.min(cols - 2, Math.ceil(cx + sig * 2.5));
          for (let gx = x0; gx <= x1; gx++) {
            const d = (gx - cx) / sig;
            const i = gy * cols + gx;
            cur[i] += (WAVE.height * Math.exp(-d * d) - cur[i]) * grip;
          }
        }
      }
      if (WAVE.ride && time < TIMELINE.rows[0] + TIMELINE.enter) {
        const m = CREW.find((c) => c.job === "rows");
        const p = m && rideIn(m, time);
        if (p) inject(p.x, p.y + 4, 0.5);
      }
    }

    function advance(dt: number) {
      acc += dt;
      while (acc >= STEP) {
        force(wt);
        energy = simStep();
        wt += STEP;
        acc -= STEP;
      }
    }

    // Put the water where it would be at build time `time`. calm = skip the wave.
    function seek(time: number, calm = false) {
      reset();
      wt = Math.min(time, TIMELINE.wave[0]);
      if (!calm) {
        while (wt + STEP <= time) { force(wt); energy = simStep(); wt += STEP; }
      }
      wt = time;
      draw();
    }

    const soft = (h: number) => 8 * Math.tanh((h * WATER.lift) / 8);

    // Perspective swells as broken crest strokes: only high water gets a short
    // curved stroke. Rows thin and fade toward the horizon.
    function draw() {
      if (!cur.length) return;
      const dpr = sizeCanvas(waterCanvas);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, geo.W, geo.H);

      const amp = swellAmp();
      const ph = wt * 0.9;
      const step = 4;
      const run: number[] = [];
      // Quiet behind the build; once the water is live, small wakes show and glint
      const live = wt >= TIMELINE.water;
      const open0 = live ? 0.8 : 3, hot0 = live ? 3.5 : 16;
      ctx.lineCap = "round";

      const flush = (s: number, lam: number) => {
        const n = run.length / 3;
        if (n >= 2) {
          let hi = 0;
          for (let k = 2; k < run.length; k += 3) hi = Math.max(hi, run[k]);
          const bulge = (0.8 + 2.4 * s) * Math.min(1, ((n - 1) * step) / (lam * 0.3));
          const hot = clamp((hi - hot0) / 10);
          ctx.strokeStyle = hot > 0.15 ? C.a : C.line;
          ctx.globalAlpha = Math.min(0.9, 0.14 + 0.4 * s + hot * 0.5);
          ctx.lineWidth = 0.6 + s;
          ctx.beginPath();
          for (let k = 0; k < n; k++) {
            const y = run[k * 3 + 1] - bulge * Math.sin((Math.PI * k) / (n - 1));
            if (k) ctx.lineTo(run[k * 3], y); else ctx.moveTo(run[k * 3], y);
          }
          ctx.stroke();
        }
        run.length = 0;
      };

      for (const L of swellRows(geo.H, wt)) {
        if (L.y < -2 || L.y > geo.H + 12) continue;
        const lam = WATER.wavelength * L.s * (0.85 + 0.3 * hash(L.id + 13));
        const k1 = TAU / lam, k2 = TAU / (lam * 0.47), kE = TAU / (lam * 5.3);
        const p1 = hash(L.id) * TAU, p2 = hash(L.id + 31) * TAU, p3 = hash(L.id + 67) * TAU;
        const depth = 0.35 + 0.65 * L.s;
        for (let x = -step * 2; x <= geo.W + step * 2; x += step) {
          const a = 0.7 * Math.sin(k1 * x + p1 - ph) + 0.3 * Math.sin(k2 * x + p2 + ph * 1.4);
          const env = 0.5 + 0.5 * Math.sin(kE * x + p3 + ph * 0.12);
          const h = sample(x, L.y);
          const hv = h * WATER.lift;
          // Raised water opens the gaps and lengthens strokes, but never draws solid lines
          const boost = 0.6 * smooth(clamp((Math.abs(hv) - open0) / 10));
          if (a - (1 - env) * 0.9 * (1 - boost / 0.6) + boost > WATER.crest) {
            run.push(x, L.y - a * amp * L.s - soft(h) * depth, hv);
          } else if (run.length) flush(L.s, lam);
        }
        if (run.length) flush(L.s, lam);
      }
      ctx.globalAlpha = 1;
    }

    // Advance the water by dt seconds of build time (or real time once the build is over)
    function tick(dt: number) {
      if (!awake) return false;
      advance(dt);
      awake = (energy > 0.01 || ambientOn()) && shown && visible;
      draw();
      return awake;
    }

    function start() {
      if (!shown || !visible) return;
      awake = true;
      kick();
    }

    function toLocal(clientX: number, clientY: number): Pt {
      const r = waterCanvas.getBoundingClientRect();
      return { x: clientX - r.left, y: clientY - r.top };
    }

    function setPointer(clientX: number, clientY: number) {
      if (!interactive || reducedQuery.matches) return;
      const p = toLocal(clientX, clientY);
      if (pointer) wake(pointer, p);
      pointer = p;
      start();
    }

    function clearPointer() {
      pointer = null;
    }

    function splash(clientX: number, clientY: number) {
      if (!interactive || reducedQuery.matches) return;
      const p = toLocal(clientX, clientY);
      inject(p.x, p.y, WATER.strength * 0.4);
      start();
    }

    function reset() {
      pointer = null;
      acc = 0;
      cur.fill(0);
      prev.fill(0);
      energy = 0;
    }

    // Visible from the wave onward, answers the pointer from TIMELINE.water
    function setStage(time: number) {
      const show = time >= TIMELINE.wave[0];
      if (show !== shown) {
        shown = show;
        waterCanvas.classList.toggle("is-live", show);
        if (show) start();
      }
      const inter = time >= TIMELINE.water;
      if (inter !== interactive) {
        interactive = inter;
        if (!inter) pointer = null;
      }
    }

    new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); }).observe(stage);
    document.addEventListener("visibilitychange", () => { visible = !document.hidden; start(); });

    stage.addEventListener("pointermove", (e) => { if (e.pointerType !== "touch") setPointer(e.clientX, e.clientY); });
    stage.addEventListener("pointerleave", (e) => { if (e.pointerType !== "touch") clearPointer(); });
    stage.addEventListener("pointerdown", (e) => { if (!(e.target as Element).closest("a, button")) splash(e.clientX, e.clientY); });
    stage.addEventListener("touchstart", (e) => setPointer(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    stage.addEventListener("touchmove", (e) => setPointer(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    stage.addEventListener("touchend", clearPointer, { passive: true });
    stage.addEventListener("touchcancel", clearPointer, { passive: true });

    return { rebuild, draw, tick, seek, setStage, start };
  })();

  /* ========================================
     Clock
     ======================================== */
  let rafId = 0;
  let last = 0;

  function kick() {
    if (!rafId) rafId = requestAnimationFrame(frame);
  }

  function frame(now: number) {
    rafId = 0;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    let more = false;

    if (playing) {
      t = Math.min(END, t + dt);
      apply(t);
      water.tick(dt);
      if (t >= END) playing = false;
      more = true;
    } else {
      more = water.tick(dt);
    }

    if (more) kick();
    else last = 0;
  }

  function play() {
    try { sessionStorage.setItem(SEEN_KEY, "1"); } catch (e) {}
    t = 0;
    playing = true;
    water.seek(t);
    apply(t);
    kick();
  }

  // Skip, Escape, reduced motion, repeat visits: the finished intro on still water
  function finish() {
    playing = false;
    t = END;
    water.seek(t, true);
    apply(t);
    water.start();
  }

  skipBtn.addEventListener("click", finish);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && building) finish();
  });

  /* ========================================
     Boot
     ======================================== */
  function relayout() {
    measure();
    water.rebuild();
    crewDirty = true;
    water.seek(t, t >= END);
    apply(t);
    if (t >= END) water.start();
  }

  readColors();
  measure();
  water.rebuild();

  if (building && !reducedQuery.matches) {
    building = false; // let setBuilding() run its side effects
    play();
  } else {
    finish();
  }

  document.fonts?.ready.then(relayout);
  let resizeRaf = 0;
  let lastWidth = window.innerWidth;
  window.addEventListener("resize", () => {
    // Mobile browsers fire resize when the URL bar shows or hides; only width changes the layout
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(relayout);
  });
  new MutationObserver(() => { readColors(); water.draw(); crewDirty = true; apply(t); })
    .observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  reducedQuery.addEventListener("change", finish);
}
