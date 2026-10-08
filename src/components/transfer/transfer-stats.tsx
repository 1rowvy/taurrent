import { ArrowDown, ArrowUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatBytes, formatEta, formatRatio, formatSpeed } from "@/lib/format";
import type { SessionStats, TorrentSummary } from "@/lib/types";

interface TransferStatsProps {
  torrent: TorrentSummary | null;
  session: SessionStats;
}

/** Speeds and counters for the selected torrent (or session totals). */
export function TransferStats({ torrent: t, session }: TransferStatsProps) {
  const { t: tr } = useTranslation();
  const down = t ? t.downloadSpeed : session.downloadSpeed;
  const up = t ? t.uploadSpeed : session.uploadSpeed;
  const ratio = t && t.downloadedBytes > 0 ? t.uploadedBytes / t.downloadedBytes : null;

  return (
    <div className="flex w-72 shrink-0 flex-col border-l border-border pl-6">
      <h3 className="shrink-0 truncate text-[0.6rem] font-bold tracking-[0.14em] text-muted-foreground/70 uppercase">
        {t ? t.name : tr("transfer.perSecond")}
      </h3>

      <div className="mt-2 flex shrink-0 items-baseline gap-5 text-lg font-bold tabular-nums">
        <span className="flex items-center gap-1">
          <ArrowDown className="size-4 text-primary" />
          {formatSpeed(down)}
        </span>
        <span className="flex items-center gap-1">
          <ArrowUp className="size-4 text-upload" />
          {formatSpeed(up)}
        </span>
      </div>

      {t ? (
        <dl className="mt-4 grid shrink-0 grid-cols-2 gap-x-6 gap-y-3">
          <Stat label={tr("transfer.seeds")} value={t.seeds} />
          <Stat label={tr("transfer.ratio")} value={ratio == null ? "—" : formatRatio(ratio)} />
          <Stat label={tr("transfer.downloaded")} value={formatBytes(t.downloadedBytes)} />
          <Stat label={tr("transfer.uploaded")} value={formatBytes(t.uploadedBytes)} />
          <Stat label={tr("transfer.elapsed")} value={formatEta(t.elapsed)} />
          <Stat
            label={tr("transfer.left")}
            value={
              t.progress >= 1
                ? tr("transfer.done")
                : t.state === "downloading"
                  ? formatEta(t.eta)
                  : "—"
            }
          />
        </dl>
      ) : (
        <p className="mt-5 text-xs text-muted-foreground">{tr("transfer.selectHint")}</p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[0.6rem] font-semibold text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-[0.8rem] font-bold tabular-nums">{value}</dd>
    </div>
  );
}
