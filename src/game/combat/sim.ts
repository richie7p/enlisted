import type {
  Career,
  MapDef,
  MissionDef,
  MissionReport,
  ObjectiveDef,
  Rect,
  Specialty,
  SquadOrder,
  WeaponId,
} from "../types";
import type { GameActions } from "../input";
import { rankById } from "../ranks";
import { weaponById } from "../weapons";
import { astar, buildGrid, circleRect, los, resolveWalls, type Grid } from "../pathfinding";

const ALLY_NAMES = ["Hale", "Ortiz", "Chen", "Brooks", "Vasquez", "Diaz", "Walsh", "Park", "Nguyen", "Sato"];

export type Team = 0 | 1;

export type UnitKind = "player" | "ally" | "nco" | "enemy" | "hostage" | "civilian";

export type Unit = {
  id: string;
  kind: UnitKind;
  name: string;
  role: Specialty;
  team: Team;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  hp: number;
  maxHp: number;
  armor: number;
  maxArmor: number;
  r: number;
  speed: number;
  weapon: WeaponId;
  mag: number;
  reserve: number;
  reloadT: number;
  fireCd: number;
  state: "ok" | "down" | "dead";
  downT: number;
  morale: number;
  suppress: number;
  crouch: boolean;
  flash: number;
  anim: number;
  wantX: number;
  wantY: number;
  path: { x: number; y: number }[];
  pathI: number;
  think: number;
  stuck: number;
  mode: SquadOrder | "patrol" | "cover" | "revive" | "flee" | "idle";
  patrol: { x: number; y: number }[];
  patrolI: number;
};

export type Bullet = {
  live: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  team: Team;
  ttl: number;
  owner: string;
  explosive: boolean;
  blast: number;
};

export type Nade = { x: number; y: number; vx: number; vy: number; fuse: number; team: Team };

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  kind: "spark" | "smoke" | "blood" | "muzzle" | "burst";
  r: number;
};

export type Floater = { x: number; y: number; t: number; text: string; color: string };

export type ObjState = ObjectiveDef & { done: boolean; hold: number };

export type Sim = {
  map: MapDef;
  mission: MissionDef;
  career: Career;
  grid: Grid;
  solids: Rect[];
  losSolids: Rect[];
  units: Unit[];
  playerId: string;
  ncoId: string | null;
  bullets: Bullet[];
  nades: Nade[];
  parts: Particle[];
  floaters: Floater[];
  time: number;
  objs: ObjState[];
  order: SquadOrder;
  orderT: { x: number; y: number } | null;
  radio: { text: string; t: number }[];
  shake: number;
  hitstop: number;
  droneT: number;
  supportCd: number;
  gCount: number;
  usingPrimary: boolean;
  ended: null | "win" | "fail";
  failReason: string;
  stats: {
    kills: number;
    playerDamage: number;
    allyDeaths: number;
    civilianDeaths: number;
    ammoUsed: number;
    rescued: number;
    leftSquad: boolean;
    leftTime: number;
    wavesFired: number;
  };
  dummy: boolean;
  difficultyMul: { dmg: number; hp: number; acc: number };
  nextId: number;
  booms: { at: number; x: number; y: number; r: number; dmg: number }[];
};

function uid(sim: Sim, p: string) {
  sim.nextId += 1;
  return p + sim.nextId;
}

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function pick<T>(arr: T[], i: number) {
  return arr[i % arr.length];
}

function diffMul(d: Career["difficulty"]) {
  if (d === "recruit") return { dmg: 0.7, hp: 0.85, acc: 0.72 };
  if (d === "veteran") return { dmg: 1.28, hp: 1.12, acc: 1.08 };
  if (d === "hardcore") return { dmg: 1.55, hp: 1.22, acc: 1.18 };
  return { dmg: 1, hp: 1, acc: 1 };
}

function mkUnit(sim: Sim, p: Partial<Unit> & Pick<Unit, "kind" | "x" | "y" | "team" | "weapon">): Unit {
  const w = weaponById(p.weapon);
  const rank = rankById(sim.career.rankId);
  const isPlayer = p.kind === "player";
  const hp = p.kind === "enemy" ? 62 * sim.difficultyMul.hp : p.kind === "civilian" || p.kind === "hostage" ? 50 : 100;
  const armor = isPlayer ? rank.armor : p.kind === "enemy" ? 18 : 40;
  return {
    id: p.id ?? uid(sim, p.kind[0]!),
    kind: p.kind,
    name: p.name ?? "Unit",
    role: p.role ?? "rifleman",
    team: p.team,
    x: p.x,
    y: p.y,
    vx: 0,
    vy: 0,
    angle: p.angle ?? -Math.PI / 2,
    hp,
    maxHp: hp,
    armor,
    maxArmor: armor,
    r: p.kind === "hostage" ? 12 : 14,
    speed: p.kind === "enemy" ? 128 : p.kind === "civilian" ? 90 : 168,
    weapon: p.weapon,
    mag: w.mag + (isPlayer ? rank.magBonus * 0 : 0),
    reserve: w.reserve,
    reloadT: 0,
    fireCd: 0.2 + Math.random() * 0.4,
    state: "ok",
    downT: 0,
    morale: 0.75 + Math.random() * 0.2,
    suppress: 0,
    crouch: false,
    flash: 0,
    anim: Math.random() * 4,
    wantX: p.x,
    wantY: p.y,
    path: [],
    pathI: 0,
    think: Math.random() * 0.4,
    stuck: 0,
    mode: p.mode ?? "follow",
    patrol: p.patrol ?? [],
    patrolI: 0,
  };
}

