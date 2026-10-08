import type { LucideIcon } from "lucide-react";
import {
  ArrowDown,
  ArrowUp,
  Clock,
  EllipsisVertical,
  FolderOpen,
  Info,
  Pause,
  Play,
  Square,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fileExtension, formatBytes, formatEta, formatSpeed } from "@/lib/format";
import type { TorrentState, TorrentSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

const VIDEO = ["mkv", "mp4", "avi", "mov", "webm"];
const AUDIO = ["mp3", "flac", "wav", "ogg", "m4a"];

function thumbTone(ext: string) {
  if (VIDEO.includes(ext)) return "bg-tile-sky";
  if (AUDIO.includes(ext)) return "bg-tile-mint";
  return "bg-tile-lilac";
}

const STATE_LABEL: Record<TorrentState, string> = {
  downloading: "Downloading",
  seeding: "Seeding",
  paused: "Paused",
  checking: "Checking",
  error: "Error",
};

const STATE_BADGE: Record<TorrentState, string> = {
  downloading: "bg-info/15 text-info",
  seeding: "bg-success/20 text-success",
  paused: "bg-foreground/10 text-muted-foreground",
  checking: "bg-primary/15 text-primary",
  error: "bg-destructive/20 text-destructive",
};

export function TorrentRow({ torrent: t }: { torrent: TorrentSummary }) {
  const ext = fileExtension(t.name) || "dir";
  const pct = Math.floor(t.progress * 100);
  const primary = primaryAction(t.state);

  return (
    <div className="flex items-stretch overflow-hidden rounded-2xl bg-muted">
      <div className="flex min-w-0 flex-1 items-center gap-4 p-3 pr-4">
        <div
          className={cn(
            "grid size-12 shrink-0 place-items-center rounded-xl text-[0.6rem] font-bold tracking-wider text-tile-foreground uppercase",
            thumbTone(ext),
          )}
        >
          {ext}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-bold">{t.name}</span>
            <RowMenu />
          </div>

          <div className="mt-1 flex items-center gap-4 text-[0.7rem] font-semibold text-muted-foreground tabular-nums">
            <Meta icon={ArrowUp}>{formatSpeed(t.uploadSpeed)}</Meta>
            <Meta icon={ArrowDown}>{formatSpeed(t.downloadSpeed)}</Meta>
            {t.state === "downloading" && <Meta icon={Clock}>{formatEta(t.eta)}</Meta>}
            <span className={cn("rounded-full px-2 py-0.5 text-[0.65rem] font-bold", STATE_BADGE[t.state])}>
              {STATE_LABEL[t.state]}
            </span>
            <span className="ml-auto">{formatBytes(t.totalBytes)}</span>
            <span className="w-9 text-right text-foreground">{pct}%</span>
          </div>

          <div className="mt-2 h-1 overflow-hidden rounded-full bg-foreground/10">
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-700",
                t.state === "seeding" ? "bg-success" : t.state === "paused" ? "bg-muted-foreground" : "bg-primary",
              )}
              style={{ width: `${t.progress * 100}%` }}
            />
          </div>
        </div>
      </div>

      <ActionCell icon={Info} label="Info" />
      <ActionCell icon={primary.icon} label={primary.label} />
    </div>
  );
}

function primaryAction(state: TorrentState): { icon: LucideIcon; label: string } {
  switch (state) {
    case "paused":
    case "error":
      return { icon: Play, label: "Resume" };
    case "seeding":
      return { icon: Square, label: "Stop" };
    default:
      return { icon: Pause, label: "Pause" };
  }
}

function Meta({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1">
      <Icon className="size-3" />
      {children}
    </span>
  );
}

function ActionCell({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-20 shrink-0 flex-col items-center justify-center gap-1.5 border-l border-background/60 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
    >
      <Icon className="size-4.5" />
      <span className="text-[0.55rem] font-bold tracking-wider uppercase">{label}</span>
    </button>
  );
}

function RowMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-foreground/10 hover:text-foreground">
        <EllipsisVertical className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>
          <FolderOpen /> Open folder
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">Remove</DropdownMenuItem>
        <DropdownMenuItem variant="destructive">Remove with files</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
