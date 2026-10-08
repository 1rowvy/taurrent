import type { LucideIcon } from "lucide-react";
import { AlertTriangle, ArrowDown, ArrowUp, Check, Inbox, Pause, RefreshCw } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { formatBytes, formatEta } from "@/lib/format";
import type { TorrentSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

const GRID =
  "grid grid-cols-[minmax(0,2.2fr)_minmax(0,1.6fr)_5.5rem_6.5rem_3.5rem_3.5rem] items-center gap-4";

interface TorrentTableProps {
  torrents: TorrentSummary[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export function TorrentTable({ torrents, selectedId, onSelect }: TorrentTableProps) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className={cn(
          GRID,
          "px-4 pb-2 text-[0.6rem] font-bold tracking-[0.14em] text-muted-foreground/70 uppercase",
        )}
      >
        <span className="pl-6">{t("table.name")}</span>
        <span>{t("table.progress")}</span>
        <span className="text-right">{t("table.size")}</span>
        <span>{t("table.timeLeft")}</span>
        <span className="text-right">{t("table.seeds")}</span>
        <span className="text-right">{t("table.peers")}</span>
      </div>

      {torrents.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
          <Inbox className="size-8" />
          <span className="text-sm font-semibold">{t("table.emptyTitle")}</span>
          <span className="text-xs">{t("table.emptyHint")}</span>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
          {torrents.map((torrent) => (
            <Row
              key={torrent.id}
              torrent={torrent}
              selected={torrent.id === selectedId}
              onSelect={() => onSelect(torrent.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function statusIcon(t: TorrentSummary): { icon: LucideIcon; className: string } {
  switch (t.state) {
    case "downloading":
      return { icon: ArrowDown, className: "text-primary" };
    case "seeding":
      return { icon: ArrowUp, className: "text-upload" };
    case "checking":
      return { icon: RefreshCw, className: "text-muted-foreground" };
    case "error":
      return { icon: AlertTriangle, className: "text-destructive" };
    case "paused":
      return t.progress >= 1
        ? { icon: Check, className: "text-success" }
        : { icon: Pause, className: "text-muted-foreground" };
  }
}

function timeLeft(t: TorrentSummary, tr: TFunction): string {
  if (t.state === "error") return tr("state.error");
  if (t.state === "checking") return tr("state.checking");
  if (t.progress >= 1) return tr(t.state === "seeding" ? "state.seeding" : "state.completed");
  if (t.state === "paused") return tr("state.paused");
  return formatEta(t.eta);
}

function Row({
  torrent: t,
  selected,
  onSelect,
}: {
  torrent: TorrentSummary;
  selected: boolean;
  onSelect: () => void;
}) {
  const { t: tr } = useTranslation();
  const { icon: Icon, className: iconClass } = statusIcon(t);
  const inactive = t.state === "paused";
  const done = t.progress >= 1;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          onClick={onSelect}
          onContextMenu={onSelect}
          className={cn(
            GRID,
            "h-11 shrink-0 rounded-lg px-4 text-left text-[0.8rem] font-semibold tabular-nums transition-colors hover:bg-muted/50",
            selected && "bg-muted hover:bg-muted",
            inactive && !selected && "text-muted-foreground",
          )}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <Icon className={cn("size-3.5 shrink-0", iconClass)} />
            <span className="truncate">{t.name}</span>
          </span>

          <span className="h-1 overflow-hidden rounded-full bg-foreground/10">
            <span
              className={cn(
                "block h-full rounded-full transition-[width] duration-700",
                done
                  ? "bg-success shadow-[0_0_8px] shadow-success/60"
                  : inactive
                    ? "bg-muted-foreground/60"
                    : "bg-primary shadow-[0_0_8px] shadow-primary/60",
              )}
              style={{ width: `${t.progress * 100}%` }}
            />
          </span>

          <span className="text-right">{formatBytes(t.totalBytes)}</span>
          <span className={cn(done && "text-success", inactive && !done && "text-muted-foreground")}>
            {timeLeft(t, tr)}
          </span>
          <span className="text-right">{t.seeds}</span>
          <span className="text-right">{t.peers}</span>
        </button>
      </ContextMenuTrigger>

      {/* Actions are wired up in M1 together with the engine commands. */}
      <ContextMenuContent className="w-48">
        <ContextMenuItem disabled>
          {tr(t.state === "paused" ? "actions.resume" : "actions.pause")}
        </ContextMenuItem>
        <ContextMenuItem disabled>{tr("actions.openFolder")}</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem disabled variant="destructive">
          {tr("actions.remove")}
        </ContextMenuItem>
        <ContextMenuItem disabled variant="destructive">
          {tr("actions.removeWithFiles")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
