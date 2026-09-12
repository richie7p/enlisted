import { useEffect, useRef, useState } from "react";
import { loadArt, type GameArt } from "../assets";
import { Input } from "../input";
import { sfx, unlockAudio } from "../audio";
import { rankById } from "../ranks";
import { weaponById } from "../weapons";
import { mapById } from "../maps";
import { missionById } from "../missions";
import { useGame } from "../store";
import { buildReport, createSim, stepSim, type Sim } from "./sim";
import { renderWorld, screenToWorld, type Cam } from "./render";
import { CombatHud } from "../ui/Hud";
import { PauseMenu } from "../ui/chrome";

function playerOf(sim: Sim) {
  return sim.units.find((u) => u.id === sim.playerId)!;
}

export function CombatView() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [art, setArt] = useState<GameArt | null>(null);
  const [paused, setPaused] = useState(false);
  const [readyTick, setReadyTick] = useState(0);
  const [hud, setHud] = useState(0);
  const missionId = useGame((s) => s.missionId);
  const career = useGame((s) => s.career)!;
  const applyReport = useGame((s) => s.applyReport);
  const setScreen = useGame((s) => s.setScreen);

  const simRef = useRef<Sim | null>(null);
  const inputRef = useRef(new Input());
  const camRef = useRef<Cam>({ x: 0, y: 0, z: 1, vw: 800, vh: 600 });

  useEffect(() => {
    let live = true;
    void loadArt().then((a) => {
      if (live) setArt(a);
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    const mission = missionById(missionId ?? "patrol-1");
    if (!mission || !career) return;
    const sim = createSim(mission, mapById(mission.mapId), career);
    simRef.current = sim;
    const p = playerOf(sim);
    camRef.current.x = p.x - 400;
    camRef.current.y = p.y - 300;
    setReadyTick((n) => n + 1);

    const probe = {
      getYaw: () => playerOf(sim).angle,
      getSpeed: () => Math.hypot(playerOf(sim).vx, playerOf(sim).vy),
      setKeys: (codes: string[]) => inputRef.current.setKeys(codes),
      getPos: () => ({ x: playerOf(sim).x, y: playerOf(sim).y }),
      setPos: (x: number, y: number) => {
        const p = playerOf(sim);
        p.x = x;
        p.y = y;
      },
      getEnded: () => sim.ended,
      getObjs: () => sim.objs.map((o) => ({ id: o.id, done: o.done })),
    };
    window.__controlsTest = probe;
    return () => {
      if (window.__controlsTest === probe) delete window.__controlsTest;
    };
  }, [missionId, career]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || !art || !simRef.current) return;
    const input = inputRef.current;
    const detach = input.attach(wrap);
    unlockAudio();

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const STEP = 1 / 60;
    let lastShot = 0;
    let ended = false;
    let hudAcc = 0;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const raw = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (paused) {
        draw();
        return;
      }
      acc += raw;
      const sim = simRef.current;
      if (!sim || ended) return;
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const vw = rect.width;
      const vh = rect.height;
      if (canvas.width !== Math.floor(vw * dpr) || canvas.height !== Math.floor(vh * dpr)) {
        canvas.width = Math.floor(vw * dpr);
        canvas.height = Math.floor(vh * dpr);
        canvas.style.width = `${vw}px`;
        canvas.style.height = `${vh}px`;
      }
      const z = vw < 700 ? 0.82 : 1;
      const cam = camRef.current;
      cam.vw = vw;
      cam.vh = vh;
      cam.z = z;
      const world = screenToWorld(cam, input.pointer.x, input.pointer.y);
      input.setWorldAim(world.x, world.y);
      if (input.pointer.right) {
        input.queueMoveOrder(world.x, world.y);
        input.pointer.right = false;
      }

      const actions = input.sample();
      if (actions.pause) setPaused(true);

      let first = true;
      while (acc >= STEP) {
        const a = first
          ? actions
          : {
              ...actions,
              reload: false,
              grenade: false,
              cmd: 0 as const,
              drone: false,
              support: false,
              firePressed: false,
              moveOrder: null,
              supportOrder: null,
              pause: false,
              swap: false,
            };
        first = false;
        const beforeMag = playerOf(sim).mag;
        stepSim(sim, STEP, a);
        if (playerOf(sim).mag < beforeMag && now - lastShot > 40) {
          const w = weaponById(playerOf(sim).weapon);
          sfx(
            w.id === "m24"
              ? "shoot-sniper"
              : w.id === "m249"
                ? "shoot-lmg"
                : w.id === "m9"
                  ? "shoot-pistol"
                  : "shoot",
          );
          lastShot = now;
        }
        acc -= STEP;
      }

      const p = playerOf(sim);
      const look = 110;
      const tx = p.x - vw / z / 2 + Math.cos(p.angle) * look;
      const ty = p.y - vh / z / 2 + Math.sin(p.angle) * look;
      const k = 1 - Math.exp(-5.5 * raw);
      cam.x += (tx - cam.x) * k;
      cam.y += (ty - cam.y) * k;
      cam.x = Math.max(0, Math.min(sim.map.w - vw / z, cam.x));
      cam.y = Math.max(0, Math.min(sim.map.h - vh / z, cam.y));

      draw();
      hudAcc += raw;
      if (hudAcc > 0.12) {
        hudAcc = 0;
        setHud((n) => n + 1);
      }

      if (sim.ended && !ended) {
        ended = true;
        cancelAnimationFrame(raf);
        applyReport(buildReport(sim));
      }
    };

    const draw = () => {
      const sim = simRef.current;
      if (!sim) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderWorld(ctx, sim, art, camRef.current, 0);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      detach();
    };
  }, [art, paused, applyReport, readyTick]);

  const sim = simRef.current;
  const rank = rankById(career.rankId);

  return (
    <div
      ref={wrapRef}
      className="relative h-dvh w-full overflow-hidden bg-ink select-none"
      style={{ touchAction: "none" }}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
      {sim && <CombatHud sim={sim} tick={hud} />}
      {paused && (
        <PauseMenu
          onResume={() => setPaused(false)}
          onAbort={() => {
            if (simRef.current) {
              simRef.current.ended = "fail";
              simRef.current.failReason = "任務中止。";
              applyReport(buildReport(simRef.current));
            } else setScreen("base");
          }}
        />
      )}
      <div className="pointer-events-none absolute right-3 bottom-3 hidden max-w-[240px] text-right text-[11px] leading-snug text-khaki/70 md:block">
        WASD 移動 · 滑鼠瞄準射擊 · R 換彈 · C 蹲下
        {rank.grenades > 0 ? " · G 手榴彈" : ""}
        {rank.command > 0 ? " · 1-5 指揮 · 右鍵標記" : ""}
        {rank.drone ? " · Q 無人機" : ""}
        {rank.fireSupport ? " · F 火力支援" : ""}
      </div>
      <TouchLayer
        canCommand={rank.command > 0}
        onCmd={(n) => {
          const codes = ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5"];
          inputRef.current.keys.add(codes[n]!);
          setTimeout(() => inputRef.current.keys.delete(codes[n]!), 80);
        }}
        onReload={() => {
          inputRef.current.keys.add("KeyR");
          setTimeout(() => inputRef.current.keys.delete("KeyR"), 80);
        }}
        onGrenade={() => {
          inputRef.current.keys.add("KeyG");
          setTimeout(() => inputRef.current.keys.delete("KeyG"), 80);
        }}
        grenades={rank.grenades > 0}
      />
    </div>
  );
}

