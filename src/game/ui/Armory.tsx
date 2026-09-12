import { useGame } from "../store";
import { rankById } from "../ranks";
import { WEAPONS } from "../weapons";
import { MilButton, Panel } from "./chrome";
import { Lock } from "lucide-react";
import type { WeaponId } from "../types";

export function Armory() {
  const career = useGame((s) => s.career)!;
  const equip = useGame((s) => s.equip);
  const setScreen = useGame((s) => s.setScreen);
  const rank = rankById(career.rankId);

  const row = (id: WeaponId, slot: "primary" | "secondary") => {
    const w = WEAPONS.find((x) => x.id === id)!;
    const locked = !rank.weapons.includes(id);
    const equipped = career[slot] === id;
    return (
      <button
        key={id + slot}
        type="button"
        disabled={locked}
        onClick={() => equip(slot, id)}
        className={`flex w-full items-center justify-between rounded-md border px-3 py-3 text-left disabled:opacity-40 ${
          equipped ? "border-khaki bg-raised" : "border-stroke bg-drab/60"
        }`}
      >
        <div>
          <div className="font-display tracking-wider text-khaki">
            {w.name} <span className="text-xs text-muted">{w.className}</span>
          </div>
          <div className="mt-1 font-mono text-[10px] text-muted">
            DMG {w.damage * w.pellets} · RPM {w.rpm} · MAG {w.mag} · RNG {w.range}
          </div>
        </div>
        {locked ? <Lock className="size-4 text-muted" /> : equipped ? <span className="text-xs text-hud">已裝備</span> : null}
      </button>
    );
  };

  return (
    <div className="min-h-dvh overflow-auto bg-ink p-5">
      <div className="mx-auto max-w-lg pb-10">
        <h2 className="font-display text-3xl tracking-[0.12em] text-khaki">軍械庫</h2>
        <p className="mt-1 text-sm text-muted">武器依軍階解鎖。升官才拿得到更好的槍。</p>
        <Panel className="mt-4 space-y-2 p-3">
          <div className="px-1 font-mono text-[10px] tracking-widest text-muted">主武器</div>
          {WEAPONS.filter((w) => w.id !== "m9").map((w) => row(w.id, "primary"))}
        </Panel>
        <Panel className="mt-3 space-y-2 p-3">
          <div className="px-1 font-mono text-[10px] tracking-widest text-muted">副武器</div>
          {row("m9", "secondary")}
        </Panel>
        <MilButton className="mt-5" variant="ghost" onClick={() => setScreen("base")}>
          返回基地
        </MilButton>
      </div>
    </div>
  );
}
