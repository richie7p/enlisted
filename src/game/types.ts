export type RankId =
  | "private"
  | "pfc"
  | "specialist"
  | "corporal"
  | "sergeant"
  | "lieutenant"
  | "firstLieutenant"
  | "captain"
  | "major";

export type WeaponId =
  | "m4"
  | "mp5"
  | "m870"
  | "m9"
  | "m249"
  | "m110"
  | "m24"
  | "at4"
  | "m320"
  | "scar"
  | "javelin";

export type Specialty = "rifleman" | "medic" | "auto";

export type Screen =
  | "menu"
  | "newCareer"
  | "base"
  | "armory"
  | "barracks"
  | "record"
  | "missions"
  | "briefing"
  | "combat"
  | "debrief"
  | "promotion"
  | "settings"
  | "credits";

export type Difficulty = "recruit" | "regular" | "veteran" | "hardcore";

export type MissionType = "patrol" | "assault" | "rescue" | "defense" | "range";

export type PropKind =
  | "crate"
  | "barrel"
  | "sandbags"
  | "barrier"
  | "ammo"
  | "bush"
  | "tires"
  | "rocks"
  | "tent";

export type Rect = { x: number; y: number; w: number; h: number };

export type Cover = Rect & { kind: PropKind; block: boolean };

export type ObjectiveType = "waypoint" | "clear" | "capture" | "extract" | "defend" | "destroy" | "rescue";

export type MapId = "route7" | "district9" | "hamlet" | "range";

export type RankDef = {
  id: RankId;
  index: number;
  code: string;
  nameEn: string;
  nameZh: string;
  chevrons: number;
  needXp: number;
  needMerit: number;
  needDisc: number;
  needMissions: number;
  armor: number;
  magBonus: number;
  grenades: number;
  command: number;
  drone: boolean;
  fireSupport: boolean;
  commandCenter: boolean;
  range: boolean;
  weapons: WeaponId[];
  privileges: string[];
};

export type WeaponDef = {
  id: WeaponId;
  name: string;
  className: string;
  damage: number;
  pellets: number;
  rpm: number;
  mag: number;
  reserve: number;
  range: number;
  spread: number;
  recoil: number;
  accuracy: number;
  speed: number;
  reload: number;
  explosive: boolean;
  blast: number;
  rank: RankId;
};

export type Career = {
  version: number;
  name: string;
  rankId: RankId;
  xp: number;
  merit: number;
  discipline: number;
  specialty: Specialty;
  primary: WeaponId;
  secondary: WeaponId;
  unlockedWeapons: WeaponId[];
  missionsCompleted: number;
  missionsFailed: number;
  kills: number;
  teammatesRescued: number;
  civiliansKilled: number;
  medals: string[];
  promotions: { rankId: RankId; at: number }[];
  startedAt: number;
  playSeconds: number;
  difficulty: Difficulty;
  settings: { sfx: number; music: number; shake: boolean };
  missionCounts: Record<string, number>;
};

export type MissionReport = {
  missionId: string;
  success: boolean;
  grade: "S" | "A" | "B" | "C" | "D" | "F";
  kills: number;
  playerDamage: number;
  allyDeaths: number;
  civilianDeaths: number;
  ammoUsed: number;
  timeSec: number;
  rescued: number;
  secondaries: number;
  xp: number;
  merit: number;
  disciplineDelta: number;
  leftSquad: boolean;
};

export type MedalDef = {
  id: string;
  nameZh: string;
  nameEn: string;
  desc: string;
};

export type EnemySpawn = {
  x: number;
  y: number;
  role?: Specialty;
  patrol?: { x: number; y: number }[];
};

export type ObjectiveDef = {
  id: string;
  type: ObjectiveType;
  x: number;
  y: number;
  r: number;
  label: string;
  required: boolean;
  holdNeed?: number;
};

export type MissionDef = {
  id: string;
  nameZh: string;
  nameEn: string;
  type: MissionType;
  mapId: MapId;
  minRank: RankId;
  briefing: string;
  intel: string[];
  enemies: EnemySpawn[];
  civilians?: { x: number; y: number }[];
  hostage?: { x: number; y: number };
  objectives: ObjectiveDef[];
  waves?: { t: number; spawns: EnemySpawn[] }[];
};

export type MapDef = {
  id: MapId;
  nameZh: string;
  nameEn: string;
  w: number;
  h: number;
  ground: "dirt" | "asphalt" | "scrub";
  walls: Rect[];
  cover: Cover[];
  spawn: { x: number; y: number };
};

export type SquadOrder = "follow" | "hold" | "attack" | "defend" | "regroup" | "move";
