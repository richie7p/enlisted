import { useGame } from "../store";
import { rankById, nextRank } from "../ranks";
import { missionById } from "../missions";
import { MilButton, Panel } from "./chrome";
import { Lock, Crosshair, Backpack, BedDouble, Radio, Landmark, Target } from "lucide-react";

export function BaseHub() {
  const career = useGame((s) => s.career)!;
  const setScreen = useGame((s) => s.setScreen);
  const setMission = useGame((s) => s.setMission);
  const rank = rankById(career.rankId);
  const nxt = nextRank(career.rankId);

  const rooms = [
    { id: "barracks", label: "營舍", sub: "BARRACKS", icon: BedDouble, locked: false, go: () => setScreen("barracks") },
    { id: "armory", label: "軍械庫", sub: "ARMORY", icon: Backpack, locked: false, go: () => setScreen("armory") },
    {
      id: "range",
      label: "靶場",
      sub: "RANGE",
      icon: Target,
      locked: !rank.range,
      go: () => {
        setMission("range-1");
        setScreen("briefing");
      },
    },
    { id: "missions", label: "任務室", sub: "MISSIONS", icon: Radio, locked: false, go: () => setScreen("missions") },
    {
      id: "command",
      label: "指揮中心",
      sub: "COMMAND",
      icon: Landmark,
      locked: !rank.commandCenter,
      go: () => setScreen("missions"),
    },
  ];

  return (
    <div className="relative min-h-dvh overflow-auto bg-ink">
      <img src="/game/ui/base-hub.jpg" alt="" className="absolute inset-0 h-[42vh] w-full object-cover opacity-50" />
      <div className="absolute inset-x-0 top-0 h-[42vh] bg-gradient-to-b from-ink/20 to-ink" />
      <div className="relative z-10 mx-auto max-w-3xl px-4 pt-8 pb-10">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] tracking-[0.24em] text-hud">FIREBASE KILO</p>
            <h1 className="font-display text-4xl tracking-[0.12em] text-khaki">基地</h1>
          </div>
          <button type="button" className="text-xs text-muted" onClick={() => setScreen("menu")}>
            主選單
          </button>
        </div>

        <Panel className="mt-5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-display text-2xl tracking-[0.14em] text-khaki">
                {rank.code} · {rank.nameZh}
              </div>
              <div className="text-sm text-muted">{career.name}</div>
            </div>
            <div className="grid grid-cols-3 gap-4 font-mono text-xs text-muted">
              <Stat k="XP" v={career.xp} />
              <Stat k="MERIT" v={career.merit} />
              <Stat k="DISC" v={career.discipline} />
            </div>
          </div>
          {nxt && (
            <div className="mt-3 text-[11px] text-muted">
              晉升 {nxt.nameZh} 還需 XP {Math.max(0, nxt.needXp - career.xp)} · 功績{" "}
              {Math.max(0, nxt.needMerit - career.merit)} · 任務 {Math.max(0, nxt.needMissions - career.missionsCompleted)}
            </div>
          )}
        </Panel>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
          {rooms.map((r) => (
            <button
              key={r.id}
              type="button"
              disabled={r.locked}
              onClick={r.go}
              className="min-h-[108px] rounded-md border border-stroke bg-olive/85 p-4 text-left disabled:opacity-40"
            >
              <div className="flex items-center justify-between">
                <r.icon className="size-5 text-khaki" />
                {r.locked && <Lock className="size-4 text-muted" />}
              </div>
              <div className="mt-3 font-display text-xl tracking-wider text-khaki">{r.label}</div>
              <div className="font-mono text-[10px] tracking-widest text-muted">{r.sub}</div>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setScreen("record")}
            className="min-h-[108px] rounded-md border border-stroke bg-olive/85 p-4 text-left"
          >
            <Crosshair className="size-5 text-khaki" />
            <div className="mt-3 font-display text-xl tracking-wider text-khaki">服役紀錄</div>
            <div className="font-mono text-[10px] tracking-widest text-muted">SERVICE RECORD</div>
          </button>
        </div>

        <div className="mt-6 flex gap-3">
          <MilButton className="flex-1" onClick={() => setScreen("missions")}>
            接受任務
          </MilButton>
          <MilButton variant="ghost" onClick={() => setScreen("settings")}>
            設定
          </MilButton>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-muted">
          {rank.command === 0
            ? "你現在只能服從命令。完成巡邏，累積功績。"
            : rank.id === "major"
              ? "少校。營級火力、標槍與六人小隊都聽你的。"
              : rank.id === "captain"
                ? "上尉。連級火力冷卻較短，守住你的人。"
                : rank.id === "firstLieutenant"
                  ? "中尉。你可以帶五個人，榴彈與火力支援已就緒。"
                  : rank.fireSupport
                    ? "所有人都在等你的命令。"
                    : "你可以帶隊了。好好用這份權限。"}
        </p>
      </div>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: number }) {
  return (
    <div>
      <div className="tracking-widest">{k}</div>
      <div className="text-fg tabular-nums">{v}</div>
    </div>
  );
}

export function Barracks() {
  const career = useGame((s) => s.career)!;
  const setSpecialty = useGame((s) => s.setSpecialty);
  const setScreen = useGame((s) => s.setScreen);
  const rank = rankById(career.rankId);
  const last = career.missionCounts
    ? Object.entries(career.missionCounts).sort((a, b) => b[1] - a[1])[0]
    : null;
  return (
    <div className="min-h-dvh bg-ink p-5">
      <div className="mx-auto max-w-lg">
        <h2 className="font-display text-3xl tracking-[0.12em] text-khaki">營舍</h2>
        <Panel className="mt-4 p-4">
          <p className="text-sm text-muted">專長在上等兵後解鎖。勳章掛在床位上方，沒有戰鬥加成。</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {(
              [
                ["rifleman", "步槍兵"],
                ["medic", "醫療兵"],
                ["auto", "機槍手"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                disabled={rank.index < 2}
                onClick={() => setSpecialty(id)}
                className={`min-h-11 rounded-sm border font-display text-sm tracking-wider ${
                  career.specialty === id ? "border-khaki bg-raised text-khaki" : "border-stroke text-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mt-4 text-xs text-muted">
            最近勤務：{last ? `${missionById(last[0])?.nameZh ?? last[0]} ×${last[1]}` : "尚無"}
          </div>
        </Panel>
        <MilButton className="mt-5" variant="ghost" onClick={() => setScreen("base")}>
          返回基地
        </MilButton>
      </div>
    </div>
  );
}
