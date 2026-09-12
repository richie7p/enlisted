import type { GameArt, Sheet } from "../assets";
import type { Sim, Unit } from "./sim";

export type Cam = { x: number; y: number; z: number; vw: number; vh: number };

function drawSheet(ctx: CanvasRenderingContext2D, sh: Sheet, frame: number, x: number, y: number, ang: number, scale: number, flash = false) {
  const i = ((frame % (sh.cols * sh.rows)) + sh.cols * sh.rows) % (sh.cols * sh.rows);
  const col = i % sh.cols;
  const row = Math.floor(i / sh.cols);
  const w = sh.cw * scale;
  const h = sh.ch * scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang + Math.PI / 2);
  if (flash) ctx.filter = "brightness(2.4)";
  ctx.drawImage(sh.img, col * sh.cw, row * sh.ch, sh.cw, sh.ch, -w / 2, -h / 2, w, h);
  ctx.filter = "none";
  ctx.restore();
}

function unitSheet(art: GameArt, u: Unit): Sheet {
  if (u.kind === "player") return art.player;
  if (u.kind === "enemy") return art.enemy;
  if (u.kind === "hostage" || u.kind === "civilian") return art.hostage;
  if (u.role === "medic") return art.medic;
  if (u.role === "auto") return art.gunner;
  return art.ally;
}

export function worldToScreen(cam: Cam, x: number, y: number) {
  return { x: (x - cam.x) * cam.z, y: (y - cam.y) * cam.z };
}

export function screenToWorld(cam: Cam, x: number, y: number) {
  return { x: x / cam.z + cam.x, y: y / cam.z + cam.y };
}

