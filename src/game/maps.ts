import type { Cover, MapDef, PropKind, Rect } from "./types";

function box(x: number, y: number, w: number, h: number): Rect {
  return { x, y, w, h };
}

function ring(
  x: number,
  y: number,
  w: number,
  h: number,
  t = 18,
  door?: { side: "n" | "s" | "e" | "w"; gap?: number },
): Rect[] {
  const g = door?.gap ?? 58;
  const walls: Rect[] = [];
  const add = (r: Rect) => {
    if (r.w > 3 && r.h > 3) walls.push(r);
  };
  if (door?.side === "n") {
    const mid = x + w / 2;
    add({ x, y, w: mid - g / 2 - x, h: t });
    add({ x: mid + g / 2, y, w: x + w - (mid + g / 2), h: t });
  } else add({ x, y, w, h: t });
  if (door?.side === "s") {
    const mid = x + w / 2;
    add({ x, y: y + h - t, w: mid - g / 2 - x, h: t });
    add({ x: mid + g / 2, y: y + h - t, w: x + w - (mid + g / 2), h: t });
  } else add({ x, y: y + h - t, w, h: t });
  if (door?.side === "w") {
    const mid = y + h / 2;
    add({ x, y: y + t, w: t, h: mid - g / 2 - (y + t) });
    add({ x, y: mid + g / 2, w: t, h: y + h - t - (mid + g / 2) });
  } else add({ x, y: y + t, w: t, h: h - 2 * t });
  if (door?.side === "e") {
    const mid = y + h / 2;
    add({ x: x + w - t, y: y + t, w: t, h: mid - g / 2 - (y + t) });
    add({ x: x + w - t, y: mid + g / 2, w: t, h: y + h - t - (mid + g / 2) });
  } else add({ x: x + w - t, y: y + t, w: t, h: h - 2 * t });
  return walls;
}

function cover(x: number, y: number, w: number, h: number, kind: PropKind, block = true): Cover {
  return { x, y, w, h, kind, block };
}

function border(w: number, h: number, t = 28): Rect[] {
  return [box(0, 0, w, t), box(0, h - t, w, t), box(0, 0, t, h), box(w - t, 0, t, h)];
}