function radio(sim: Sim, text: string) {
  sim.radio.unshift({ text, t: 4.2 });
  if (sim.radio.length > 4) sim.radio.pop();
}

export function createSim(mission: MissionDef, map: MapDef, career: Career): Sim {
  const rank = rankById(career.rankId);
  const dummy = mission.type === "range";
  const sim: Sim = {
    map,
    mission,
    career,
    grid: buildGrid(map),
    solids: [...map.walls, ...map.cover.filter((c) => c.block)],
    losSolids: [...map.walls, ...map.cover.filter((c) => c.block && c.kind !== "bush")],
    units: [],
    playerId: "",
    ncoId: null,
    bullets: Array.from({ length: 220 }, () => ({
      live: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      dmg: 0,
      team: 0,
      ttl: 0,
      owner: "",
      explosive: false,
      blast: 0,
    })),
    nades: [],
    parts: [],
    floaters: [],
    time: 0,
    objs: mission.objectives.map((o) => ({ ...o, done: false, hold: 0 })),
    order: "follow",
    orderT: null,
    radio: [],
    shake: 0,
    hitstop: 0,
    droneT: 0,
    supportCd: 0,
    gCount: rank.grenades,
    usingPrimary: true,
    ended: null,
    failReason: "",
    stats: {
      kills: 0,
      playerDamage: 0,
      allyDeaths: 0,
      civilianDeaths: 0,
      ammoUsed: 0,
      rescued: 0,
      leftSquad: false,
      leftTime: 0,
      wavesFired: 0,
    },
    dummy,
    difficultyMul: diffMul(career.difficulty),
    nextId: 1,
    booms: [],
  };

  const spawn = map.spawn;
  const playerW = career.primary;
  const player = mkUnit(sim, {
    kind: "player",
    name: career.name,
    role: career.specialty,
    team: 0,
    x: spawn.x,
    y: spawn.y,
    weapon: playerW,
  });
  const pw = weaponById(playerW);
  player.mag = pw.mag + rank.magBonus;
  player.reserve = pw.reserve;
  sim.playerId = player.id;
  sim.units.push(player);

  const canCmd = rank.command > 0;
  const allyN = dummy ? 0 : canCmd ? rank.command : 3;
  for (let i = 0; i < allyN; i++) {
    const isNco = !canCmd && i === 0;
    const role: Specialty = i === allyN - 1 && allyN > 1 ? "medic" : i === 1 ? "auto" : "rifleman";
    const w: WeaponId = role === "auto" ? (rank.weapons.includes("m249") ? "m249" : "m4") : "m4";
    const u = mkUnit(sim, {
      kind: isNco ? "nco" : "ally",
      name: isNco ? "SGT Hale" : pick(ALLY_NAMES, i + 1),
      role,
      team: 0,
      x: spawn.x + (i % 2 === 0 ? -36 : 36) * (1 + (i >> 1)),
      y: spawn.y + 28 + 22 * i,
      weapon: w,
      mode: isNco ? "patrol" : "follow",
    });
    if (isNco) sim.ncoId = u.id;
    sim.units.push(u);
  }

  for (const e of mission.enemies) {
    const u = mkUnit(sim, {
      kind: "enemy",
      name: "Hostile",
      role: e.role ?? "rifleman",
      team: 1,
      x: e.x,
      y: e.y,
      weapon: Math.random() < 0.2 ? "mp5" : "m4",
      mode: e.patrol?.length ? "patrol" : "idle",
      patrol: e.patrol ?? [],
    });
    if (dummy) {
      u.hp = u.maxHp = 38;
      u.armor = 0;
      u.speed = 0;
      u.mode = "idle";
    }
    sim.units.push(u);
  }

  if (mission.hostage) {
    sim.units.push(
      mkUnit(sim, {
        kind: "hostage",
        name: "Hostage",
        team: 0,
        x: mission.hostage.x,
        y: mission.hostage.y,
        weapon: "m9",
        mode: "idle",
      }),
    );
  }
  for (const c of mission.civilians ?? []) {
    sim.units.push(
      mkUnit(sim, {
        kind: "civilian",
        name: "Civilian",
        team: 0,
        x: c.x,
        y: c.y,
        weapon: "m9",
        mode: "idle",
      }),
    );
  }

  if (dummy) radio(sim, "RANGE CONTROL：擊倒標靶後回到集合點。");
  else if (!canCmd) radio(sim, "SGT Hale：跟上，不要離隊。看我手勢。");
  else radio(sim, `通訊：${rank.nameZh}，小隊聽候你的命令。`);

  return sim;
}

