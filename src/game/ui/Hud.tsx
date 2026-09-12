import { rankById } from "../ranks";
import { weaponById } from "../weapons";
import type { Sim } from "../combat/sim";

export function CombatHud({ sim }: { sim: Sim; tick?: number }) {
  const p = sim.units.find((u) => u.id === sim.playerId);
  if (!p) return null;
  const rank = rankById(sim.career.rankId);
  const w = weaponById(p.weapon);
  const allies = sim.units.filter((u) => (u.kind === "ally" || u.kind === "nco") && u.state !== "dead");
  return (
    <div className="pointer-events-none absolute inset-0 font-mono text-fg">
      <div className="absolute top-3 left-3 min-w-[200px] rounded-md border border-stroke/80 bg-ink/70 p-3">
        <div className="font-display text-lg tracking-[0.16em] text-khaki uppercase">
          {rank.code} {sim.career.name}
        </div>
        <div className="text-[11px] text-muted">{rank.nameZh}</div>
        <Bar label="HP" value={p.hp} max={p.maxHp} color="bg-alert" />
        <Bar label="ARM" value={p.armor} max={p.maxArmor} color="bg-hud" />
      </div>

      <div className="absolute top-3 right-3 max-w-[240px] rounded-md border border-stroke/80 bg-ink/70 p-3">
        <div className="font-display text-sm tracking-[0.14em] text-khaki">目標</div>
        <ul className="mt-1 space-y-1 text-[11px]">
          {sim.objs.map((o) => (
            <li key={o.id} className={o.done ? "text-hud-dim line-through" : "text-fg"}>
              {o.required ? "■" : "□"} {o.label}
              {o.holdNeed && !o.done ? ` ${Math.min(100, Math.round((o.hold / o.holdNeed) * 100))}%` : ""}
            </li>
          ))}
        </ul>
      </div>

      <div className="absolute right-3 bottom-16 rounded-md border border-stroke/80 bg-ink/70 px-3 py-2 text-right">
        <div className="font-display text-xl tracking-widest text-khaki">{w.name}</div>
        <div className="text-2xl tabular-nums">
          {p.reloadT > 0 ? "RELOAD" : p.mag}
          <span className="text-sm text-muted"> / {p.reserve}</span>
        </div>
        {sim.gCount > 0 && <div className="text-[11px] text-muted">手榴彈 {sim.gCount}</div>}
      </div>

      <div className="absolute bottom-3 left-1/2 flex max-w-[92%] -translate-x-1/2 flex-wrap justify-center gap-1.5">
        {allies.map((a) => (
          <div key={a.id} className="w-[72px] rounded-md border border-stroke/70 bg-ink/70 px-2 py-1 text-center">
            <div className="truncate font-display text-[11px] tracking-wide text-khaki">{a.name}</div>
            <div className="h-1.5 overflow-hidden rounded-full bg-raised">
              <div
                className={a.state === "down" ? "h-full bg-alert" : "h-full bg-hud"}
                style={{ width: `${Math.max(4, (a.hp / a.maxHp) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="absolute top-28 left-3 max-w-[280px] space-y-1">
        {sim.radio.map((r, i) => (
          <div key={`${r.text}-${i}`} className="rounded-sm bg-ink/60 px-2 py-1 text-[11px] text-hud">
            {r.text}
          </div>
        ))}
      </div>
    </div>
  );
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="mt-1 flex items-center gap-2 text-[10px] tracking-widest">
      <span className="w-7 text-muted">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-raised">
        <div className={`h-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }} />
      </div>
    </div>
  );
}
