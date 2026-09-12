import { useGame } from "../store";
import { missionsForRank, missionById } from "../missions";
import { mapById } from "../maps";
import { rankById, isOfficer } from "../ranks";
import { MEDALS } from "../medals";
import { MilButton, Panel, Chevron } from "./chrome";
import { sfx } from "../audio";
import { useEffect } from "react";

export function MissionSelect() {
  const career = useGame((s) => s.career)!;
  const setScreen = useGame((s) => s.setScreen);
  const setMission = useGame((s) => s.setMission);
  const list = missionsForRank(career.rankId);
  return (
    <div className="min-h-dvh overflow-auto bg-ink p-5">
      <div className="mx-auto max-w-lg pb-10">
        <h2 className="font-display text-3xl tracking-[0.12em] text-khaki">任務室</h2>
        <p className="mt-1 text-sm text-muted">階級越高，能接的勤務越多。</p>
        <div className="mt-4 space-y-3">
          {list.map((m) => {
            const map = mapById(m.mapId);
            const n = career.missionCounts[m.id] ?? 0;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setMission(m.id);
                  setScreen("briefing");
                }}
                className="w-full rounded-md border border-stroke bg-olive/90 p-4 text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-display text-xl tracking-wider text-khaki">{m.nameZh}</div>
                    <div className="font-mono text-[10px] tracking-widest text-muted">
                      {m.nameEn} · {map.nameZh} · {m.type.toUpperCase()}
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-muted">×{n}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-muted">{m.briefing}</p>
              </button>
            );
          })}
        </div>
        <MilButton className="mt-5" variant="ghost" onClick={() => setScreen("base")}>
          返回基地
        </MilButton>
      </div>
    </div>
  );
}

export function Briefing() {
  const id = useGame((s) => s.missionId);
  const career = useGame((s) => s.career)!;
  const setScreen = useGame((s) => s.setScreen);
  const m = missionById(id ?? "");
  if (!m) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-ink">
        <MilButton onClick={() => setScreen("missions")}>返回</MilButton>
      </div>
    );
  }
  const rank = rankById(career.rankId);
  return (
    <div className="min-h-dvh overflow-auto bg-ink p-5">
      <div className="mx-auto max-w-lg pb-10">
        <p className="font-mono text-[11px] tracking-[0.24em] text-hud">OPERATION BRIEF</p>
        <h2 className="font-display text-4xl tracking-[0.1em] text-khaki">{m.nameZh}</h2>
        <p className="font-mono text-xs text-muted">{m.nameEn}</p>
        <Panel className="mt-4 p-4 text-sm leading-relaxed text-fg">{m.briefing}</Panel>
        <ul className="mt-4 space-y-1 text-xs text-muted">
          {m.intel.map((t) => (
            <li key={t}>— {t}</li>
          ))}
        </ul>
        {rank.command === 0 && m.type !== "range" && (
          <p className="mt-4 text-xs text-khaki">你沒有指揮權。跟上 SGT Hale，不要離隊。</p>
        )}
        <div className="mt-6 flex gap-3">
          <MilButton variant="ghost" onClick={() => setScreen(m.type === "range" ? "base" : "missions")}>
            返回
          </MilButton>
          <MilButton className="flex-1" onClick={() => setScreen("combat")}>
            部署
          </MilButton>
        </div>
      </div>
    </div>
  );
}

export function Debrief() {
  const report = useGame((s) => s.lastReport);
  const medals = useGame((s) => s.newMedals);
  const pending = useGame((s) => s.pendingRank);
  const ack = useGame((s) => s.ackPromotion);
  const setScreen = useGame((s) => s.setScreen);
  const m = missionById(report?.missionId ?? "");
  if (!report) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-ink">
        <MilButton onClick={() => setScreen("base")}>返回基地</MilButton>
      </div>
    );
  }
  return (
    <div className="min-h-dvh overflow-auto bg-ink p-5">
      <div className="mx-auto max-w-lg pb-10">
        <p className="font-mono text-[11px] tracking-[0.24em] text-hud">MISSION REPORT</p>
        <h2 className="font-display text-4xl tracking-[0.12em] text-khaki">{report.success ? "任務完成" : "任務失敗"}</h2>
        <p className="text-sm text-muted">{m?.nameZh}</p>
        <div className="mt-4 flex items-end gap-4">
          <div className="font-display text-7xl leading-none text-khaki">{report.grade}</div>
          <div className="font-mono text-xs text-muted">
            XP +{report.xp}
            <br />
            MERIT {report.merit >= 0 ? "+" : ""}
            {report.merit}
            <br />
            DISC {report.disciplineDelta >= 0 ? "+" : ""}
            {report.disciplineDelta}
          </div>
        </div>
        <Panel className="mt-4 grid grid-cols-2 gap-2 p-4 font-mono text-xs text-muted">
          <span>擊殺 {report.kills}</span>
          <span>受傷 {report.playerDamage}</span>
          <span>友軍傷亡 {report.allyDeaths}</span>
          <span>平民傷亡 {report.civilianDeaths}</span>
          <span>彈藥 {report.ammoUsed}</span>
          <span>時間 {report.timeSec}s</span>
          <span>救援 {report.rescued}</span>
          <span>次要目標 {report.secondaries}</span>
        </Panel>
        {medals.length > 0 && (
          <p className="mt-3 text-sm text-hud">
            新勳章：{medals.map((id) => MEDALS.find((x) => x.id === id)?.nameZh ?? id).join("、")}
          </p>
        )}
        {report.leftSquad && <p className="mt-2 text-xs text-alert">紀錄：擅自離隊，紀律已扣。</p>}
        <MilButton className="mt-6 w-full" onClick={() => (pending ? ack() : setScreen("base"))}>
          {pending ? "晉升審查" : "返回基地"}
        </MilButton>
      </div>
    </div>
  );
}

export function Promotion() {
  const career = useGame((s) => s.career)!;
  const setScreen = useGame((s) => s.setScreen);
  const rank = rankById(career.rankId);
  useEffect(() => {
    sfx("promote");
  }, []);
  return (
    <div className="flex min-h-dvh items-center justify-center bg-ink p-5">
      <Panel className="w-full max-w-md p-8 text-center">
        <p className="font-mono text-[11px] tracking-[0.28em] text-hud">PROMOTION</p>
        <h2 className="mt-2 font-display text-5xl tracking-[0.12em] text-khaki">{rank.nameEn.toUpperCase()}</h2>
        <p className="mt-1 text-muted">{rank.nameZh}</p>
        <div className="mt-4 text-khaki">
          <Chevron n={rank.chevrons} officer={isOfficer(rank.id)} />
        </div>
        <div className="mt-6 text-left">
          <p className="font-mono text-[10px] tracking-widest text-hud">NEW PRIVILEGES UNLOCKED</p>
          <ul className="mt-2 space-y-1 text-sm text-fg">
            {rank.privileges.map((p) => (
              <li key={p}>— {p}</li>
            ))}
          </ul>
        </div>
        <MilButton className="mt-8 w-full" onClick={() => setScreen("base")}>
          返回基地
        </MilButton>
      </Panel>
    </div>
  );
}
