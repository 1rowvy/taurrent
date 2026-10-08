import type { LucideIcon } from "lucide-react";
import { AlertTriangle, ArrowDown, ArrowUp, Check, Inbox, Pause, RefreshCw } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
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
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className={cn(
          GRID,
          "px-4 pb-2 text-[0.6rem] font-bold tracking-[0.14em] text-muted-foreground/70 uppercase",
        )}
      >
        <span className="pl-6">Name</span>
        <span>Progress</span>
        <span className="text-right">Size</span>
        <span>Time left</span>
        <span className="text-right">Seeds</span>
        <span className="text-right">Peers</span>
      </div>

      {torrents.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
          <Inbox className="size-8" />
          <span className="text-sm font-semibold">Nothing here yet</span>
          <span className="text-xs">Add a .torrent file or a magnet link from Options.</span>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
          {torrents.map((t) => (
            <Row
              key={t.id}
              torrent={t}
              selected={t.id === selectedId}
              onSelect={() => onSelect(t.id)}
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

function timeLeft(t: TorrentSummary): string {
  if (t.state === "error") return "Error";
  if (t.state === "checking") return "Checking";
  if (t.progress >= 1) return t.state === "seeding" ? "Seeding" : "Completed";
  if (t.state === "paused") return "Paused";
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
            {timeLeft(t)}
          </span>
          <span className="text-right">{t.seeds}</span>
          <span className="text-right">{t.peers}</span>
        </button>
      </ContextMenuTrigger>

      {/* Actions are wired up in M1 together with the engine commands. */}
      <ContextMenuContent className="w-48">
        <ContextMenuItem disabled>{t.state === "paused" ? "Resume" : "Pause"}</ContextMenuItem>
        <ContextMenuItem disabled>Open folder</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem disabled variant="destructive">
          Remove
        </ContextMenuItem>
        <ContextMenuItem disabled variant="destructive">
          Remove with files
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
