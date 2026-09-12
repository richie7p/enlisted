import type { Career, MedalDef, MissionReport } from "./types";
import { rankById } from "./ranks";

export const MEDALS: MedalDef[] = [
  { id: "first_op", nameZh: "初陣", nameEn: "First Operation", desc: "完成第一次任務" },
  { id: "ten_ops", nameZh: "老兵", nameEn: "Ten Ops", desc: "完成 10 次任務" },
  { id: "twenty_ops", nameZh: "百戰", nameEn: "Twenty Ops", desc: "完成 20 次任務" },
  { id: "guardian", nameZh: "守護者", nameEn: "Guardian", desc: "救援隊友累計 10 次" },
  { id: "clean", nameZh: "零傷亡", nameEn: "Clean Sweep", desc: "任務無友軍陣亡" },
  { id: "marksman", nameZh: "射手", nameEn: "Marksman", desc: "單場擊殺 18 人" },
  { id: "commander", nameZh: "指揮官", nameEn: "Field Commander", desc: "有指揮權時完成任務" },
  { id: "s_rank", nameZh: "優等", nameEn: "Meritorious", desc: "取得 S 評價" },
  { id: "oak_leaf", nameZh: "金橡", nameEn: "Oak Leaf", desc: "以少校階級完成任務" },
];

export function evaluateNewMedals(career: Career, report: MissionReport): string[] {
  const have = new Set(career.medals);
  const earned: string[] = [];
  const add = (id: string) => {
    if (!have.has(id)) earned.push(id);
  };
  const done = career.missionsCompleted + (report.success ? 1 : 0);
  if (done >= 1) add("first_op");
  if (done >= 10) add("ten_ops");
  if (done >= 20) add("twenty_ops");
  if (career.teammatesRescued + report.rescued >= 10) add("guardian");
  if (report.success && report.allyDeaths === 0) add("clean");
  if (report.kills >= 18) add("marksman");
  if (report.success && rankById(career.rankId).command > 0) add("commander");
  if (report.grade === "S") add("s_rank");
  if (report.success && career.rankId === "major") add("oak_leaf");
  return earned;
}