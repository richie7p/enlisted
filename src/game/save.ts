import { z } from "zod";
import { readStored, writeStored } from "./storage";
import type { Career } from "./types";
import { rankById } from "./ranks";

export const SAVE_KEY = "enlisted.career.v1";
export const SAVE_VERSION = 1;

export function defaultCareer(name = "新兵"): Career {
  return {
    version: SAVE_VERSION,
    name: name.trim().slice(0, 100) || "新兵",
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

const rank = z.enum(["private", "pfc", "specialist", "corporal", "sergeant", "lieutenant", "firstLieutenant", "captain", "major"]);
const weapon = z.enum(["m4", "mp5", "m870", "m9", "m249", "m110", "m24", "at4", "m320", "scar", "javelin"]);
const nonnegative = z.number().finite().nonnegative();
const schema = z.object({
  version: z.number().int().min(0).max(SAVE_VERSION), name: z.string().min(1).max(100), rankId: rank,
  xp: nonnegative, merit: nonnegative, discipline: z.number().min(0).max(100),
  specialty: z.enum(["rifleman", "medic", "auto"]), primary: weapon, secondary: weapon,
  unlockedWeapons: z.array(weapon), missionsCompleted: nonnegative, missionsFailed: nonnegative,
  kills: nonnegative, teammatesRescued: nonnegative, civiliansKilled: nonnegative,
  medals: z.array(z.string()), promotions: z.array(z.object({ rankId: rank, at: nonnegative })),
  startedAt: nonnegative, playSeconds: nonnegative, difficulty: z.enum(["recruit", "regular", "veteran", "hardcore"]),
  settings: z.object({ sfx: z.number().min(0).max(1), music: z.number().min(0).max(1), shake: z.boolean() }),
  missionCounts: z.record(z.string(), nonnegative),
});
export function parseCareer(text: string): Career {
  const raw: unknown = JSON.parse(text);
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || !("name" in raw)) throw new Error("Invalid career");
  const data = raw as Partial<Career>;
  const base = defaultCareer();
  const validated = schema.parse({ ...base, ...data, settings: { ...base.settings, ...data.settings } });
  return syncUnlocks({ ...validated, version: SAVE_VERSION });
}
export function loadCareer(): Career | null {
  return readStored(SAVE_KEY, SAVE_KEY + ".bak", parseCareer);
}
export function saveCareer(career: Career): boolean {
  return writeStored(SAVE_KEY, SAVE_KEY + ".bak", career, parseCareer);
}
export function clearCareer(): void {
  try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(SAVE_KEY + ".bak"); }
  catch { /* Storage may be unavailable. */ }
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