function TouchLayer({
  canCommand,
  onCmd,
  onReload,
  onGrenade,
  grenades,
}: {
  canCommand: boolean;
  onCmd: (n: number) => void;
  onReload: () => void;
  onGrenade: () => void;
  grenades: boolean;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 md:hidden">
      <div className="pointer-events-none absolute bottom-16 left-8 size-28 rounded-full border border-khaki/25 bg-ink/25" />
      <div className="pointer-events-none absolute right-8 bottom-16 size-28 rounded-full border border-khaki/25 bg-ink/25" />
      <div className="pointer-events-auto absolute top-1/2 right-4 flex -translate-y-1/2 flex-col gap-2">
        <button
          type="button"
          className="min-h-11 rounded-md border border-stroke bg-olive/80 px-3 font-display text-sm tracking-wide text-khaki"
          onPointerDown={onReload}
        >
          換彈
        </button>
        {grenades && (
          <button
            type="button"
            className="min-h-11 rounded-md border border-stroke bg-olive/80 px-3 font-display text-sm tracking-wide text-khaki"
            onPointerDown={onGrenade}
          >
            手榴彈
          </button>
        )}
      </div>
      {canCommand && (
        <div className="pointer-events-auto absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
          {["跟隨", "防守", "攻擊", "固守", "集合"].map((l, i) => (
            <button
              key={l}
              type="button"
              className="min-h-11 rounded-md border border-stroke bg-olive/85 px-2 font-display text-xs tracking-wide text-khaki"
              onPointerDown={() => onCmd(i)}
            >
              {l}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      setKeys?: (codes: string[]) => void;
      getPos?: () => { x: number; y: number };
      setPos?: (x: number, y: number) => void;
      getEnded?: () => string | null;
      getObjs?: () => { id: string; done: boolean }[];
    };
  }
}