function playerOf(sim: Sim) {
  return sim.units.find((u) => u.id === sim.playerId)!;
}

function spawnBullet(sim: Sim, u: Unit, ang: number, w = weaponById(u.weapon)) {
  const b = sim.bullets.find((x) => !x.live);
  if (!b) return;
  const muzzle = u.r + 10;
  b.live = true;
  b.x = u.x + Math.cos(ang) * muzzle;
  b.y = u.y + Math.sin(ang) * muzzle;
  b.vx = Math.cos(ang) * w.speed;
  b.vy = Math.sin(ang) * w.speed;
  b.dmg = w.damage * (u.team === 1 ? sim.difficultyMul.dmg : 1);
  b.team = u.team;
  b.ttl = w.range / w.speed;
  b.owner = u.id;
  b.explosive = w.explosive;
  b.blast = w.blast;
}

function burst(sim: Sim, x: number, y: number, kind: Particle["kind"], n: number, spd: number, r: number) {
  for (let i = 0; i < n; i++) {
    if (sim.parts.length > 180) sim.parts.shift();
    const a = Math.random() * Math.PI * 2;
    const s = spd * (0.3 + Math.random());
    sim.parts.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 0.2 + Math.random() * 0.35,
      max: 0.5,
      kind,
      r: r * (0.6 + Math.random()),
    });
  }
}

function boom(sim: Sim, x: number, y: number, radius: number, dmg: number, team: Team, owner: string) {
  burst(sim, x, y, "burst", 18, 220, 6);
  burst(sim, x, y, "smoke", 10, 70, 10);
  sim.shake = Math.max(sim.shake, 0.85);
  for (const u of sim.units) {
    if (u.state === "dead") continue;
    const d = Math.hypot(u.x - x, u.y - y);
    if (d > radius) continue;
    const fall = 1 - d / radius;
    hurt(sim, u, dmg * fall, owner, team);
  }
}

function hurt(sim: Sim, u: Unit, dmg: number, owner: string, fromTeam: Team) {
  if (u.state !== "ok") return;
  let left = dmg;
  if (u.armor > 0) {
    const soak = Math.min(u.armor, left * 0.65);
    u.armor -= soak;
    left -= soak;
  }
  u.hp -= left;
  u.flash = 0.08;
  u.suppress = Math.min(1, u.suppress + 0.25);
  u.morale = clamp(u.morale - 0.06, 0.15, 1);
  if (u.kind === "player") {
    sim.stats.playerDamage += dmg;
    sim.hitstop = 0.04;
    sim.shake = Math.max(sim.shake, 0.45);
  }
  if (u.kind === "civilian" && fromTeam === 0) {
    sim.career.discipline = Math.max(0, sim.career.discipline);
  }
  burst(sim, u.x, u.y, "blood", 5, 80, 2.5);
  if (u.hp <= 0) {
    u.hp = 0;
    if (u.kind === "enemy" || u.kind === "civilian") {
      u.state = "dead";
      if (u.kind === "enemy") {
        sim.stats.kills += 1;
        const src = sim.units.find((x) => x.id === owner);
        if (src?.kind === "player") sim.floaters.push({ x: u.x, y: u.y - 18, t: 0.8, text: "+XP", color: "#9bb57a" });
      } else {
        sim.stats.civilianDeaths += 1;
      }
    } else {
      u.state = "down";
      u.downT = 12;
      if (u.kind === "ally" || u.kind === "nco") sim.stats.allyDeaths += 0;
    }
  }
}

function tryFire(sim: Sim, u: Unit, aimX: number, aimY: number) {
  if (u.state !== "ok" || u.reloadT > 0 || u.fireCd > 0) return;
  if (u.kind === "civilian" || u.kind === "hostage") return;
  const w = weaponById(u.weapon);
  if (u.mag <= 0) {
    startReload(u);
    return;
  }
  const base = Math.atan2(aimY - u.y, aimX - u.x);
  u.angle = base;
  const acc = w.accuracy * (u.crouch ? 1.25 : 1) * (1 - u.suppress * 0.35) * (u.team === 1 ? sim.difficultyMul.acc : 1);
  const spread = w.spread / Math.max(0.35, acc);
  for (let i = 0; i < w.pellets; i++) {
    const a = base + (Math.random() - 0.5) * spread * 2;
    spawnBullet(sim, u, a, w);
  }
  u.mag -= 1;
  u.fireCd = 60 / w.rpm;
  u.flash = 0.05;
  if (u.kind === "player") sim.stats.ammoUsed += 1;
  burst(sim, u.x + Math.cos(base) * (u.r + 12), u.y + Math.sin(base) * (u.r + 12), "muzzle", 3, 40, 3);
  if (u.mag <= 0) startReload(u);
}

function startReload(u: Unit) {
  if (u.reloadT > 0 || u.reserve <= 0 || u.mag >= weaponById(u.weapon).mag) return;
  u.reloadT = weaponById(u.weapon).reload;
}

