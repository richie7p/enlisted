import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { sfx } from "../audio";

export function MilButton({
  children,
  onClick,
  variant = "primary",
  disabled,
  className,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={() => {
        try {
          sfx("ui");
        } catch {
          /* ignore */
        }
        onClick?.();
      }}
      className={cn(
        "min-h-11 rounded-sm px-5 font-display text-base tracking-[0.14em] uppercase transition-colors duration-150 disabled:opacity-40",
        variant === "primary" && "bg-khaki text-ink hover:bg-fg",
        variant === "ghost" && "border border-stroke bg-transparent text-khaki hover:bg-raised",
        variant === "danger" && "border border-alert/50 bg-alert/15 text-fg hover:bg-alert/25",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-stroke bg-olive/92 shadow-[0_12px_40px_rgba(0,0,0,0.35)]", className)}>
      {children}
    </div>
  );
}

export function Chevron({ n, officer = false }: { n: number; officer?: boolean }) {
  const glyph = officer ? "★" : "▲";
  const max = officer ? 4 : 5;
  return (
    <span className="font-display tracking-[0.2em] text-khaki" aria-hidden>
      {glyph.repeat(Math.max(1, Math.min(max, n)))}
    </span>
  );
}

export function PauseMenu({ onResume, onAbort }: { onResume: () => void; onAbort: () => void }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-ink/70 p-4">
      <Panel className="w-full max-w-sm p-6">
        <h2 className="font-display text-3xl tracking-[0.18em] text-khaki">暫停</h2>
        <p className="mt-2 text-sm text-muted">任務進行中。中止會以失敗結算。</p>
        <div className="mt-6 flex flex-col gap-3">
          <MilButton onClick={onResume}>繼續</MilButton>
          <MilButton variant="danger" onClick={onAbort}>
            中止任務
          </MilButton>
        </div>
      </Panel>
    </div>
  );
}
