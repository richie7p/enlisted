import type { MapDef, Rect } from "./types";

type Node = { x: number; y: number; f: number; g: number; i: number };

class MinHeap {
  data: Node[] = [];
  push(n: Node) {
    this.data.push(n);
    this.up(this.data.length - 1);
  }
  pop(): Node | undefined {
    const d = this.data;
    if (!d.length) return undefined;
    const top = d[0];
    const last = d.pop()!;
    if (d.length) {
      d[0] = last;
      this.down(0);
    }
    return top;
  }
  private up(i: number) {
    const d = this.data;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (d[p].f <= d[i].f) break;
      [d[p], d[i]] = [d[i], d[p]];
      i = p;
    }
  }
  private down(i: number) {
    const d = this.data;
    for (;;) {
      let s = i;
      const l = i * 2 + 1;
      const r = l + 1;
      if (l < d.length && d[l].f < d[s].f) s = l;
      if (r < d.length && d[r].f < d[s].f) s = r;
      if (s === i) break;
      [d[s], d[i]] = [d[i], d[s]];
      i = s;
    }
  }
}

export const CELL = 40;

export type Grid = {
  cols: number;
  rows: number;
  blocked: Uint8Array;
  map: MapDef;
};

function hits(rects: Rect[], x: number, y: number, s: number) {
  for (const r of rects) {
    if (x < r.x + r.w && x + s > r.x && y < r.y + r.h && y + s > r.y) return true;
  }
  return false;
}

export function buildGrid(map: MapDef): Grid {
  const cols = Math.ceil(map.w / CELL);
  const rows = Math.ceil(map.h / CELL);
  const blocked = new Uint8Array(cols * rows);
  const solids = [...map.walls, ...map.cover.filter((c) => c.block)];
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      if (hits(solids, gx * CELL + 4, gy * CELL + 4, CELL - 8)) blocked[gy * cols + gx] = 1;
    }
  }
  return { cols, rows, blocked, map };
}

export function worldToCell(grid: Grid, x: number, y: number) {
  return {
    x: Math.max(0, Math.min(grid.cols - 1, Math.floor(x / CELL))),
    y: Math.max(0, Math.min(grid.rows - 1, Math.floor(y / CELL))),
  };
}

const OX = [1, -1, 0, 0, 1, 1, -1, -1];
const OY = [0, 0, 1, -1, 1, -1, 1, -1];
const OC = [1, 1, 1, 1, 1.414, 1.414, 1.414, 1.414];

export function astar(grid: Grid, sx: number, sy: number, tx: number, ty: number): { x: number; y: number }[] {
  const a = worldToCell(grid, sx, sy);
  const b = worldToCell(grid, tx, ty);
  const { cols, rows, blocked } = grid;
  const start = a.y * cols + a.x;
  const goal = b.y * cols + b.x;
  if (blocked[goal]) {
    let found = -1;
    let best = 99;
    for (let i = 0; i < cols * rows; i++) {
      if (blocked[i]) continue;
      const gx = i % cols;
      const gy = (i / cols) | 0;
      const d = Math.abs(gx - b.x) + Math.abs(gy - b.y);
      if (d < best) {
        best = d;
        found = i;
      }
    }
    if (found < 0) return [];
    return astar(grid, sx, sy, (found % cols) * CELL + CELL / 2, ((found / cols) | 0) * CELL + CELL / 2);
  }
  const heap = new MinHeap();
  const gScore = new Float32Array(cols * rows);
  gScore.fill(1e9);
  const came = new Int32Array(cols * rows);
  came.fill(-1);
  const closed = new Uint8Array(cols * rows);
  gScore[start] = 0;
  heap.push({ x: a.x, y: a.y, i: start, g: 0, f: heuristic(a.x, a.y, b.x, b.y) });
  let guard = 0;
  while (heap.data.length && guard++ < 4000) {
    const cur = heap.pop()!;
    if (closed[cur.i]) continue;
    closed[cur.i] = 1;
    if (cur.i === goal) break;
    for (let k = 0; k < 8; k++) {
      const nx = cur.x + OX[k];
      const ny = cur.y + OY[k];
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      if (k >= 4 && (blocked[cur.y * cols + nx] || blocked[ny * cols + cur.x])) continue;
      const ni = ny * cols + nx;
      if (blocked[ni] || closed[ni]) continue;
      const ng = cur.g + OC[k];
      if (ng >= gScore[ni]) continue;
      gScore[ni] = ng;
      came[ni] = cur.i;
      heap.push({ x: nx, y: ny, i: ni, g: ng, f: ng + heuristic(nx, ny, b.x, b.y) });
    }
  }
  if (came[goal] < 0 && start !== goal) return [];
  const path: { x: number; y: number }[] = [];
  let i = goal;
  if (start === goal) return [{ x: tx, y: ty }];
  while (i >= 0) {
    const gx = i % cols;
    const gy = (i / cols) | 0;
    path.push({ x: gx * CELL + CELL / 2, y: gy * CELL + CELL / 2 });
    if (i === start) break;
    i = came[i];
  }
  path.reverse();
  if (path.length) path[path.length - 1] = { x: tx, y: ty };
  return path;
}

function heuristic(ax: number, ay: number, bx: number, by: number) {
  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);
  return dx + dy + (1.414 - 2) * Math.min(dx, dy);
}

export function circleRect(cx: number, cy: number, r: number, b: Rect) {
  const nx = Math.max(b.x, Math.min(cx, b.x + b.w));
  const ny = Math.max(b.y, Math.min(cy, b.y + b.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

export function resolveWalls(x: number, y: number, r: number, solids: Rect[]) {
  let px = x;
  let py = y;
  for (const b of solids) {
    if (!circleRect(px, py, r, b)) continue;
    const nx = Math.max(b.x, Math.min(px, b.x + b.w));
    const ny = Math.max(b.y, Math.min(py, b.y + b.h));
    let dx = px - nx;
    let dy = py - ny;
    const d = Math.hypot(dx, dy) || 0.001;
    const overlap = r - d;
    if (overlap > 0) {
      px += (dx / d) * overlap;
      py += (dy / d) * overlap;
    }
  }
  return { x: px, y: py };
}

export function los(solids: Rect[], x1: number, y1: number, x2: number, y2: number) {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(2, Math.ceil(dist / 14));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    for (const b of solids) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return false;
    }
  }
  return true;
}