export const MAPS: Record<MapDef["id"], MapDef> = {
  route7: {
    id: "route7",
    nameZh: "七號公路",
    nameEn: "Route 7",
    w: 2000,
    h: 1600,
    ground: "dirt",
    spawn: { x: 1000, y: 1420 },
    walls: [
      ...border(2000, 1600),
      ...ring(120, 1180, 280, 200, 16, { side: "e" }),
      ...ring(1600, 1160, 260, 220, 16, { side: "w" }),
      ...ring(180, 720, 300, 240, 16, { side: "s" }),
      ...ring(1520, 680, 320, 260, 16, { side: "s" }),
      ...ring(720, 160, 560, 280, 18, { side: "s" }),
      box(70, 980, 160, 18),
      box(1760, 980, 170, 18),
      box(430, 430, 200, 16),
      box(1380, 430, 180, 16),
    ],
    cover: [
      cover(920, 1280, 52, 28, "sandbags"),
      cover(1040, 1280, 52, 28, "sandbags"),
      cover(880, 1100, 40, 40, "crate"),
      cover(1100, 1088, 36, 48, "barrel"),
      cover(960, 980, 70, 26, "sandbags"),
      cover(740, 900, 44, 36, "tires"),
      cover(1220, 900, 40, 40, "crate"),
      cover(600, 760, 48, 24, "sandbags"),
      cover(1320, 760, 48, 24, "sandbags"),
      cover(900, 640, 40, 40, "crate"),
      cover(1080, 640, 36, 48, "barrel"),
      cover(980, 520, 64, 26, "sandbags"),
      cover(480, 560, 36, 36, "rocks"),
      cover(1480, 560, 36, 36, "rocks"),
      cover(240, 1000, 40, 40, "ammo"),
      cover(1720, 1000, 40, 40, "ammo"),
      cover(860, 280, 48, 24, "sandbags"),
      cover(1100, 280, 48, 24, "sandbags"),
      cover(980, 220, 40, 40, "crate"),
      cover(360, 240, 52, 52, "bush", false),
      cover(1600, 240, 52, 52, "bush", false),
      cover(200, 480, 46, 46, "tent"),
      cover(1740, 480, 46, 46, "tent"),
    ],
  },
  district9: {
    id: "district9",
    nameZh: "第九區",
    nameEn: "District 9",
    w: 2000,
    h: 1600,
    ground: "asphalt",
    spawn: { x: 1000, y: 1450 },
    walls: [
      ...border(2000, 1600),
      ...ring(80, 80, 520, 420, 20, { side: "s" }),
      ...ring(1400, 80, 520, 420, 20, { side: "s" }),
      ...ring(80, 700, 520, 400, 20, { side: "n" }),
      ...ring(1400, 700, 520, 400, 20, { side: "n" }),
      ...ring(760, 620, 480, 360, 18, { side: "s" }),
      box(620, 1280, 180, 18),
      box(1200, 1280, 180, 18),
    ],
    cover: [
      cover(960, 1360, 70, 26, "barrier"),
      cover(720, 1200, 40, 40, "crate"),
      cover(1240, 1200, 40, 40, "crate"),
      cover(900, 1120, 48, 24, "sandbags"),
      cover(1060, 1120, 48, 24, "sandbags"),
      cover(640, 980, 36, 48, "barrel"),
      cover(1320, 980, 36, 48, "barrel"),
      cover(980, 880, 70, 26, "barrier"),
      cover(280, 540, 40, 40, "crate"),
      cover(1680, 540, 40, 40, "crate"),
      cover(980, 500, 48, 24, "sandbags"),
      cover(860, 360, 40, 40, "tires"),
      cover(1120, 360, 40, 40, "tires"),
      cover(200, 1200, 44, 44, "ammo"),
      cover(1760, 1200, 44, 44, "ammo"),
      cover(980, 200, 52, 28, "sandbags"),
    ],
  },
  hamlet: {
    id: "hamlet",
    nameZh: "河谷村",
    nameEn: "Hamlet",
    w: 2000,
    h: 1600,
    ground: "scrub",
    spawn: { x: 1000, y: 1460 },
    walls: [
      ...border(2000, 1600),
      ...ring(160, 1080, 260, 200, 16, { side: "e" }),
      ...ring(1580, 1080, 260, 200, 16, { side: "w" }),
      ...ring(220, 620, 280, 210, 16, { side: "s" }),
      ...ring(1500, 620, 280, 210, 16, { side: "s" }),
      ...ring(820, 180, 360, 240, 16, { side: "s" }),
      ...ring(820, 780, 360, 220, 16, { side: "n" }),
    ],
    cover: [
      cover(940, 1320, 64, 26, "sandbags"),
      cover(1080, 1320, 48, 24, "sandbags"),
      cover(700, 1200, 52, 52, "bush", false),
      cover(1240, 1200, 52, 52, "bush", false),
      cover(480, 980, 36, 36, "rocks"),
      cover(1480, 980, 36, 36, "rocks"),
      cover(960, 980, 40, 40, "crate"),
      cover(1080, 980, 36, 48, "barrel"),
      cover(640, 820, 48, 24, "sandbags"),
      cover(1280, 820, 48, 24, "sandbags"),
      cover(360, 480, 52, 52, "bush", false),
      cover(1580, 480, 52, 52, "bush", false),
      cover(980, 560, 40, 40, "crate"),
      cover(200, 860, 46, 46, "tent"),
      cover(1740, 860, 46, 46, "tent"),
      cover(900, 460, 48, 24, "sandbags"),
      cover(1060, 460, 48, 24, "sandbags"),
      cover(980, 320, 40, 40, "ammo"),
    ],
  },
  range: {
    id: "range",
    nameZh: "靶場",
    nameEn: "Range",
    w: 1200,
    h: 800,
    ground: "dirt",
    spawn: { x: 600, y: 680 },
    walls: [...border(1200, 800), box(80, 120, 1040, 16), box(80, 120, 16, 80), box(1104, 120, 16, 80)],
    cover: [
      cover(260, 520, 70, 26, "sandbags"),
      cover(560, 520, 70, 26, "sandbags"),
      cover(860, 520, 70, 26, "sandbags"),
      cover(200, 360, 40, 40, "crate"),
      cover(960, 360, 40, 40, "crate"),
    ],
  },
};

export function mapById(id: MapDef["id"]): MapDef {
  return MAPS[id];
}