export function renderWorld(
  ctx: CanvasRenderingContext2D,
  sim: Sim,
  art: GameArt,
  cam: Cam,
  now: number,
) {
  const { vw, vh } = cam;
  ctx.save();
  ctx.fillStyle = "#1a1812";
  ctx.fillRect(0, 0, vw, vh);
  const sx = (sim.shake * sim.shake) * 10 * (Math.random() - 0.5);
  const sy = (sim.shake * sim.shake) * 10 * (Math.random() - 0.5);
  ctx.translate(sx, sy);
  ctx.scale(cam.z, cam.z);
  ctx.translate(-cam.x, -cam.y);

  const ground = art.ground[sim.map.ground] ?? art.ground.dirt;
  const pat = ctx.createPattern(ground, "repeat");
  if (pat) {
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, sim.map.w, sim.map.h);
  } else {
    ctx.fillStyle = "#3d3428";
    ctx.fillRect(0, 0, sim.map.w, sim.map.h);
  }

  ctx.fillStyle = "rgba(8,10,6,0.55)";
  for (const w of sim.map.walls) ctx.fillRect(w.x, w.y, w.w, w.h);
  ctx.strokeStyle = "rgba(70,82,58,0.8)";
  ctx.lineWidth = 2;
  for (const w of sim.map.walls) ctx.strokeRect(w.x + 0.5, w.y + 0.5, w.w, w.h);

  for (const c of sim.map.cover) {
    const img = art.props[c.kind];
    if (img) ctx.drawImage(img, c.x - 6, c.y - 6, c.w + 12, c.h + 12);
    else {
      ctx.fillStyle = "#5a5344";
      ctx.fillRect(c.x, c.y, c.w, c.h);
    }
  }

  for (const o of sim.objs) {
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
    ctx.strokeStyle = o.done ? "rgba(155,181,122,0.55)" : o.required ? "rgba(196,181,154,0.5)" : "rgba(138,145,132,0.35)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
    if (!o.done && (o.type === "capture" || o.type === "defend") && o.holdNeed) {
      ctx.beginPath();
      ctx.arc(o.x, o.y, 10, -Math.PI / 2, -Math.PI / 2 + (o.hold / o.holdNeed) * Math.PI * 2);
      ctx.strokeStyle = "#9bb57a";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(12,14,11,0.7)";
    ctx.font = "600 12px 'IBM Plex Sans', sans-serif";
    ctx.fillText(o.label, o.x - 28, o.y - o.r - 8);
  }

  if (sim.orderT && sim.order === "move") {
    ctx.beginPath();
    ctx.arc(sim.orderT.x, sim.orderT.y, 14, 0, Math.PI * 2);
    ctx.strokeStyle = "#9bb57a";
    ctx.stroke();
  }

  for (const n of sim.nades) {
    ctx.fillStyle = "#c4b59a";
    ctx.beginPath();
    ctx.arc(n.x, n.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const u of sim.units) {
    if (u.state === "dead") continue;
    ctx.save();
    ctx.translate(u.x + 6, u.y + 8);
    ctx.scale(1, 0.45);
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.arc(0, 0, u.r + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (sim.droneT > 0 && u.kind === "enemy" && u.state === "ok") {
      ctx.strokeStyle = "rgba(196,69,54,0.7)";
      ctx.beginPath();
      ctx.arc(u.x, u.y, 18, 0, Math.PI * 2);
      ctx.stroke();
    }

    const sh = unitSheet(art, u);
    const fr = Math.floor(u.anim) % 4;
    const alpha = u.state === "down" ? 0.55 : 1;
    ctx.globalAlpha = alpha;
    drawSheet(ctx, sh, fr, u.x, u.y, u.angle, u.kind === "player" ? 0.42 : 0.4, u.flash > 0);
    ctx.globalAlpha = 1;

    if (u.kind === "player" || u.kind === "nco" || u.kind === "ally") {
      ctx.fillStyle = u.kind === "player" ? "#9bb57a" : "#c4b59a";
      ctx.font = "600 11px 'IBM Plex Sans', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(u.kind === "player" ? u.name : u.name, u.x, u.y - 22);
      ctx.textAlign = "start";
      const bw = 26;
      ctx.fillStyle = "rgba(12,14,11,0.7)";
      ctx.fillRect(u.x - bw, u.y + 16, bw * 2, 4);
      ctx.fillStyle = u.state === "down" ? "#c44536" : "#9bb57a";
      ctx.fillRect(u.x - bw, u.y + 16, bw * 2 * (u.hp / u.maxHp), 4);
    } else if (u.kind === "hostage") {
      ctx.fillStyle = "#c4b59a";
      ctx.font = "600 11px 'IBM Plex Sans', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("人質", u.x, u.y - 20);
      ctx.textAlign = "start";
    }
  }

  for (const b of sim.bullets) {
    if (!b.live) continue;
    ctx.strokeStyle = b.team === 0 ? "#e8f0c8" : "#e8a090";
    ctx.lineWidth = b.explosive ? 3 : 1.5;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - b.vx * 0.018, b.y - b.vy * 0.018);
    ctx.stroke();
  }

  for (const pt of sim.parts) {
    const a = Math.max(0, pt.life / pt.max);
    ctx.globalAlpha = a;
    ctx.fillStyle =
      pt.kind === "blood" ? "#7a2018" : pt.kind === "muzzle" ? "#f2d48a" : pt.kind === "burst" ? "#d9b36a" : "#9aa194";
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  for (const f of sim.floaters) {
    ctx.globalAlpha = Math.max(0, f.t);
    ctx.fillStyle = f.color;
    ctx.font = "600 12px 'Barlow Condensed', sans-serif";
    ctx.fillText(f.text, f.x, f.y);
    ctx.globalAlpha = 1;
  }

  ctx.restore();

  drawMinimap(ctx, sim, cam, now);
}

function drawMinimap(ctx: CanvasRenderingContext2D, sim: Sim, cam: Cam, _now: number) {
  const w = 148;
  const h = 110;
  const x = 12;
  const y = cam.vh - h - 14;
  ctx.save();
  ctx.fillStyle = "rgba(12,14,11,0.72)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(196,181,154,0.35)";
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  const sx = w / sim.map.w;
  const sy = h / sim.map.h;
  ctx.fillStyle = "rgba(58,68,52,0.8)";
  for (const wall of sim.map.walls) ctx.fillRect(x + wall.x * sx, y + wall.y * sy, wall.w * sx, wall.h * sy);
  for (const o of sim.objs) {
    ctx.fillStyle = o.done ? "#9bb57a" : "#c4b59a";
    ctx.beginPath();
    ctx.arc(x + o.x * sx, y + o.y * sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const u of sim.units) {
    if (u.state === "dead") continue;
    ctx.fillStyle =
      u.kind === "player" ? "#e6e2d6" : u.kind === "enemy" ? "#c44536" : u.kind === "hostage" ? "#c4b59a" : "#9bb57a";
    ctx.fillRect(x + u.x * sx - 1.5, y + u.y * sy - 1.5, 3, 3);
  }
  ctx.strokeStyle = "rgba(230,226,214,0.5)";
  ctx.strokeRect(x + cam.x * sx, y + cam.y * sy, (cam.vw / cam.z) * sx, (cam.vh / cam.z) * sy);
  ctx.restore();
}
