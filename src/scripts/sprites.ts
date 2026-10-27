/* ========================================
   Pixel sprites shared by the hero crew and the Experience islands.
   Pixel maps: '.' empty, k ink, a accent, s sand, w paper.
   Each sprite is a list of 1–2 frames. A 1px ink outline is added at draw time.
   ======================================== */

export const LIFTER = [[
  "aa............aa", "aakkkkkkkkkkkkaa", "aa..s......s..aa", "....s.kkkk.s....",
  "....s.ssss.s....", "....s.kssk.s....", "....ssaaaass....", "......aaaa......",
  "......kkkk......", "......s..s......", ".....kk..kk.....",
], [
  "aa............aa", "aakkkkkkkkkkkkaa", "aa..s......s..aa", "....s.kkkk.s....",
  "....s.ssss.s....", "....s.kssk.s....", "....ssaaaass....", "......aaaa......",
  "......kkkk......", ".....s....s.....", "....kk....kk....",
]];

export const LIFEGUARD = [[
  "...kkkk....", "..kkkkkk...", "..ssssss...", "..skssks...", "..ssssss...", "...ssss....",
  "..aaaaaa...", ".s.aaaa.s..", ".s.aaaa.aaa", "...s..s.aaa", "...s..s....", "..kk..kk...",
], [
  "...kkkk....", "..kkkkkk...", "..ssssss...", "..skssks...", "..ssssss...", "...ssss....",
  "..aaaaaa...", ".s.aaaa.s..", ".s.aaaa.aaa", "...s.s..aaa", "..s...s....", ".kk...kk...",
]];

/**
 * Calls `fn` for each cell of the 1px ink outline: an empty cell beside a solid one.
 * Cells run from -1 to the sprite's width and height, so the outline can sit outside it.
 */
export function eachOutlineCell(
  rows: string[],
  solid: (ch: string) => boolean,
  fn: (cx: number, cy: number) => void,
) {
  const h = rows.length, w = Math.max(...rows.map((r) => r.length));
  const at = (cx: number, cy: number) => (cy < 0 || cy >= h || cx < 0 || cx >= w ? "." : rows[cy][cx] || ".");
  for (let cy = -1; cy <= h; cy++) {
    for (let cx = -1; cx <= w; cx++) {
      if (at(cx, cy) !== ".") continue;
      if (solid(at(cx + 1, cy)) || solid(at(cx - 1, cy)) || solid(at(cx, cy + 1)) || solid(at(cx, cy - 1))) fn(cx, cy);
    }
  }
}
