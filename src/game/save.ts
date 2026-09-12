import type { Career } from "./types";
import { rankById } from "./ranks";

export const SAVE_KEY = "enlisted.career.v1";
export const SAVE_VERSION = 1;

export function defaultCareer(name = "新兵"): Career {
  return {
    version: SAVE_VERSION,
    name: name.trim() || "新兵",
    rankId: "private",
    xp: 0,
    merit: 0,
    discipline: 72,
    specialty: "rifleman",
    primary: "m4",
    secondary: "m9",
    unlockedWeapons: ["m4", "m9", "m870"],
    missionsCompleted: 0,
    missionsFailed: 0,
    kills: 0,
    teammatesRescued: 0,
    civiliansKilled: 0,
    medals: [],
    promotions: [{ rankId: "private", at: Date.now() }],
    startedAt: Date.now(),
    playSeconds: 0,
    difficulty: "regular",
    settings: { sfx: 0.8, music: 0.35, shake: true },
    missionCounts: {},
  };
}

function migrate(raw: Career): Career {
  const base = defaultCareer(raw.name);
  return {
    ...base,
    ...raw,
    version: SAVE_VERSION,
    settings: { ...base.settings, ...raw.settings },
    unlockedWeapons: raw.unlockedWeapons?.length ? raw.unlockedWeapons : base.unlockedWeapons,
    missionCounts: raw.missionCounts ?? {},
    promotions: raw.promotions?.length ? raw.promotions : base.promotions,
  };
}

export function loadCareer(): Career | null {
  try {
    const txt = localStorage.getItem(SAVE_KEY);
    if (!txt) return null;
    const parsed = JSON.parse(txt) as Career;
    if (!parsed || typeof parsed !== "object") return null;
    return migrate(parsed);
  } catch {
    return null;
  }
}

export function saveCareer(career: Career): void {
  try {
    const prev = localStorage.getItem(SAVE_KEY);
    if (prev) localStorage.setItem(SAVE_KEY + ".bak", prev);
    localStorage.setItem(SAVE_KEY, JSON.stringify(career));
  } catch {
    // private mode / quota
  }
}

export function clearCareer(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

export function syncUnlocks(career: Career): Career {
  const allowed = new Set(rankById(career.rankId).weapons);
  const unlocked = Array.from(new Set([...career.unlockedWeapons, ...allowed]));
  let primary = career.primary;
  let secondary = career.secondary;
  if (!allowed.has(primary)) primary = "m4";
  if (!allowed.has(secondary)) secondary = "m9";
  return { ...career, unlockedWeapons: unlocked, primary, secondary };
}
