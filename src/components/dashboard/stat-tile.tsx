import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TONES = {
  mint: "bg-tile-mint",
  sky: "bg-tile-sky",
  lilac: "bg-tile-lilac",
} as const;

interface StatTileProps {
  tone: keyof typeof TONES;
  icon: LucideIcon;
  value: string;
  caption: string;
  /** 0..1 — draws a ring in the corner when set. */
  ratio?: number;
}

export function StatTile({ tone, icon: Icon, value, caption, ratio }: StatTileProps) {
  return (
    <div
      className={cn(
        "relative flex min-h-40 flex-col justify-between overflow-hidden rounded-3xl p-5 text-tile-foreground",
        TONES[tone],
      )}
    >
      {/* soft sheen like frosted glass */}
      <div className="pointer-events-none absolute -top-16 -right-10 size-48 rounded-full bg-white/35 blur-2xl" />

      <div className="relative flex items-start justify-between">
        <span className="grid size-10 place-items-center rounded-full bg-white/45">
          <Icon className="size-4.5" />
        </span>
        {ratio != null && <Ring ratio={ratio} />}
      </div>

      <div className="relative">
        <div className="text-3xl font-bold tracking-tight tabular-nums">{value}</div>
        <div className="mt-1 text-xs font-medium opacity-70">{caption}</div>
      </div>
    </div>
  );
}

function Ring({ ratio }: { ratio: number }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid size-13 place-items-center">
      <svg viewBox="0 0 48 48" className="absolute inset-0 -rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" strokeWidth="3" className="stroke-white/50" />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - ratio)}
          className="stroke-tile-foreground"
        />
      </svg>
      <span className="text-[0.65rem] font-bold tabular-nums">{Math.round(ratio * 100)}%</span>
    </div>
  );
}