function finishReload(u: Unit) {
  const w = weaponById(u.weapon);
  const need = w.mag - u.mag;
  const take = Math.min(need, u.reserve);
  u.mag += take;
  u.reserve -= take;
}

function coverBonus(sim: Sim, u: Unit, fromX: number, fromY: number) {
  for (const c of sim.map.cover) {
    if (!circleRect(u.x, u.y, u.r + 16, c)) continue;
    const cx = c.x + c.w / 2;
    const cy = c.y + c.h / 2;
    const away = (u.x - fromX) * (u.x - cx) + (u.y - fromY) * (u.y - cy);
    if (away > 0) return 0.4;
    return 0.7;
  }
  return 1;
}

function nearestEnemy(sim: Sim, u: Unit, range = 900) {
  let best: Unit | null = null;
  let bd = range;
  for (const o of sim.units) {
    if (o.team === u.team || o.state === "dead") continue;
    if (o.kind === "civilian" || o.kind === "hostage") continue;
    const d = Math.hypot(o.x - u.x, o.y - u.y);
    if (d < bd && los(sim.losSolids, u.x, u.y, o.x, o.y)) {
      bd = d;
      best = o;
    }
  }
  return best;
}

function setWant(u: Unit, x: number, y: number) {
  u.wantX = x;
  u.wantY = y;
}

function followPath(sim: Sim, u: Unit, dt: number, speed: number) {
  if (u.pathI >= u.path.length) {
    const dx = u.wantX - u.x;
    const dy = u.wantY - u.y;
    const d = Math.hypot(dx, dy);
    if (d < 8) {
      u.vx = 0;
      u.vy = 0;
      return;
    }
    u.vx = (dx / d) * speed;
    u.vy = (dy / d) * speed;
    return;
  }
  const t = u.path[u.pathI]!;
  const dx = t.x - u.x;
  const dy = t.y - u.y;
  const d = Math.hypot(dx, dy);
  if (d < 18) {
    u.pathI += 1;
    return;
  }
  u.vx = (dx / d) * speed;
  u.vy = (dy / d) * speed;
}

function maybeRepath(sim: Sim, u: Unit) {
  u.path = astar(sim.grid, u.x, u.y, u.wantX, u.wantY);
  u.pathI = 0;
}

function coverSlot(sim: Sim, u: Unit, threat: Unit): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null;
  let score = 1e9;
  for (const c of sim.map.cover) {
    const cx = c.x + c.w / 2;
    const cy = c.y + c.h / 2;
    const dx = cx - threat.x;
    const dy = cy - threat.y;
    const d = Math.hypot(dx, dy) || 1;
    const sx = cx + (dx / d) * (Math.max(c.w, c.h) * 0.5 + 22);
    const sy = cy + (dy / d) * (Math.max(c.w, c.h) * 0.5 + 22);
    const sd = Math.hypot(sx - u.x, sy - u.y) + Math.hypot(sx - threat.x, sy - threat.y) * 0.3;
    if (sd < score) {
      score = sd;
      best = { x: sx, y: sy };
    }
  }
  return best;
}

function thinkAlly(sim: Sim, u: Unit, dt: number) {
  const p = playerOf(sim);
  const leader = sim.ncoId ? sim.units.find((x) => x.id === sim.ncoId) ?? p : p;
  if (u.role === "medic") {
    const down = sim.units.find((o) => o.team === 0 && o.state === "down" && o.kind !== "civilian");
    if (down) {
      u.mode = "revive";
      setWant(u, down.x, down.y);
      if (Math.hypot(down.x - u.x, down.y - u.y) < 28) {
        down.state = "ok";
        down.hp = down.maxHp * 0.45;
        down.armor = down.maxArmor * 0.2;
        sim.stats.rescued += 1;
        radio(sim, `${u.name}：完成救治。`);
      }
    }
  }
  const threat = nearestEnemy(sim, u, 520);
  if (u.kind === "nco") {
    const nextWp = sim.objs.find((o) => !o.done && o.required);
    if (nextWp && (nextWp.type === "waypoint" || nextWp.type === "capture" || nextWp.type === "extract")) {
      const pDist = Math.hypot(p.x - u.x, p.y - u.y);
      if (pDist > 230) setWant(u, u.x, u.y);
      else setWant(u, nextWp.x, nextWp.y);
    } else if (threat) {
      const slot = coverSlot(sim, u, threat);
      if (slot) setWant(u, slot.x, slot.y);
    }
    if (threat && Math.hypot(threat.x - u.x, threat.y - u.y) < 480) tryFire(sim, u, threat.x, threat.y);
    return;
  }
  if (sim.ncoId && rankById(sim.career.rankId).command === 0) {
    const nco = leader;
    const idx = sim.units.filter((x) => x.kind === "ally").indexOf(u);
    setWant(u, nco.x + Math.cos(idx) * 40, nco.y + 34 + (idx % 2) * 20);
    if (threat) tryFire(sim, u, threat.x, threat.y);
    return;
  }
  const order = sim.order;
  if (order === "follow" || order === "regroup") {
    const idx = sim.units.filter((x) => x.kind === "ally" && x.state !== "dead").indexOf(u);
    const ang = p.angle + Math.PI + (idx - 1) * 0.5;
    setWant(u, p.x + Math.cos(ang) * (46 + idx * 18), p.y + Math.sin(ang) * (46 + idx * 18));
  } else if (order === "hold" || order === "defend") {
    if (sim.orderT) setWant(u, sim.orderT.x + (u.id.charCodeAt(1) % 5) * 12, sim.orderT.y);
    else setWant(u, u.x, u.y);
  } else if (order === "attack") {
    if (threat) {
      const slot = coverSlot(sim, u, threat);
      setWant(u, slot?.x ?? threat.x, slot?.y ?? threat.y);
    }
  } else if (order === "move" && sim.orderT) {
    const idx = sim.units.filter((x) => x.kind === "ally").indexOf(u);
    setWant(u, sim.orderT.x + (idx - 1) * 28, sim.orderT.y + (idx % 2) * 24);
  }
  if (threat) {
    if (order !== "hold") {
      const slot = coverSlot(sim, u, threat);
      if (slot && Math.hypot(slot.x - u.x, slot.y - u.y) < 240) setWant(u, slot.x, slot.y);
    }
    tryFire(sim, u, threat.x, threat.y);
  }
}

