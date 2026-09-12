import { useEffect, useState } from "react";
import { loadArt } from "../assets";
import { startMusic, unlockAudio } from "../audio";
import { useGame } from "../store";
import { rankById } from "../ranks";
import { MilButton, Panel } from "./chrome";

export function MainMenu() {
  const career = useGame((s) => s.career);
  const setScreen = useGame((s) => s.setScreen);
  const continueCareer = useGame((s) => s.continueCareer);
  const [bg, setBg] = useState<string>("/game/ui/menu-bg.jpg");

  useEffect(() => {
    void loadArt();
    setBg("/game/ui/menu-bg.jpg");
  }, []);

  return (
    <div className="relative flex min-h-dvh flex-col justify-end overflow-hidden bg-ink md:justify-center">
      <img src={bg} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/30" />
      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-col gap-8 px-5 py-10">
        <header>
          <p className="font-mono text-[11px] tracking-[0.28em] text-hud">FIREBASE KILO · CAREER SERVICE</p>
          <h1 className="mt-2 font-display text-6xl leading-none tracking-[0.12em] text-khaki md:text-7xl">
            ENLISTED
          </h1>
          <p className="mt-2 text-sm text-muted">從小兵開始 · 軍階改變權限</p>
        </header>
        <Panel className="flex flex-col gap-3 p-5">
          <MilButton
            onClick={() => {
              unlockAudio();
              startMusic();
              setScreen("newCareer");
            }}
          >
            開始服役
          </MilButton>
          <MilButton
            variant="ghost"
            disabled={!career}
            onClick={() => {
              unlockAudio();
              startMusic();
              continueCareer();
            }}
          >
            繼續任務
          </MilButton>
          <MilButton variant="ghost" disabled={!career} onClick={() => setScreen("record")}>
            服役紀錄
          </MilButton>
          <div className="grid grid-cols-2 gap-3">
            <MilButton variant="ghost" onClick={() => setScreen("settings")}>
              設定
            </MilButton>
            <MilButton variant="ghost" onClick={() => setScreen("credits")}>
              製作人員
            </MilButton>
          </div>
          {career && (
            <p className="pt-1 font-mono text-[11px] text-muted">
              {career.name} · {rankById(career.rankId).nameZh} · XP {career.xp}
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}

export function NewCareer() {
  const startCareer = useGame((s) => s.startCareer);
  const setScreen = useGame((s) => s.setScreen);
  const [name, setName] = useState("陳志遠");
  const [diff, setDiff] = useState<"recruit" | "regular" | "veteran" | "hardcore">("regular");
  return (
    <div className="flex min-h-dvh items-center justify-center bg-ink p-5">
      <Panel className="w-full max-w-md p-6">
        <h2 className="font-display text-3xl tracking-[0.14em] text-khaki">NEW CAREER</h2>
        <p className="mt-1 text-sm text-muted">你將以二兵身分入伍。沒有特權。</p>
        <label className="mt-5 block text-xs tracking-widest text-muted">姓名</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 h-11 w-full rounded-sm border border-stroke bg-drab px-3 text-fg outline-none focus:border-khaki"
        />
        <label className="mt-4 block text-xs tracking-widest text-muted">難度</label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(
            [
              ["recruit", "新兵"],
              ["regular", "常規"],
              ["veteran", "老兵"],
              ["hardcore", "嚴苛"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setDiff(id)}
              className={`min-h-11 rounded-sm border px-3 font-display tracking-wider ${
                diff === id ? "border-khaki bg-raised text-khaki" : "border-stroke text-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-6 flex gap-3">
          <MilButton variant="ghost" onClick={() => setScreen("menu")}>
            返回
          </MilButton>
          <MilButton className="flex-1" onClick={() => startCareer(name, diff)}>
            入伍
          </MilButton>
        </div>
      </Panel>
    </div>
  );
}

export function Settings() {
  const career = useGame((s) => s.career);
  const patch = useGame((s) => s.patchCareer);
  const reset = useGame((s) => s.resetCareer);
  const setScreen = useGame((s) => s.setScreen);
  if (!career) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-ink p-5">
        <Panel className="p-6">
          <p className="text-muted">尚無存檔。</p>
          <MilButton className="mt-4" onClick={() => setScreen("menu")}>
            返回
          </MilButton>
        </Panel>
      </div>
    );
  }
  return (
    <div className="flex min-h-dvh items-center justify-center bg-ink p-5">
      <Panel className="w-full max-w-md p-6">
        <h2 className="font-display text-3xl tracking-[0.14em] text-khaki">SETTINGS</h2>
        <label className="mt-5 block text-xs text-muted">音效 {Math.round(career.settings.sfx * 100)}</label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={career.settings.sfx}
          onChange={(e) => patch({ settings: { ...career.settings, sfx: Number(e.target.value) } })}
          className="w-full"
        />
        <label className="mt-3 block text-xs text-muted">音樂 {Math.round(career.settings.music * 100)}</label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={career.settings.music}
          onChange={(e) => patch({ settings: { ...career.settings, music: Number(e.target.value) } })}
          className="w-full"
        />
        <label className="mt-4 flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={career.settings.shake}
            onChange={(e) => patch({ settings: { ...career.settings, shake: e.target.checked } })}
          />
          畫面震動
        </label>
        <div className="mt-6 flex flex-col gap-3">
          <MilButton variant="ghost" onClick={() => setScreen(career ? "base" : "menu")}>
            返回
          </MilButton>
          <MilButton variant="danger" onClick={reset}>
            重置存檔
          </MilButton>
        </div>
      </Panel>
    </div>
  );
}

export function Credits() {
  const setScreen = useGame((s) => s.setScreen);
  return (
    <div className="flex min-h-dvh items-center justify-center bg-ink p-5">
      <Panel className="w-full max-w-md p-6">
        <h2 className="font-display text-3xl tracking-[0.14em] text-khaki">CREDITS</h2>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          ENLISTED／從小兵開始。軍旅生涯戰術射擊原型。階級改變武器、指揮權與基地權限。
        </p>
        <MilButton className="mt-6" onClick={() => setScreen("menu")}>
          返回
        </MilButton>
      </Panel>
    </div>
  );
}
