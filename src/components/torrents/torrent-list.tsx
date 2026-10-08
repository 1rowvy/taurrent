import { Inbox } from "lucide-react";
import { TorrentRow } from "@/components/torrents/torrent-row";
import type { TorrentSummary } from "@/lib/types";

export function TorrentList({ torrents }: { torrents: TorrentSummary[] }) {
  if (torrents.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl bg-muted py-12 text-muted-foreground">
        <Inbox className="size-8" />
        <span className="text-sm font-semibold">No torrents yet</span>
        <span className="text-xs">Drop a .torrent file or paste a magnet link to start.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {torrents.map((t) => (
        <TorrentRow key={t.id} torrent={t} />
      ))}
    </div>
  );
}