function thinkEnemy(sim: Sim, u: Unit) {
  if (sim.dummy) return;
  const p = playerOf(sim);
  if (u.mode === "patrol" && u.patrol.length) {
    const t = u.patrol[u.patrolI % u.patrol.length]!;
    if (Math.hypot(t.x - u.x, t.y - u.y) < 24) u.patrolI += 1;
    else setWant(u, t.x, t.y);
  }
  const threat = nearestEnemy(sim, u, 640) ?? (Math.hypot(p.x - u.x, p.y - u.y) < 720 ? p : null);
  if (!threat || threat.state !== "ok") return;
  const d = Math.hypot(threat.x - u.x, threat.y - u.y);
  if (d < 620 && los(sim.losSolids, u.x, u.y, threat.x, threat.y)) {
    u.morale = clamp(u.morale - 0.002, 0.2, 1);
    const slot = coverSlot(sim, u, threat);
    if (slot && d > 90) setWant(u, slot.x, slot.y);
    else if (d < 90) setWant(u, u.x + (u.x - threat.x) * 0.2, u.y + (u.y - threat.y) * 0.2);
    if (u.morale < 0.32 && d < 260) {
      setWant(u, u.x - (threat.x - u.x), u.y - (threat.y - u.y));
    }
    if (d < weaponById(u.weapon).range * 0.9) tryFire(sim, u, threat.x, threat.y);
  }
}

function thinkCivilian(sim: Sim, u: Unit) {
  const danger = sim.units.find(
    (o) => o.kind === "enemy" && o.state === "ok" && Math.hypot(o.x - u.x, o.y - u.y) < 220,
  );
  if (danger || u.suppress > 0.2) {
    u.mode = "flee";
    setWant(u, clamp(u.x + (Math.random() - 0.5) * 200, 40, sim.map.w - 40), clamp(u.y + 80, 40, sim.map.h - 40));
  }
}

function moveUnit(sim: Sim, u: Unit, dt: number) {
  if (u.state !== "ok") {
    u.vx = 0;
    u.vy = 0;
    return;
  }
  if (u.kind === "player") return;
  const spd = u.speed * (u.crouch ? 0.55 : 1) * (0.75 + u.morale * 0.25);
  const before = Math.hypot(u.wantX - u.x, u.wantY - u.y);
  followPath(sim, u, dt, spd);
  if (Math.hypot(u.vx, u.vy) < 8 && before > 30) {
    u.stuck += dt;
    if (u.stuck > 0.45) {
      maybeRepath(sim, u);
      u.stuck = 0;
    }
  } else u.stuck = 0;
}

function integrate(sim: Sim, u: Unit, dt: number) {
  if (u.state !== "ok") return;
  let nx = u.x + u.vx * dt;
  let ny = u.y + u.vy * dt;
  const resolved = resolveWalls(nx, ny, u.r, sim.solids);
  nx = clamp(resolved.x, u.r + 4, sim.map.w - u.r - 4);
  ny = clamp(resolved.y, u.r + 4, sim.map.h - u.r - 4);
  u.x = nx;
  u.y = ny;
  if (Math.hypot(u.vx, u.vy) > 12) u.anim += dt * 8;
}

