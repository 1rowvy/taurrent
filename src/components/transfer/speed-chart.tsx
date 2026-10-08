import { useId, useState } from "react";
import { formatSpeed } from "@/lib/format";
import type { SpeedSample } from "@/lib/types";
import { cn } from "@/lib/utils";

const SLOTS = 60;
const TOP_PAD = 12; // % of height kept free above the peak

type Series = "down" | "up";

const SERIES: { id: Series; label: string; color: string; dot: string }[] = [
  { id: "down", label: "Download", color: "var(--primary)", dot: "bg-primary" },
  { id: "up", label: "Upload", color: "var(--upload)", dot: "bg-upload" },
];

/** Catmull-Rom spline through the points, as an SVG path in a 0..100 box. */
function smoothPath(points: [number, number][]): string {
  if (points.length === 0) return "";
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[Math.max(0, i - 1)];
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const [x3, y3] = points[Math.min(points.length - 1, i + 2)];
    const c1 = [x1 + (x2 - x0) / 6, y1 + (y2 - y0) / 6];
    const c2 = [x2 - (x3 - x1) / 6, y2 - (y3 - y1) / 6];
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${x2},${y2}`;
  }
  return d;
}

export function SpeedChart({ history }: { history: SpeedSample[] }) {
  const [visible, setVisible] = useState<Record<Series, boolean>>({ down: true, up: true });
  const gradientId = useId();

  const shown = SERIES.filter((s) => visible[s.id]);
  const max = Math.max(1, ...history.flatMap((h) => shown.map((s) => h[s.id])));
  const offset = SLOTS - history.length;

  const pointsOf = (series: Series): [number, number][] =>
    history.map((h, i) => [
      ((offset + i) / (SLOTS - 1)) * 100,
      100 - (h[series] / max) * (100 - TOP_PAD),
    ]);

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[0.6rem] font-bold tracking-[0.14em] text-muted-foreground/70 uppercase">
          Transfer speed
        </h3>
        <div className="flex gap-1 rounded-md bg-muted p-0.5">
          {SERIES.map((s) => (
            <button
              key={s.id}
              onClick={() => setVisible((v) => ({ ...v, [s.id]: !v[s.id] }))}
              className={cn(
                "flex items-center gap-1.5 rounded px-2 py-0.5 text-[0.6rem] font-bold tracking-wider uppercase transition-colors",
                visible[s.id] ? "bg-background text-foreground" : "text-muted-foreground",
              )}
            >
              <span className={cn("size-1.5 rounded-full", s.dot, !visible[s.id] && "opacity-40")} />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        {/* guide lines */}
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute inset-x-0 border-t border-dashed border-foreground/8"
            style={{ top: `${TOP_PAD + (i * (100 - TOP_PAD)) / 2}%` }}
          />
        ))}
        <span className="absolute top-0 left-0 text-[0.6rem] font-semibold text-muted-foreground/70 tabular-nums">
          {formatSpeed(max)}
        </span>

        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
          <defs>
            {SERIES.map((s) => (
              <linearGradient key={s.id} id={`${gradientId}-${s.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          {[...shown].reverse().map((s) => {
            const pts = pointsOf(s.id);
            if (pts.length < 2) return null;
            const line = smoothPath(pts);
            return (
              <g key={s.id}>
                <path d={`${line} L100,100 L${pts[0][0]},100 Z`} fill={`url(#${gradientId}-${s.id})`} />
                <path
                  d={line}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                  style={{ filter: `drop-shadow(0 0 4px ${s.color})` }}
                />
              </g>
            );
          })}
        </svg>

        {shown.map((s) => {
          const last = pointsOf(s.id).at(-1);
          if (!last) return null;
          return (
            <span
              key={s.id}
              className={cn("absolute size-2 -translate-1/2 rounded-full ring-2 ring-card", s.dot)}
              style={{ left: `${last[0]}%`, top: `${last[1]}%`, boxShadow: `0 0 10px ${s.color}` }}
            />
          );
        })}
      </div>
    </div>
  );
}
