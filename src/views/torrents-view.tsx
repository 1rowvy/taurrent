import { useState } from "react";
import { TorrentList } from "@/components/torrents/torrent-list";
import type { TorrentState, TorrentSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

const FILTERS: { id: "all" | TorrentState; label: string }[] = [
  { id: "all", label: "All" },
  { id: "downloading", label: "Downloading" },
  { id: "seeding", label: "Seeding" },
  { id: "paused", label: "Paused" },
  { id: "error", label: "Errors" },
];

export function TorrentsView({ torrents }: { torrents: TorrentSummary[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const visible = filter === "all" ? torrents : torrents.filter((t) => t.state === filter);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Torrents</h2>
        <div className="flex gap-1 rounded-full bg-muted p-1">
          {FILTERS.map((f) => {
            const count = f.id === "all" ? torrents.length : torrents.filter((t) => t.state === f.id).length;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground",
                  filter === f.id && "bg-primary text-primary-foreground hover:text-primary-foreground",
                )}
              >
                {f.label} <span className="opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
      </div>
      <TorrentList torrents={visible} />
    </div>
  );
}