function stepBullets(sim: Sim, dt: number) {
  for (const b of sim.bullets) {
    if (!b.live) continue;
    b.ttl -= dt;
    const nx = b.x + b.vx * dt;
    const ny = b.y + b.vy * dt;
    let hitWall = false;
    for (const s of sim.losSolids) {
      if (nx >= s.x && nx <= s.x + s.w && ny >= s.y && ny <= s.y + s.h) {
        hitWall = true;
        break;
      }
    }
    if (b.ttl <= 0 || hitWall) {
      if (b.explosive) boom(sim, b.x, b.y, b.blast, b.dmg, b.team, b.owner);
      else burst(sim, b.x, b.y, "spark", 4, 60, 2);
      b.live = false;
      continue;
    }
    let consumed = false;
    for (const u of sim.units) {
      if (!u || u.state === "dead") continue;
      if (u.team === b.team && u.id !== "ff") {
        if (u.team === b.team) continue;
      }
      if (u.team === b.team) continue;
      const dx = u.x - nx;
      const dy = u.y - ny;
      if (dx * dx + dy * dy > (u.r + 3) * (u.r + 3)) continue;
      const from = sim.units.find((x) => x.id === b.owner);
      const mul = coverBonus(sim, u, b.x, b.y);
      if (b.explosive) boom(sim, nx, ny, b.blast, b.dmg, b.team, b.owner);
      else {
        hurt(sim, u, b.dmg * mul, b.owner, b.team);
        if (from?.kind === "player" && (u.kind === "ally" || u.kind === "nco")) {
          sim.stats.leftSquad = true;
        }
      }
      burst(sim, nx, ny, "spark", 6, 90, 2);
      b.live = false;
      consumed = true;
      break;
    }
    if (!consumed && b.live) {
      b.x = nx;
      b.y = ny;
    }
  }
}

function stepNades(sim: Sim, dt: number) {
  for (let i = sim.nades.length - 1; i >= 0; i--) {
    const n = sim.nades[i]!;
    n.fuse -= dt;
    n.x += n.vx * dt;
    n.y += n.vy * dt;
    n.vx *= 0.985;
    n.vy *= 0.985;
    const r = resolveWalls(n.x, n.y, 6, sim.solids);
    if (r.x !== n.x || r.y !== n.y) {
      n.vx *= -0.3;
      n.vy *= -0.3;
      n.x = r.x;
      n.y = r.y;
    }
    if (n.fuse <= 0) {
      boom(sim, n.x, n.y, 96, 70, n.team, sim.playerId);
      sim.nades.splice(i, 1);
    }
  }
}

function inCircle(u: Unit, x: number, y: number, r: number) {
  return Math.hypot(u.x - x, u.y - y) <= r;
}

function livingEnemies(sim: Sim) {
  return sim.units.filter((u) => u.kind === "enemy" && u.state !== "dead").length;
}

function stepObjectives(sim: Sim, dt: number) {
  const p = playerOf(sim);
  const hostage = sim.units.find((u) => u.kind === "hostage");
  for (const o of sim.objs) {
    if (o.done) continue;
    if (o.type === "waypoint") {
      if (inCircle(p, o.x, o.y, o.r)) {
        o.done = true;
        radio(sim, `檢查點完成：${o.label}`);
      }
    } else if (o.type === "capture") {
      if (inCircle(p, o.x, o.y, o.r) && p.state === "ok") {
        o.hold += dt;
        if (o.hold >= (o.holdNeed ?? 5)) {
          o.done = true;
          radio(sim, `佔領完成：${o.label}`);
        }
      } else o.hold = Math.max(0, o.hold - dt * 0.4);
    } else if (o.type === "defend") {
      o.hold += dt;
      if (o.hold >= (o.holdNeed ?? 80)) {
        o.done = true;
        radio(sim, "陣地守住了。");
      }
    } else if (o.type === "clear") {
      if (livingEnemies(sim) <= 0) o.done = true;
    } else if (o.type === "destroy") {
      if (livingEnemies(sim) <= 2 && inCircle(p, o.x, o.y, o.r + 40)) {
        o.done = true;
        boom(sim, o.x, o.y, 70, 40, 0, p.id);
        radio(sim, "電台已摧毀。");
      }
      if (inCircle(p, o.x, o.y, o.r) && p.fireCd > 0) {
        o.hold += dt;
        if (o.hold > 0.4) {
          o.done = true;
          boom(sim, o.x, o.y, 80, 50, 0, p.id);
          radio(sim, "電台已摧毀。");
        }
      }
    } else if (o.type === "rescue") {
      if (hostage && hostage.state !== "dead" && Math.hypot(p.x - hostage.x, p.y - hostage.y) < 48) {
        o.done = true;
        hostage.mode = "follow";
        radio(sim, "人質跟上。護送撤離。");
      }
    } else if (o.type === "extract") {
      const needHostage = sim.mission.type === "rescue";
      const hOk = !needHostage || (hostage && hostage.mode === "follow" && inCircle(hostage, o.x, o.y, o.r + 10));
      if (inCircle(p, o.x, o.y, o.r) && hOk) {
        if (sim.mission.type === "range" && livingEnemies(sim) > 0) continue;
        o.done = true;
      }
    }
  }
  const req = sim.objs.filter((o) => o.required);
  if (req.length && req.every((o) => o.done) && !sim.ended) {
    sim.ended = "win";
    radio(sim, "任務完成。準備撤離。");
  }
}

