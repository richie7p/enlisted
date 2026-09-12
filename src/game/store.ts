import { create } from "zustand";
import type { Career, Difficulty, MissionReport, RankId, Screen, Specialty, WeaponId } from "./types";
import { canPromote, rankById } from "./ranks";
import { evaluateNewMedals } from "./medals";
import { clearCareer, defaultCareer, loadCareer, saveCareer, syncUnlocks } from "./save";

type GameStore = {
  screen: Screen;
  career: Career | null;
  missionId: string | null;
  lastReport: MissionReport | null;
  pendingRank: RankId | null;
  newMedals: string[];
  setScreen: (s: Screen) => void;
  setMission: (id: string | null) => void;
  startCareer: (name: string, difficulty: Difficulty) => void;
  continueCareer: () => void;
  resetCareer: () => void;
  patchCareer: (p: Partial<Career>) => void;
  equip: (slot: "primary" | "secondary", id: WeaponId) => void;
  setSpecialty: (s: Specialty) => void;
  applyReport: (report: MissionReport) => void;
  ackPromotion: () => void;
};

function persist(career: Career | null) {
  if (career) saveCareer(career);
}

export const useGame = create<GameStore>((set, get) => ({
  screen: "menu",
  career: null,
  missionId: null,
  lastReport: null,
  pendingRank: null,
  newMedals: [],

  setScreen: (screen) => set({ screen }),
  setMission: (missionId) => set({ missionId }),

  startCareer: (name, difficulty) => {
    const career = syncUnlocks({ ...defaultCareer(name), difficulty });
    persist(career);
    set({ career, screen: "base", lastReport: null, pendingRank: null, missionId: null });
  },

  continueCareer: () => {
    const c = get().career ?? loadCareer();
    if (c) set({ career: c, screen: "base" });
  },

  resetCareer: () => {
    clearCareer();
    set({ career: null, screen: "menu", lastReport: null, pendingRank: null, missionId: null });
  },

  patchCareer: (p) => {
    const cur = get().career;
    if (!cur) return;
    const career = { ...cur, ...p };
    persist(career);
    set({ career });
  },

  equip: (slot, id) => {
    const cur = get().career;
    if (!cur) return;
    const rank = rankById(cur.rankId);
    if (!rank.weapons.includes(id)) return;
    const career = { ...cur, [slot]: id };
    persist(career);
    set({ career });
  },

  setSpecialty: (specialty) => {
    const cur = get().career;
    if (!cur) return;
    const idx = rankById(cur.rankId).index;
    if (idx < 2) return;
    const career = { ...cur, specialty };
    persist(career);
    set({ career });
  },

  applyReport: (report) => {
    const cur = get().career;
    if (!cur) return;
    const medals = [...cur.medals, ...evaluateNewMedals(cur, report)];
    let career: Career = {
      ...cur,
      xp: cur.xp + report.xp,
      merit: Math.max(0, cur.merit + report.merit),
      discipline: Math.max(0, Math.min(100, cur.discipline + report.disciplineDelta)),
      missionsCompleted: cur.missionsCompleted + (report.success ? 1 : 0),
      missionsFailed: cur.missionsFailed + (report.success ? 0 : 1),
      kills: cur.kills + report.kills,
      teammatesRescued: cur.teammatesRescued + report.rescued,
      civiliansKilled: cur.civiliansKilled + report.civilianDeaths,
      medals,
      missionCounts: {
        ...cur.missionCounts,
        [report.missionId]: (cur.missionCounts[report.missionId] ?? 0) + 1,
      },
    };
    career = syncUnlocks(career);
    const promo = canPromote(
      career.rankId,
      career.xp,
      career.merit,
      career.discipline,
      career.missionsCompleted,
    );
    persist(career);
    set({
      career,
      lastReport: report,
      newMedals: medals.filter((id) => !cur.medals.includes(id)),
      pendingRank: promo ? promo.id : null,
      screen: "debrief",
    });
  },

  ackPromotion: () => {
    const { career, pendingRank } = get();
    if (!career || !pendingRank) {
      set({ screen: "base", pendingRank: null });
      return;
    }
    const next = rankById(pendingRank);
    const career2 = syncUnlocks({
      ...career,
      rankId: pendingRank,
      unlockedWeapons: Array.from(new Set([...career.unlockedWeapons, ...next.weapons])),
      promotions: [...career.promotions, { rankId: pendingRank, at: Date.now() }],
    });
    persist(career2);
    set({ career: career2, pendingRank: null, screen: "promotion" });
  },
}));
