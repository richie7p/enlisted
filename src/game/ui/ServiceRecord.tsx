import { useGame } from "../store";
import { RANKS, rankById } from "../ranks";
import { MEDALS } from "../medals";
import { MilButton, Panel } from "./chrome";

export function ServiceRecord() {
  const career = useGame((s) => s.career);
  const setScreen = useGame((s) => s.setScreen);
  if (!career) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-ink p-5">
        <MilButton onClick={() => setScreen("menu")}>返回</MilButton>
      </div>
    );
  }
  const rank = rankById(career.rankId);
  const days = Math.max(1, Math.round((Date.now() - career.startedAt) / 86400000));
  return (
    <div className="min-h-dvh overflow-auto bg-ink p-5">
      <div className="mx-auto max-w-lg pb-10">
        <p className="font-mono text-[11px] tracking-[0.24em] text-hud">SERVICE RECORD</p>
        <h2 className="font-display text-4xl tracking-[0.1em] text-khaki">{career.name}</h2>
        <p className="text-sm text-muted">
          {rank.code} {rank.nameZh} · 服役 {days} 日
        </p>
        <Panel className="mt-4 grid grid-cols-2 gap-3 p-4 font-mono text-xs text-muted">
          <span>完成任務 {career.missionsCompleted}</span>
          <span>失敗 {career.missionsFailed}</span>
          <span>擊殺 {career.kills}</span>
          <span>救援 {career.teammatesRescued}</span>
          <span>XP {career.xp}</span>
          <span>功績 {career.merit}</span>
          <span>紀律 {career.discipline}</span>
          <span>難度 {career.difficulty}</span>
        </Panel>
        <h3 className="mt-6 font-display text-xl tracking-wider text-khaki">晉升紀錄</h3>
        <ol className="mt-2 space-y-1 text-sm text-muted">
          {career.promotions.map((p) => (
            <li key={p.at}>
              {rankById(p.rankId).nameZh}{" "}
              <span className="font-mono text-[10px]">{new Date(p.at).toLocaleDateString()}</span>
            </li>
          ))}
        </ol>
        <div className="mt-3 font-mono text-[11px] leading-relaxed">
          {RANKS.map((r, i) => (
            <span key={r.id} className={r.index <= rank.index ? "text-khaki" : "text-muted/40"}>
              {i > 0 ? " → " : ""}
              {r.nameZh}
            </span>
          ))}
        </div>
        <h3 className="mt-6 font-display text-xl tracking-wider text-khaki">勳章</h3>
        <ul className="mt-2 space-y-2">
          {MEDALS.map((m) => {
            const got = career.medals.includes(m.id);
            return (
              <li key={m.id} className={got ? "text-fg" : "text-muted/50"}>
                <span className="font-display tracking-wider">{got ? m.nameZh : "未授予"}</span>
                <span className="ml-2 text-xs">{m.desc}</span>
              </li>
            );
          })}
        </ul>
        <MilButton className="mt-6" variant="ghost" onClick={() => setScreen(career ? "base" : "menu")}>
          返回
        </MilButton>
      </div>
    </div>
  );
}