function spawnWave(sim: Sim) {
  const waves = sim.mission.waves ?? [];
  for (let i = 0; i < waves.length; i++) {
    if (sim.stats.wavesFired > i) continue;
    const w = waves[i]!;
    if (sim.time < w.t) continue;
    const living = sim.units.filter((u) => u.kind === "enemy" && u.state !== "dead").length;
    if (living >= 22) continue;
    for (const s of w.spawns) {
      sim.units.push(
        mkUnit(sim, {
          kind: "enemy",
          name: "Hostile",
          team: 1,
          x: s.x,
          y: s.y,
          weapon: "m4",
          mode: "cover",
        }),
      );
    }
    sim.stats.wavesFired = i + 1;
    radio(sim, "接觸！新一波敵軍接近。");
  }
}

function swapWeapon(sim: Sim) {
  const p = playerOf(sim);
  sim.usingPrimary = !sim.usingPrimary;
  const id = sim.usingPrimary ? sim.career.primary : sim.career.secondary;
  p.weapon = id;
  const w = weaponById(id);
  p.mag = w.mag;
  p.reserve = w.reserve;
}

export function stepSim(sim: Sim, dt: number, input: GameActions) {
  if (sim.ended) return;
  if (sim.hitstop > 0) {
    sim.hitstop -= dt;
    dt *= 0.15;
  }
  dt = Math.min(dt, 0.05);
  sim.time += dt;
  sim.shake = Math.max(0, sim.shake - dt * 1.8);
  sim.droneT = Math.max(0, sim.droneT - dt);
  sim.supportCd = Math.max(0, sim.supportCd - dt);
  for (const r of sim.radio) r.t -= dt;
  sim.radio = sim.radio.filter((r) => r.t > 0);
  sim.floaters = sim.floaters.filter((f) => {
    f.t -= dt;
    f.y -= 18 * dt;
    return f.t > 0;
  });
  for (const pt of sim.parts) {
    pt.life -= dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= 0.9;
    pt.vy *= 0.9;
  }
  sim.parts = sim.parts.filter((p) => p.life > 0);

  const p = playerOf(sim);
  const rank = rankById(sim.career.rankId);

  if (p.state === "ok") {
    const spd = p.speed * (input.crouch ? 0.52 : 1);
    p.crouch = input.crouch;
    p.vx = input.moveX * spd;
    p.vy = input.moveY * spd;
    if (input.aimActive) p.angle = Math.atan2(input.aimY, input.aimX);
    else p.angle = Math.atan2(input.worldAimY - p.y, input.worldAimX - p.x);
    if (input.fire) tryFire(sim, p, p.x + Math.cos(p.angle) * 40, p.y + Math.sin(p.angle) * 40);
    if (input.reload) startReload(p);
    if (input.swap) swapWeapon(sim);
    if (input.grenade && sim.gCount > 0) {
      sim.gCount -= 1;
      sim.nades.push({
        x: p.x,
        y: p.y,
        vx: Math.cos(p.angle) * 240,
        vy: Math.sin(p.angle) * 240,
        fuse: 1.15,
        team: 0,
      });
    }
  }

  if (rank.command > 0) {
    if (input.cmd === 1) {
      sim.order = "follow";
      radio(sim, "命令：跟隨。");
    }
    if (input.cmd === 2) {
      sim.order = "hold";
      sim.orderT = { x: p.x, y: p.y };
      radio(sim, "命令：就地防守。");
    }
    if (input.cmd === 3) {
      sim.order = "attack";
      radio(sim, "命令：接敵攻擊。");
    }
    if (input.cmd === 4) {
      sim.order = "defend";
      sim.orderT = { x: p.x, y: p.y };
      radio(sim, "命令：防守此處。");
    }
    if (input.cmd === 5) {
      sim.order = "regroup";
      radio(sim, "命令：集合。");
    }
    if (input.moveOrder) {
      sim.order = "move";
      sim.orderT = input.moveOrder;
      radio(sim, "命令：移動到標記點。");
    }
  }
  if (rank.drone && input.drone && sim.droneT <= 0) {
    sim.droneT = 8 + Math.max(0, rank.index - 4) * 2;
    radio(sim, rank.index >= 7 ? "連級無人機升空。" : "無人機升空。敵蹤標示中。");
  }
  if (rank.fireSupport && (input.support || input.supportOrder) && sim.supportCd <= 0) {
    const tx = input.supportOrder?.x ?? input.worldAimX;
    const ty = input.supportOrder?.y ?? input.worldAimY;
    const volleys = rank.index >= 8 ? 4 : rank.index >= 6 ? 3 : 2;
    const cd = rank.index >= 8 ? 10 : rank.index >= 7 ? 14 : rank.index >= 6 ? 18 : 22;
    const dmg = 110 + (rank.index - 5) * 28;
    sim.supportCd = cd;
    const title = rank.index >= 8 ? "營級火力" : rank.index >= 7 ? "連級火力" : "排級火力";
    radio(sim, `${title}已核准。彈著點標記。`);
    for (let i = 0; i < volleys; i++) {
      const ox = (i - (volleys - 1) / 2) * 28;
      const oy = ((i % 2) * 2 - 1) * 16;
      sim.booms.push({
        at: sim.time + 0.85 + i * 0.16,
        x: tx + ox,
        y: ty + oy,
        r: 120 + rank.index * 4,
        dmg: dmg - i * 12,
      });
    }
  }

  for (const u of sim.units) {
    u.fireCd = Math.max(0, u.fireCd - dt);
    u.flash = Math.max(0, u.flash - dt);
    u.suppress = Math.max(0, u.suppress - dt * 0.35);
    if (u.reloadT > 0) {
      u.reloadT -= dt;
      if (u.reloadT <= 0) finishReload(u);
    }
    if (u.state === "down") {
      u.downT -= dt;
      if (u.downT <= 0) {
        u.state = "dead";
        if (u.kind === "ally" || u.kind === "nco") sim.stats.allyDeaths += 1;
        if (u.kind === "player") {
          sim.ended = "fail";
          sim.failReason = "你失血過多，任務失敗。";
        }
        if (u.kind === "hostage") {
          sim.ended = "fail";
          sim.failReason = "人質身亡。";
        }
      }
    }
    u.think -= dt;
    if (u.think <= 0 && u.state === "ok" && u.kind !== "player") {
      u.think = 0.28 + Math.random() * 0.25;
      if (u.kind === "ally" || u.kind === "nco") thinkAlly(sim, u, dt);
      else if (u.kind === "enemy") thinkEnemy(sim, u);
      else if (u.kind === "civilian") thinkCivilian(sim, u);
      else if (u.kind === "hostage" && u.mode === "follow") {
        setWant(u, p.x - Math.cos(p.angle) * 28, p.y - Math.sin(p.angle) * 28);
      }
      if (Math.hypot(u.wantX - u.x, u.wantY - u.y) > 70) maybeRepath(sim, u);
    }
    moveUnit(sim, u, dt);
    integrate(sim, u, dt);
  }

  const nco = sim.ncoId ? sim.units.find((u) => u.id === sim.ncoId) : null;
  if (nco && nco.state !== "dead" && rank.command === 0) {
    const dist = Math.hypot(p.x - nco.x, p.y - nco.y);
    if (dist > 300 && p.state === "ok") {
      sim.stats.leftTime += dt;
      if (sim.stats.leftTime > 4) sim.stats.leftSquad = true;
    } else sim.stats.leftTime = Math.max(0, sim.stats.leftTime - dt);
  }

  stepBullets(sim, dt);
  stepNades(sim, dt);
  for (let i = sim.booms.length - 1; i >= 0; i--) {
    const b = sim.booms[i]!;
    if (sim.time >= b.at) {
      boom(sim, b.x, b.y, b.r, b.dmg, 0, p.id);
      sim.booms.splice(i, 1);
    }
  }
  spawnWave(sim);
  stepObjectives(sim, dt);

  if (!sim.ended && p.state === "dead") {
    sim.ended = "fail";
    sim.failReason = "陣亡。重新部署。";
  }
}

export function buildReport(sim: Sim): MissionReport {
  const success = sim.ended === "win";
  const secondaries = sim.objs.filter((o) => !o.required && o.done).length;
  let disc = 0;
  if (success) disc += 4;
  else disc -= 8;
  disc -= sim.stats.allyDeaths * 6;
  disc -= sim.stats.civilianDeaths * 18;
  if (sim.stats.leftSquad) disc -= 7;
  let merit = 0;
  if (success) merit += 36;
  merit += secondaries * 18;
  merit += sim.stats.rescued * 22;
  merit += Math.max(0, 12 - sim.stats.allyDeaths * 8);
  merit -= sim.stats.civilianDeaths * 20;
  let xp = success ? 110 : 28;
  xp += sim.stats.kills * 7;
  xp += secondaries * 40;
  xp += sim.stats.rescued * 16;
  if (sim.dummy) {
    xp = success ? 40 : 10;
    merit = success ? 8 : 0;
    disc = success ? 2 : 0;
  }
  let score = success ? 70 : 20;
  score += secondaries * 8;
  score += Math.min(20, sim.stats.kills);
  score -= sim.stats.allyDeaths * 12;
  score -= sim.stats.civilianDeaths * 20;
  score -= sim.stats.playerDamage * 0.08;
  if (sim.stats.leftSquad) score -= 10;
  let grade: MissionReport["grade"] = "F";
  if (success) {
    if (score >= 92) grade = "S";
    else if (score >= 80) grade = "A";
    else if (score >= 68) grade = "B";
    else if (score >= 55) grade = "C";
    else grade = "D";
  }
  return {
    missionId: sim.mission.id,
    success,
    grade,
    kills: sim.stats.kills,
    playerDamage: Math.round(sim.stats.playerDamage),
    allyDeaths: sim.stats.allyDeaths,
    civilianDeaths: sim.stats.civilianDeaths,
    ammoUsed: sim.stats.ammoUsed,
    timeSec: Math.round(sim.time),
    rescued: sim.stats.rescued,
    secondaries,
    xp: Math.max(0, Math.round(xp)),
    merit: Math.round(merit),
    disciplineDelta: Math.round(disc),
    leftSquad: sim.stats.leftSquad,
  };
}
